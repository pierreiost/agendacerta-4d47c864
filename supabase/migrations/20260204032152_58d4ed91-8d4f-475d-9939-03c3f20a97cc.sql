-- Função RPC para métricas do dashboard de Ordens de Serviço
CREATE OR REPLACE FUNCTION public.get_service_order_metrics(
  p_venue_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  open_orders BIGINT,
  finished_today BIGINT,
  month_revenue NUMERIC,
  revenue_sparkline NUMERIC[],
  status_distribution JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_today DATE;
  v_sparkline NUMERIC[];
  v_day DATE;
  v_revenue NUMERIC;
  v_status_dist JSONB;
BEGIN
  v_today := CURRENT_DATE;
  v_start_date := COALESCE(p_start_date, v_today - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, v_today);
  
  -- Build sparkline for last 7 days
  v_sparkline := ARRAY[]::NUMERIC[];
  FOR v_day IN SELECT generate_series(v_today - 6, v_today, '1 day'::INTERVAL)::DATE LOOP
    SELECT COALESCE(SUM(total), 0) INTO v_revenue
    FROM service_orders
    WHERE venue_id = p_venue_id
      AND DATE(finished_at AT TIME ZONE 'America/Sao_Paulo') = v_day
      AND (
        (order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
        OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced'))
      );
    v_sparkline := array_append(v_sparkline, v_revenue);
  END LOOP;
  
  -- Build status distribution
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', status,
    'count', cnt
  )), '[]'::JSONB)
  INTO v_status_dist
  FROM (
    SELECT 
      COALESCE(
        CASE WHEN order_type = 'simple' THEN status_simple::TEXT ELSE status_complete::TEXT END,
        'unknown'
      ) as status,
      COUNT(*) as cnt
    FROM service_orders
    WHERE venue_id = p_venue_id
      AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN v_start_date AND v_end_date
    GROUP BY 1
  ) sub;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM service_orders 
     WHERE venue_id = p_venue_id 
       AND ((order_type = 'simple' AND status_simple = 'open')
         OR (order_type = 'complete' AND status_complete IN ('draft', 'approved', 'in_progress'))))::BIGINT,
    
    (SELECT COUNT(*) FROM service_orders 
     WHERE venue_id = p_venue_id 
       AND DATE(finished_at AT TIME ZONE 'America/Sao_Paulo') = v_today)::BIGINT,
    
    (SELECT COALESCE(SUM(total), 0) FROM service_orders 
     WHERE venue_id = p_venue_id 
       AND EXTRACT(MONTH FROM created_at AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(MONTH FROM v_today)
       AND EXTRACT(YEAR FROM created_at AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(YEAR FROM v_today)
       AND ((order_type = 'simple' AND status_simple IN ('finished', 'invoiced'))
         OR (order_type = 'complete' AND status_complete IN ('finished', 'invoiced'))))::NUMERIC,
    
    v_sparkline,
    v_status_dist;
END;
$function$;