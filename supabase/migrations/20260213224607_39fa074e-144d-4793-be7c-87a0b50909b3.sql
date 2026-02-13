
-- 1. Create venue_operating_hours table
CREATE TABLE public.venue_operating_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time time NOT NULL DEFAULT '08:00',
  close_time time NOT NULL DEFAULT '18:00',
  is_open boolean NOT NULL DEFAULT true,
  UNIQUE(venue_id, day_of_week)
);

-- 2. Enable RLS
ALTER TABLE public.venue_operating_hours ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Members can view operating hours"
  ON public.venue_operating_hours FOR SELECT
  USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Admins and managers can insert operating hours"
  ON public.venue_operating_hours FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM venue_members vm
    WHERE vm.venue_id = venue_operating_hours.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
  ));

CREATE POLICY "Admins and managers can update operating hours"
  ON public.venue_operating_hours FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM venue_members vm
    WHERE vm.venue_id = venue_operating_hours.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
  ));

CREATE POLICY "Admins and managers can delete operating hours"
  ON public.venue_operating_hours FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM venue_members vm
    WHERE vm.venue_id = venue_operating_hours.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role])
  ));

-- 4. Trigger function to auto-create operating hours on venue insert
CREATE OR REPLACE FUNCTION public.create_default_operating_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_open time;
  v_close time;
  v_sunday_open boolean;
  d integer;
BEGIN
  IF NEW.segment = 'sports' THEN
    v_open := '14:00'::time;
    v_close := '23:00'::time;
    v_sunday_open := true;
  ELSE
    v_open := '07:00'::time;
    v_close := '19:00'::time;
    v_sunday_open := false;
  END IF;

  FOR d IN 0..6 LOOP
    INSERT INTO public.venue_operating_hours (venue_id, day_of_week, open_time, close_time, is_open)
    VALUES (
      NEW.id,
      d,
      v_open,
      v_close,
      CASE WHEN d = 0 THEN v_sunday_open ELSE true END
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_create_default_operating_hours
  AFTER INSERT ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_operating_hours();

-- 5. Seed existing venues that don't have operating hours yet
INSERT INTO public.venue_operating_hours (venue_id, day_of_week, open_time, close_time, is_open)
SELECT
  v.id,
  d.day,
  CASE WHEN v.segment = 'sports' THEN '14:00'::time ELSE '07:00'::time END,
  CASE WHEN v.segment = 'sports' THEN '23:00'::time ELSE '19:00'::time END,
  CASE WHEN d.day = 0 AND v.segment != 'sports' THEN false ELSE true END
FROM public.venues v
CROSS JOIN generate_series(0, 6) AS d(day)
ON CONFLICT (venue_id, day_of_week) DO NOTHING;

-- 6. Update RPC to use operating hours
CREATE OR REPLACE FUNCTION public.get_professional_availability_public(
  p_venue_id uuid,
  p_date date,
  p_total_duration_minutes integer DEFAULT 30,
  p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE(slot_start timestamptz, professional_id uuid, professional_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slot_interval integer;
  v_open_time time;
  v_close_time time;
  v_is_open boolean;
  v_day_start timestamptz;
  v_day_end timestamptz;
BEGIN
  -- Get slot interval
  SELECT COALESCE(v.slot_interval_minutes, 30) INTO v_slot_interval
  FROM venues v WHERE v.id = p_venue_id;

  -- Get operating hours for the requested day
  SELECT oh.open_time, oh.close_time, oh.is_open
  INTO v_open_time, v_close_time, v_is_open
  FROM venue_operating_hours oh
  WHERE oh.venue_id = p_venue_id
    AND oh.day_of_week = EXTRACT(DOW FROM p_date)::integer;

  -- If no record found, use defaults
  IF NOT FOUND THEN
    v_open_time := '08:00'::time;
    v_close_time := '20:00'::time;
    v_is_open := true;
  END IF;

  -- If closed, return empty
  IF NOT v_is_open THEN
    RETURN;
  END IF;

  v_day_start := (p_date || ' ' || v_open_time)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_day_end   := (p_date || ' ' || v_close_time)::timestamp AT TIME ZONE 'America/Sao_Paulo';

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
$$;
