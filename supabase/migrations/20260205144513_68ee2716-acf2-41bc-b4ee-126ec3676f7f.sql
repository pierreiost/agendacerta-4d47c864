-- RPC para métricas financeiras consolidadas (elimina N+1 queries)
CREATE OR REPLACE FUNCTION public.get_financial_metrics(
  p_venue_id UUID,
  p_period TEXT DEFAULT 'month'
)
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
SET search_path TO 'public'
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
BEGIN
  v_today := CURRENT_DATE;
  
  -- Definir período atual e anterior
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

  -- Receita do período atual (bookings finalizados + service orders finalizadas)
  SELECT COALESCE(SUM(grand_total), 0) INTO v_current_revenue
  FROM (
    SELECT grand_total FROM bookings
    WHERE venue_id = p_venue_id
      AND status = 'FINALIZED'
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
    UNION ALL
    SELECT total AS grand_total FROM service_orders
    WHERE venue_id = p_venue_id
      AND (
        (order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced'))
      )
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
  ) revenues;

  -- Receita do período anterior
  SELECT COALESCE(SUM(grand_total), 0) INTO v_prev_revenue
  FROM (
    SELECT grand_total FROM bookings
    WHERE venue_id = p_venue_id
      AND status = 'FINALIZED'
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_prev_start_date AND v_prev_end_date
    UNION ALL
    SELECT total AS grand_total FROM service_orders
    WHERE venue_id = p_venue_id
      AND (
        (order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced'))
      )
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_prev_start_date AND v_prev_end_date
  ) revenues;

  -- Despesas do período atual
  SELECT COALESCE(SUM(amount), 0) INTO v_current_expenses
  FROM expenses
  WHERE venue_id = p_venue_id
    AND expense_date BETWEEN v_start_date AND v_end_date;

  -- Despesas do período anterior
  SELECT COALESCE(SUM(amount), 0) INTO v_prev_expenses
  FROM expenses
  WHERE venue_id = p_venue_id
    AND expense_date BETWEEN v_prev_start_date AND v_prev_end_date;

  -- Despesas pendentes (não pagas)
  SELECT COALESCE(SUM(amount), 0) INTO v_pending
  FROM expenses
  WHERE venue_id = p_venue_id
    AND is_paid = false;

  -- Dados mensais para gráfico (últimos 6 meses)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', m.month_label,
      'revenue', m.month_revenue,
      'expenses', m.month_expenses
    ) ORDER BY m.month_start
  ), '[]'::JSONB)
  INTO v_monthly
  FROM (
    SELECT 
      to_char(month_start, 'Mon') AS month_label,
      month_start,
      (
        SELECT COALESCE(SUM(grand_total), 0) FROM bookings
        WHERE venue_id = p_venue_id
          AND status = 'FINALIZED'
          AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') 
              BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      ) + (
        SELECT COALESCE(SUM(total), 0) FROM service_orders
        WHERE venue_id = p_venue_id
          AND (
            (order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
            OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced'))
          )
          AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') 
              BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
      ) AS month_revenue,
      (
        SELECT COALESCE(SUM(amount), 0) FROM expenses
        WHERE venue_id = p_venue_id
          AND expense_date BETWEEN month_start AND (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
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
    v_current_revenue - v_current_expenses,
    CASE WHEN v_prev_revenue > 0 THEN ((v_current_revenue - v_prev_revenue) / v_prev_revenue) * 100 ELSE 0 END,
    CASE WHEN v_prev_expenses > 0 THEN ((v_current_expenses - v_prev_expenses) / v_prev_expenses) * 100 ELSE 0 END,
    v_pending,
    v_monthly;
END;
$$;