
-- 1. Add p_status parameter to create_service_booking
CREATE OR REPLACE FUNCTION public.create_service_booking(
  p_venue_id uuid,
  p_professional_id uuid,
  p_service_ids uuid[],
  p_start_time timestamp with time zone,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT 'PENDING'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_venue RECORD;
  v_total_duration integer;
  v_total_price numeric;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_service RECORD;
  v_conflict_count integer;
BEGIN
  SELECT id, public_page_enabled FROM venues WHERE id = p_venue_id INTO v_venue;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;

  SELECT 
    COALESCE(SUM(duration_minutes), 30),
    COALESCE(SUM(price), 0)
  INTO v_total_duration, v_total_price
  FROM services
  WHERE id = ANY(p_service_ids) AND venue_id = p_venue_id AND is_active = true;

  v_end_time := p_start_time + (v_total_duration || ' minutes')::interval;

  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = p_venue_id
    AND professional_id = p_professional_id
    AND booking_type = 'service'
    AND status != 'CANCELLED'
    AND (start_time < v_end_time AND end_time > p_start_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Horário indisponível para este profissional';
  END IF;

  INSERT INTO bookings (
    venue_id, space_id, booking_type, professional_id,
    customer_name, customer_email, customer_phone,
    start_time, end_time, total_duration_minutes,
    space_total, grand_total, notes, status
  )
  VALUES (
    p_venue_id,
    (SELECT id FROM spaces WHERE venue_id = p_venue_id LIMIT 1),
    'service', p_professional_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_start_time, v_end_time, v_total_duration,
    v_total_price, v_total_price,
    COALESCE(p_notes, 'Agendamento via página pública'),
    p_status::booking_status
  )
  RETURNING id INTO v_booking_id;

  FOR v_service IN 
    SELECT id, price, duration_minutes
    FROM services
    WHERE id = ANY(p_service_ids) AND venue_id = p_venue_id
  LOOP
    INSERT INTO booking_services (booking_id, service_id, professional_id, price, duration_minutes)
    VALUES (v_booking_id, v_service.id, p_professional_id, v_service.price, v_service.duration_minutes);
  END LOOP;

  RETURN v_booking_id;
END;
$function$;

-- 2. Filter past slots in get_professional_availability_public
CREATE OR REPLACE FUNCTION public.get_professional_availability_public(
  p_venue_id uuid,
  p_date date,
  p_total_duration_minutes integer,
  p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE(slot_start timestamp with time zone, professional_id uuid, professional_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_interval integer;
  v_start_hour integer := 8;
  v_end_hour integer := 20;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  SELECT COALESCE(v.slot_interval_minutes, 30) INTO v_slot_interval
  FROM venues v WHERE v.id = p_venue_id;

  v_day_start := (p_date || ' ' || v_start_hour || ':00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_day_end   := (p_date || ' ' || v_end_hour   || ':00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';

  RETURN QUERY
  WITH bookable_pros AS (
    SELECT vm.id, COALESCE(vm.display_name, pr.full_name) AS name
    FROM venue_members vm
    JOIN profiles pr ON pr.user_id = vm.user_id
    WHERE vm.venue_id = p_venue_id
      AND vm.is_bookable = true
      AND (p_professional_id IS NULL OR vm.id = p_professional_id)
  ),
  time_slots AS (
    SELECT generate_series(
      v_day_start,
      v_day_end - (v_slot_interval || ' minutes')::interval,
      (v_slot_interval || ' minutes')::interval
    ) AS slot_time
  ),
  existing_bookings AS (
    SELECT
      b.professional_id AS pro_id,
      b.start_time,
      b.end_time
    FROM bookings b
    WHERE b.venue_id = p_venue_id
      AND b.booking_type = 'service'
      AND b.status != 'CANCELLED'
      AND b.start_time >= v_day_start
      AND b.start_time < v_day_end
  )
  SELECT
    ts.slot_time AS slot_start,
    bp.id AS professional_id,
    bp.name AS professional_name
  FROM bookable_pros bp
  CROSS JOIN time_slots ts
  WHERE NOT EXISTS (
    SELECT 1 FROM existing_bookings eb
    WHERE eb.pro_id = bp.id
      AND eb.start_time < ts.slot_time + (p_total_duration_minutes || ' minutes')::interval
      AND eb.end_time   > ts.slot_time
  )
  AND ts.slot_time + (p_total_duration_minutes || ' minutes')::interval <= v_day_end
  AND (p_date != CURRENT_DATE OR ts.slot_time > NOW())
  ORDER BY ts.slot_time, bp.name;
END;
$function$;
