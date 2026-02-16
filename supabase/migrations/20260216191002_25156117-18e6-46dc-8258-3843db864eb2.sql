
-- Drop both overloaded signatures to remove ambiguity
DROP FUNCTION IF EXISTS public.create_service_booking(uuid, uuid, uuid[], timestamptz, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_service_booking(uuid, uuid, uuid[], timestamptz, text, text, text, text, text);

-- Recreate single consolidated function with p_status defaulting to 'CONFIRMED'
CREATE OR REPLACE FUNCTION public.create_service_booking(
  p_venue_id uuid,
  p_professional_id uuid,
  p_service_ids uuid[],
  p_start_time timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'CONFIRMED'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_duration int := 0;
  v_total_price numeric := 0;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_service record;
  v_conflict_count int;
  v_sid uuid;
  v_duration int;
  v_price numeric;
BEGIN
  -- Calculate total duration and price from selected services
  FOR v_service IN
    SELECT s.id, s.duration_minutes, s.price,
           ps.custom_duration, ps.custom_price
    FROM unnest(p_service_ids) AS sid(id)
    JOIN services s ON s.id = sid.id
    LEFT JOIN professional_services ps ON ps.service_id = s.id AND ps.member_id = p_professional_id
  LOOP
    v_duration := COALESCE(v_service.custom_duration, v_service.duration_minutes);
    v_price := COALESCE(v_service.custom_price, v_service.price);
    v_total_duration := v_total_duration + v_duration;
    v_total_price := v_total_price + v_price;
  END LOOP;

  IF v_total_duration = 0 THEN
    RAISE EXCEPTION 'Nenhum serviço válido selecionado';
  END IF;

  v_end_time := p_start_time + (v_total_duration || ' minutes')::interval;

  -- Lock and check conflicts
  SELECT count(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = p_venue_id
    AND professional_id = p_professional_id
    AND status != 'CANCELLED'
    AND start_time < v_end_time
    AND end_time > p_start_time
  FOR UPDATE;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Conflito de horário detectado para este profissional';
  END IF;

  -- Create booking
  INSERT INTO bookings (
    venue_id, professional_id, customer_name, customer_email, customer_phone,
    start_time, end_time, notes, status, booking_type,
    total_duration_minutes, grand_total
  ) VALUES (
    p_venue_id, p_professional_id, p_customer_name, p_customer_email, p_customer_phone,
    p_start_time, v_end_time, p_notes, p_status::booking_status, 'service',
    v_total_duration, v_total_price
  )
  RETURNING id INTO v_booking_id;

  -- Insert booking_services
  FOR v_service IN
    SELECT s.id, s.duration_minutes, s.price,
           ps.custom_duration, ps.custom_price
    FROM unnest(p_service_ids) AS sid(id)
    JOIN services s ON s.id = sid.id
    LEFT JOIN professional_services ps ON ps.service_id = s.id AND ps.member_id = p_professional_id
  LOOP
    INSERT INTO booking_services (booking_id, service_id, professional_id, price, duration_minutes)
    VALUES (
      v_booking_id,
      v_service.id,
      p_professional_id,
      COALESCE(v_service.custom_price, v_service.price),
      COALESCE(v_service.custom_duration, v_service.duration_minutes)
    );
  END LOOP;

  RETURN v_booking_id::text;
END;
$$;
