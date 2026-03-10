
CREATE OR REPLACE FUNCTION public.get_financial_charts(p_venue_id UUID, p_segment TEXT)
RETURNS TABLE(waterfall_data JSONB, cash_projection JSONB, revenue_by_professional JSONB, delinquency_data JSONB)
LANGUAGE plpgsql SECURITY DEFINER
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
  IF p_segment = 'custom' THEN
    SELECT COALESCE(SUM(total), 0) INTO v_gross_revenue FROM service_orders
    WHERE venue_id = p_venue_id AND status_simple IN ('finished', 'invoiced')
      AND finished_at >= v_start_date AND finished_at < v_end_date + 1;
  ELSIF p_segment IN ('beauty', 'health') THEN
    SELECT COALESCE(SUM(bs.price), 0) INTO v_gross_revenue
    FROM booking_services bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE b.venue_id = p_venue_id AND b.status = 'FINALIZED'
      AND b.start_time >= v_start_date AND b.start_time < v_end_date + 1;
  ELSE
    SELECT COALESCE(SUM(grand_total), 0) INTO v_gross_revenue FROM bookings
    WHERE venue_id = p_venue_id AND status = 'FINALIZED'
      AND start_time >= v_start_date AND start_time < v_end_date + 1;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_fixed_expenses FROM expenses
  WHERE venue_id = p_venue_id AND category NOT IN ('salary', 'material')
    AND expense_date >= v_start_date AND expense_date <= v_end_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_commissions FROM expenses
  WHERE venue_id = p_venue_id AND category = 'salary'
    AND expense_date >= v_start_date AND expense_date <= v_end_date;

  SELECT COALESCE(SUM(amount), 0) INTO v_product_costs FROM expenses
  WHERE venue_id = p_venue_id AND category = 'material'
    AND expense_date >= v_start_date AND expense_date <= v_end_date;

  v_net_profit := v_gross_revenue - v_fixed_expenses - v_commissions - v_product_costs;

  v_waterfall := jsonb_build_array(
    jsonb_build_object('name', 'Faturamento', 'value', v_gross_revenue, 'type', 'positive'),
    jsonb_build_object('name', 'Desp. Fixas', 'value', v_fixed_expenses, 'type', 'negative'),
    jsonb_build_object('name', 'Comissões', 'value', v_commissions, 'type', 'negative'),
    jsonb_build_object('name', 'Custos', 'value', v_product_costs, 'type', 'negative'),
    jsonb_build_object('name', 'Lucro', 'value', v_net_profit, 'type', 'positive')
  );

  -- ===================== CASH PROJECTION =====================
  SELECT COALESCE(SUM(gt), 0) INTO v_current_balance FROM (
    SELECT grand_total AS gt FROM bookings WHERE venue_id = p_venue_id AND status = 'FINALIZED'
    UNION ALL
    SELECT total AS gt FROM service_orders WHERE venue_id = p_venue_id
      AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced')) OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced')))
  ) r;
  v_current_balance := v_current_balance - COALESCE((SELECT SUM(amount) FROM expenses WHERE venue_id = p_venue_id AND is_paid = true), 0);

  SELECT jsonb_agg(
    jsonb_build_object('day', proj.day_label, 'projected_balance', proj.balance)
    ORDER BY proj.d
  ) INTO v_projection
  FROM (
    WITH days AS (
      SELECT generate_series(v_today, v_today + 29, '1 day'::INTERVAL)::DATE AS d
    ),
    future_recv AS (
      SELECT DATE(start_time AT TIME ZONE 'America/Sao_Paulo') AS d, SUM(grand_total) AS amt
      FROM bookings WHERE venue_id = p_venue_id AND status IN ('CONFIRMED', 'PENDING') AND start_time >= v_today
      GROUP BY 1
    ),
    future_pay AS (
      SELECT due_date AS d, SUM(amount) AS amt
      FROM expenses WHERE venue_id = p_venue_id AND is_paid = false AND due_date >= v_today AND due_date <= v_today + 29
      GROUP BY 1
    )
    SELECT days.d,
      to_char(days.d, 'DD/MM') AS day_label,
      v_current_balance
        + COALESCE(SUM(fr.amt) OVER (ORDER BY days.d), 0)
        - COALESCE(SUM(fp.amt) OVER (ORDER BY days.d), 0) AS balance
    FROM days
    LEFT JOIN future_recv fr ON fr.d = days.d
    LEFT JOIN future_pay fp ON fp.d = days.d
  ) proj;

  -- ===================== REVENUE BY PROFESSIONAL =====================
  IF p_segment IN ('beauty', 'health') THEN
    SELECT COALESCE(jsonb_agg(row_to_json(sub)::JSONB), '[]'::JSONB) INTO v_rev_prof
    FROM (
      SELECT vm.display_name AS name,
        COALESCE(SUM(bs.price), 0) AS revenue,
        0 AS cost
      FROM venue_members vm
      JOIN booking_services bs ON bs.professional_id = vm.id
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.venue_id = p_venue_id AND b.status = 'FINALIZED'
        AND b.start_time >= v_start_date AND b.start_time < v_end_date + 1
      GROUP BY vm.display_name
      ORDER BY revenue DESC LIMIT 10
    ) sub;
  ELSE
    v_rev_prof := NULL;
  END IF;

  -- ===================== DELINQUENCY HEATMAP (DAY BY DAY) =====================
  IF p_segment = 'custom' THEN
    WITH days AS (
      SELECT generate_series(
        (v_today - INTERVAL '30 days')::DATE,
        (v_today - INTERVAL '1 day')::DATE,
        '1 day'::INTERVAL
      )::DATE AS day_date
    ),
    overdue AS (
      SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS d, total AS val FROM service_orders
      WHERE venue_id = p_venue_id
        AND ((order_type = 'simple' AND status_simple = 'open') OR (order_type = 'complete' AND status_complete IN ('draft', 'approved', 'in_progress')))
        AND created_at < v_today - INTERVAL '7 days'
      UNION ALL
      SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS d, total AS val FROM quotes
      WHERE venue_id = p_venue_id AND status = 'pending'
        AND created_at < v_today - INTERVAL '7 days'
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'day_label', to_char(dy.day_date, 'DD/MM'),
        'day_name', CASE EXTRACT(DOW FROM dy.day_date)
          WHEN 0 THEN 'Dom' WHEN 1 THEN 'Seg' WHEN 2 THEN 'Ter'
          WHEN 3 THEN 'Qua' WHEN 4 THEN 'Qui' WHEN 5 THEN 'Sex' WHEN 6 THEN 'Sáb'
        END,
        'count', COALESCE(sub.cnt, 0),
        'total_value', COALESCE(sub.total, 0)
      )
      ORDER BY dy.day_date
    ), '[]'::JSONB) INTO v_delinquency
    FROM days dy
    LEFT JOIN (
      SELECT d AS dk, COUNT(*) AS cnt, SUM(val) AS total
      FROM overdue GROUP BY 1
    ) sub ON sub.dk = dy.day_date;
  ELSE
    WITH days AS (
      SELECT generate_series(
        (v_today - INTERVAL '30 days')::DATE,
        (v_today - INTERVAL '1 day')::DATE,
        '1 day'::INTERVAL
      )::DATE AS day_date
    ),
    overdue AS (
      SELECT DATE(start_time AT TIME ZONE 'America/Sao_Paulo') AS d, grand_total AS val
      FROM bookings
      WHERE venue_id = p_venue_id
        AND start_time < v_today
        AND status NOT IN ('FINALIZED', 'CANCELLED')
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'day_label', to_char(dy.day_date, 'DD/MM'),
        'day_name', CASE EXTRACT(DOW FROM dy.day_date)
          WHEN 0 THEN 'Dom' WHEN 1 THEN 'Seg' WHEN 2 THEN 'Ter'
          WHEN 3 THEN 'Qua' WHEN 4 THEN 'Qui' WHEN 5 THEN 'Sex' WHEN 6 THEN 'Sáb'
        END,
        'count', COALESCE(sub.cnt, 0),
        'total_value', COALESCE(sub.total, 0)
      )
      ORDER BY dy.day_date
    ), '[]'::JSONB) INTO v_delinquency
    FROM days dy
    LEFT JOIN (
      SELECT d AS dk, COUNT(*) AS cnt, SUM(val) AS total
      FROM overdue GROUP BY 1
    ) sub ON sub.dk = dy.day_date;
  END IF;

  RETURN QUERY SELECT v_waterfall, v_projection, v_rev_prof, v_delinquency;
END;
$$;
