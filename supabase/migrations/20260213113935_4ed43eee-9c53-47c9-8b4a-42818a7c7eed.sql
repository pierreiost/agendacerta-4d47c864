
CREATE OR REPLACE FUNCTION get_professional_availability_public(
  p_venue_id uuid,
  p_date date,
  p_total_duration_minutes integer,
  p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE(slot_start timestamptz, professional_id uuid, professional_name text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_interval integer;
  v_start_hour integer := 8;
  v_end_hour integer := 20;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  SELECT COALESCE(v.slot_interval_minutes, 30) INTO v_slot_interval
  FROM venues v WHERE v.id = p_venue_id;

  -- Pre-compute day boundaries once
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
  ORDER BY ts.slot_time, bp.name;
END;
$$;
