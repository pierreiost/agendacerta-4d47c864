
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
  p_recurrence_count integer DEFAULT 1,
  p_timezone text DEFAULT 'America/Sao_Paulo'
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
    
    -- Build timestamps using the user's timezone
    v_start_time := (v_current_date || ' ' || p_start_hour || ':00:00')::timestamp AT TIME ZONE p_timezone;
    v_end_time := (v_current_date || ' ' || p_end_hour || ':00:00')::timestamp AT TIME ZONE p_timezone;
    
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
