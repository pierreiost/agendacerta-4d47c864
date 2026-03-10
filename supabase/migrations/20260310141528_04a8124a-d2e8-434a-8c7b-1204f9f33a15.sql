
-- 1) Update get_financial_metrics: make balance cumulative (all-time)
CREATE OR REPLACE FUNCTION public.get_financial_metrics(p_venue_id UUID, p_period TEXT DEFAULT 'month')
RETURNS TABLE(
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  balance NUMERIC,
  revenue_change NUMERIC,
  expense_change NUMERIC,
  pending_expenses NUMERIC,
  monthly_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  v_today DATE;
  v_current_revenue NUMERIC;
  v_current_expenses NUMERIC;
  v_prev_revenue NUMERIC;
  v_prev_expenses NUMERIC;
  v_pending NUMERIC;
  v_monthly JSONB;
  v_all_time_revenue NUMERIC;
  v_all_time_expenses NUMERIC;
BEGIN
  v_today := CURRENT_DATE;
  
  IF p_period = 'year' THEN
    v_start_date := date_trunc('year', v_today)::DATE;
    v_end_date := (date_trunc('year', v_today) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
    v_prev_start_date := (date_trunc('year', v_today) - INTERVAL '1 year')::DATE;
    v_prev_end_date := (date_trunc('year', v_today) - INTERVAL '1 day')::DATE;
  ELSE
    v_start_date := date_trunc('month', v_today)::DATE;
    v_end_date := (date_trunc('month', v_today) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_prev_start_date := (date_trunc('month', v_today) - INTERVAL '1 month')::DATE;
    v_prev_end_date := (date_trunc('month', v_today) - INTERVAL '1 day')::DATE;
  END IF;

  -- Period revenue
  SELECT COALESCE(SUM(gt), 0) INTO v_current_revenue FROM (
    SELECT grand_total AS gt FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
    UNION ALL
    SELECT total AS gt FROM service_orders
    WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
  ) r;

  -- Previous period revenue
  SELECT COALESCE(SUM(gt), 0) INTO v_prev_revenue FROM (
    SELECT grand_total AS gt FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_prev_start_date AND v_prev_end_date
    UNION ALL
    SELECT total AS gt FROM service_orders
    WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_prev_start_date AND v_prev_end_date
  ) r;

  -- Period expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_current_expenses
  FROM expenses WHERE venue_id = p_venue_id AND expense_date BETWEEN v_start_date AND v_end_date;

  -- Previous period expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_prev_expenses
  FROM expenses WHERE venue_id = p_venue_id AND expense_date BETWEEN v_prev_start_date AND v_prev_end_date;

  -- Pending expenses
  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM expenses WHERE venue_id = p_venue_id AND is_paid = false;

  -- ALL-TIME cumulative balance
  SELECT COALESCE(SUM(gt), 0) INTO v_all_time_revenue FROM (
    SELECT grand_total AS gt FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
    UNION ALL
    SELECT total AS gt FROM service_orders
    WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
  ) r;

  SELECT COALESCE(SUM(amount), 0) INTO v_all_time_expenses
  FROM expenses WHERE venue_id = p_venue_id;

  -- Monthly chart data (last 6 months)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('month', m.month_label, 'revenue', m.month_revenue, 'expenses', m.month_expenses)
    ORDER BY m.month_start
  ), '[]'::JSONB) INTO v_monthly
  FROM (
    SELECT 
      to_char(month_start, 'Mon') AS month_label,
      month_start,
      (SELECT COALESCE(SUM(grand_total), 0) FROM bookings
       WHERE venue_id = p_venue_id AND status = 'FINALIZED'
         AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      ) + (SELECT COALESCE(SUM(total), 0) FROM service_orders
       WHERE venue_id = p_venue_id
         AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
           OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
         AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      ) AS month_revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM expenses
       WHERE venue_id = p_venue_id AND expense_date BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      ) AS month_expenses
    FROM generate_series(
      date_trunc('month', v_today - INTERVAL '5 months')::DATE,
      date_trunc('month', v_today)::DATE,
      INTERVAL '1 month'
    ) AS month_start
  ) m;

  RETURN QUERY SELECT
    v_current_revenue,
    v_current_expenses,
    v_all_time_revenue - v_all_time_expenses,  -- cumulative balance!
    CASE WHEN v_prev_revenue > 0 THEN ((v_current_revenue - v_prev_revenue) / v_prev_revenue) * 100 ELSE 0 END,
    CASE WHEN v_prev_expenses > 0 THEN ((v_current_expenses - v_prev_expenses) / v_prev_expenses) * 100 ELSE 0 END,
    v_pending,
    v_monthly;
END;
$$;

-- 2) Create get_financial_charts RPC
CREATE OR REPLACE FUNCTION public.get_financial_charts(p_venue_id UUID, p_segment TEXT DEFAULT 'sports')
RETURNS TABLE(
  waterfall_data JSONB,
  cash_projection JSONB,
  revenue_by_professional JSONB,
  delinquency_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_start_date DATE;
  v_end_date DATE;
  v_gross_revenue NUMERIC;
  v_fixed_expenses NUMERIC;
  v_commissions NUMERIC;
  v_product_costs NUMERIC;
  v_net_profit NUMERIC;
  v_waterfall JSONB;
  v_projection JSONB;
  v_rev_prof JSONB;
  v_delinquency JSONB;
  v_current_balance NUMERIC;
BEGIN
  v_today := CURRENT_DATE;
  v_start_date := date_trunc('month', v_today)::DATE;
  v_end_date := (date_trunc('month', v_today) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- ===================== WATERFALL =====================
  -- Gross revenue based on segment
  IF p_segment IN ('beauty', 'health') THEN
    SELECT COALESCE(SUM(bs.price), 0) INTO v_gross_revenue
    FROM booking_services bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE b.venue_id = p_venue_id AND b.status = 'FINALIZED'
      AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date;
  ELSIF p_segment = 'custom' THEN
    SELECT COALESCE(SUM(total), 0) INTO v_gross_revenue
    FROM service_orders
    WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date;
  ELSE -- sports
    SELECT COALESCE(SUM(grand_total), 0) INTO v_gross_revenue
    FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date;
  END IF;

  -- Fixed expenses (rent, utilities, maintenance)
  SELECT COALESCE(SUM(amount), 0) INTO v_fixed_expenses
  FROM expenses
  WHERE venue_id = p_venue_id
    AND category IN ('rent', 'utilities', 'maintenance')
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- Commissions (salary)
  SELECT COALESCE(SUM(amount), 0) INTO v_commissions
  FROM expenses
  WHERE venue_id = p_venue_id
    AND category = 'salary'
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- Product costs
  IF p_segment = 'custom' THEN
    SELECT COALESCE(SUM(soi.subtotal), 0) INTO v_product_costs
    FROM service_order_items soi
    JOIN service_orders so ON so.id = soi.service_order_id
    WHERE so.venue_id = p_venue_id
      AND DATE(so.created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_product_costs
    FROM expenses
    WHERE venue_id = p_venue_id
      AND category = 'material'
      AND expense_date BETWEEN v_start_date AND v_end_date;
  END IF;

  v_net_profit := v_gross_revenue - v_fixed_expenses - v_commissions - v_product_costs;

  v_waterfall := jsonb_build_array(
    jsonb_build_object('name', 'Faturamento', 'value', v_gross_revenue, 'type', 'positive'),
    jsonb_build_object('name', 'Desp. Fixas', 'value', v_fixed_expenses, 'type', 'negative'),
    jsonb_build_object('name', 'Comissões', 'value', v_commissions, 'type', 'negative'),
    jsonb_build_object('name', 'Custos', 'value', v_product_costs, 'type', 'negative'),
    jsonb_build_object('name', 'Lucro', 'value', v_net_profit, 'type', CASE WHEN v_net_profit >= 0 THEN 'positive' ELSE 'negative' END)
  );

  -- ===================== CASH PROJECTION (30 days) =====================
  -- Current cumulative balance
  SELECT COALESCE(SUM(gt), 0) INTO v_current_balance FROM (
    SELECT grand_total AS gt FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
    UNION ALL
    SELECT total AS gt FROM service_orders
    WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
  ) r;
  v_current_balance := v_current_balance - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE venue_id = p_venue_id);

  WITH days AS (
    SELECT generate_series(v_today, v_today + 29, '1 day'::INTERVAL)::DATE AS day_date
  ),
  daily_receivables AS (
    SELECT DATE(start_time AT TIME ZONE 'America/Sao_Paulo') AS d, COALESCE(SUM(grand_total), 0) AS amt
    FROM bookings
    WHERE venue_id = p_venue_id AND status IN ('CONFIRMED', 'PENDING')
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_today AND v_today + 29
    GROUP BY 1
  ),
  daily_payables AS (
    SELECT due_date AS d, COALESCE(SUM(amount), 0) AS amt
    FROM expenses
    WHERE venue_id = p_venue_id AND is_paid = false
      AND due_date BETWEEN v_today AND v_today + 29
    GROUP BY 1
  ),
  projection AS (
    SELECT 
      days.day_date,
      v_current_balance 
        + COALESCE(SUM(SUM(COALESCE(dr.amt, 0) - COALESCE(dp.amt, 0))) OVER (ORDER BY days.day_date), 0) AS projected
    FROM days
    LEFT JOIN daily_receivables dr ON dr.d = days.day_date
    LEFT JOIN daily_payables dp ON dp.d = days.day_date
    GROUP BY days.day_date
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('day', to_char(day_date, 'DD/MM'), 'projected_balance', ROUND(projected, 2))
    ORDER BY day_date
  ), '[]'::JSONB) INTO v_projection
  FROM projection;

  -- ===================== REVENUE BY PROFESSIONAL =====================
  IF p_segment IN ('beauty', 'health') THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('name', prof_name, 'revenue', prof_revenue, 'cost', 0)
      ORDER BY prof_revenue DESC
    ), '[]'::JSONB) INTO v_rev_prof
    FROM (
      SELECT 
        COALESCE(vm.display_name, 'Sem profissional') AS prof_name,
        COALESCE(SUM(bs.price), 0) AS prof_revenue
      FROM booking_services bs
      JOIN bookings b ON b.id = bs.booking_id
      LEFT JOIN venue_members vm ON vm.id = bs.professional_id
      WHERE b.venue_id = p_venue_id AND b.status = 'FINALIZED'
        AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
      GROUP BY prof_name
    ) sub;
  ELSE
    v_rev_prof := NULL;
  END IF;

  -- ===================== DELINQUENCY HEATMAP =====================
  IF p_segment = 'custom' THEN
    -- OS overdue + quotes pending > 7 days
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', v_today - INTERVAL '7 weeks')::DATE,
        date_trunc('week', v_today)::DATE,
        '1 week'::INTERVAL
      )::DATE AS week_start
    ),
    overdue AS (
      SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS d, total AS val FROM service_orders
      WHERE venue_id = p_venue_id
        AND ((order_type = 'simple' AND status_simple = 'open') OR (order_type = 'complete' AND status_complete IN ('registered', 'in_progress')))
        AND created_at < v_today - INTERVAL '7 days'
      UNION ALL
      SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS d, total AS val FROM quotes
      WHERE venue_id = p_venue_id AND status = 'pending'
        AND created_at < v_today - INTERVAL '7 days'
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('week_label', to_char(w.week_start, 'DD/MM'), 'count', COALESCE(sub.cnt, 0), 'total_value', COALESCE(sub.total, 0))
      ORDER BY w.week_start
    ), '[]'::JSONB) INTO v_delinquency
    FROM weeks w
    LEFT JOIN (
      SELECT date_trunc('week', d)::DATE AS wk, COUNT(*) AS cnt, SUM(val) AS total
      FROM overdue GROUP BY 1
    ) sub ON sub.wk = w.week_start;
  ELSE
    -- Sports/Beauty/Health: past bookings not finalized
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', v_today - INTERVAL '7 weeks')::DATE,
        date_trunc('week', v_today)::DATE,
        '1 week'::INTERVAL
      )::DATE AS week_start
    ),
    overdue AS (
      SELECT DATE(start_time AT TIME ZONE 'America/Sao_Paulo') AS d, grand_total AS val
      FROM bookings
      WHERE venue_id = p_venue_id
        AND start_time < v_today
        AND status NOT IN ('FINALIZED', 'CANCELLED')
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('week_label', to_char(w.week_start, 'DD/MM'), 'count', COALESCE(sub.cnt, 0), 'total_value', COALESCE(sub.total, 0))
      ORDER BY w.week_start
    ), '[]'::JSONB) INTO v_delinquency
    FROM weeks w
    LEFT JOIN (
      SELECT date_trunc('week', d)::DATE AS wk, COUNT(*) AS cnt, SUM(val) AS total
      FROM overdue GROUP BY 1
    ) sub ON sub.wk = w.week_start;
  END IF;

  RETURN QUERY SELECT v_waterfall, v_projection, v_rev_prof, v_delinquency;
END;
$$;
