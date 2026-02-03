-- P0: Função atómica para criar reserva COM verificação de conflito
-- Elimina race conditions usando row-level locking

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_venue_id uuid,
  p_space_id uuid,
  p_customer_name text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'CONFIRMED',
  p_space_price_per_hour numeric DEFAULT 0,
  p_booking_type text DEFAULT 'space',
  p_professional_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count integer;
  v_booking_id uuid;
  v_hours numeric;
  v_space_total numeric;
BEGIN
  -- Validate inputs
  IF p_venue_id IS NULL THEN
    RAISE EXCEPTION 'venue_id é obrigatório';
  END IF;
  IF p_space_id IS NULL THEN
    RAISE EXCEPTION 'space_id é obrigatório';
  END IF;
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RAISE EXCEPTION 'customer_name é obrigatório';
  END IF;
  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Horário inválido: início deve ser antes do fim';
  END IF;

  -- Lock the space row to prevent concurrent modifications
  PERFORM 1 FROM spaces WHERE id = p_space_id FOR UPDATE;
  
  -- Check for conflicts atomically (within the same transaction)
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE space_id = p_space_id
    AND status != 'CANCELLED'
    AND (start_time < p_end_time AND end_time > p_start_time);
  
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Conflito de horário: já existe reserva neste período';
  END IF;
  
  -- Calculate space_total
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  v_space_total := v_hours * p_space_price_per_hour;
  
  -- Insert the booking atomically
  INSERT INTO bookings (
    venue_id,
    space_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_id,
    start_time,
    end_time,
    notes,
    status,
    space_total,
    grand_total,
    booking_type,
    professional_id,
    created_by
  ) VALUES (
    p_venue_id,
    p_space_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_id,
    p_start_time,
    p_end_time,
    p_notes,
    p_status::booking_status,
    v_space_total,
    v_space_total,
    p_booking_type,
    p_professional_id,
    auth.uid()
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;

-- P0: Função para criar múltiplas reservas recorrentes em transação única
CREATE OR REPLACE FUNCTION public.create_recurring_bookings(
  p_venue_id uuid,
  p_space_id uuid,
  p_customer_name text,
  p_base_date date,
  p_start_hour integer,
  p_end_hour integer,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_space_price_per_hour numeric DEFAULT 0,
  p_recurrence_type text DEFAULT 'weekly',
  p_recurrence_count integer DEFAULT 1
) RETURNS TABLE(booking_id uuid, booking_date date, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date date;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_conflict_count integer;
  v_hours numeric;
  v_space_total numeric;
  i integer;
BEGIN
  -- Lock the space to prevent concurrent modifications
  PERFORM 1 FROM spaces WHERE id = p_space_id FOR UPDATE;
  
  v_hours := p_end_hour - p_start_hour;
  v_space_total := v_hours * p_space_price_per_hour;
  
  FOR i IN 0..(p_recurrence_count - 1) LOOP
    -- Calculate the date for this occurrence
    IF p_recurrence_type = 'weekly' THEN
      v_current_date := p_base_date + (i * 7);
    ELSE -- monthly
      v_current_date := p_base_date + (i || ' months')::interval;
    END IF;
    
    -- Skip past dates
    IF v_current_date < CURRENT_DATE THEN
      booking_id := NULL;
      booking_date := v_current_date;
      success := false;
      error_message := 'Data no passado';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Build timestamps
    v_start_time := (v_current_date || ' ' || p_start_hour || ':00:00')::timestamptz;
    v_end_time := (v_current_date || ' ' || p_end_hour || ':00:00')::timestamptz;
    
    -- Check for conflicts
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE space_id = p_space_id
      AND status != 'CANCELLED'
      AND (start_time < v_end_time AND end_time > v_start_time);
    
    IF v_conflict_count > 0 THEN
      booking_id := NULL;
      booking_date := v_current_date;
      success := false;
      error_message := 'Conflito de horário';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    -- Insert the booking
    INSERT INTO bookings (
      venue_id,
      space_id,
      customer_name,
      customer_email,
      customer_phone,
      customer_id,
      start_time,
      end_time,
      notes,
      status,
      space_total,
      grand_total,
      created_by
    ) VALUES (
      p_venue_id,
      p_space_id,
      p_customer_name,
      p_customer_email,
      p_customer_phone,
      p_customer_id,
      v_start_time,
      v_end_time,
      '[Reserva Recorrente ' || (i + 1) || '/' || p_recurrence_count || '] ' || COALESCE(p_notes, ''),
      'CONFIRMED'::booking_status,
      v_space_total,
      v_space_total,
      auth.uid()
    )
    RETURNING id INTO v_booking_id;
    
    booking_id := v_booking_id;
    booking_date := v_current_date;
    success := true;
    error_message := NULL;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- P1: Função helper para obter métricas do dashboard (calculadas no servidor)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_venue_id uuid)
RETURNS TABLE(
  total_today bigint,
  confirmed_today bigint,
  pending_today bigint,
  month_revenue numeric,
  month_bookings bigint,
  occupancy_rate numeric,
  revenue_sparkline numeric[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_spaces integer;
  v_occupied_slots bigint;
  v_sparkline numeric[];
  v_day date;
  v_revenue numeric;
BEGIN
  -- Get total spaces for the venue
  SELECT COUNT(*) INTO v_total_spaces FROM spaces WHERE venue_id = p_venue_id AND is_active = true;
  IF v_total_spaces = 0 THEN v_total_spaces := 1; END IF;
  
  -- Get today's bookings count for occupancy
  SELECT COUNT(*) INTO v_occupied_slots
  FROM bookings
  WHERE venue_id = p_venue_id
    AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
    AND status != 'CANCELLED';
  
  -- Build sparkline for last 7 days
  v_sparkline := ARRAY[]::numeric[];
  FOR v_day IN SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval)::date LOOP
    SELECT COALESCE(SUM(grand_total), 0) INTO v_revenue
    FROM bookings
    WHERE venue_id = p_venue_id
      AND DATE(start_time AT TIME ZONE 'America/Sao_Paulo') = v_day
      AND status = 'FINALIZED';
    v_sparkline := array_append(v_sparkline, v_revenue);
  END LOOP;
  
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE)::bigint as total_today,
    COUNT(*) FILTER (WHERE b.status = 'CONFIRMED' AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE)::bigint as confirmed_today,
    COUNT(*) FILTER (WHERE b.status = 'PENDING' AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE)::bigint as pending_today,
    COALESCE(SUM(b.grand_total) FILTER (
      WHERE b.status = 'FINALIZED' 
      AND EXTRACT(MONTH FROM b.start_time AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM b.start_time AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(YEAR FROM CURRENT_DATE)
    ), 0)::numeric as month_revenue,
    COUNT(*) FILTER (
      WHERE b.status != 'CANCELLED'
      AND EXTRACT(MONTH FROM b.start_time AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM b.start_time AT TIME ZONE 'America/Sao_Paulo') = EXTRACT(YEAR FROM CURRENT_DATE)
    )::bigint as month_bookings,
    ROUND((v_occupied_slots::numeric / (v_total_spaces * 8)) * 100, 1)::numeric as occupancy_rate,
    v_sparkline as revenue_sparkline
  FROM bookings b
  WHERE b.venue_id = p_venue_id AND b.status != 'CANCELLED';
END;
$$;