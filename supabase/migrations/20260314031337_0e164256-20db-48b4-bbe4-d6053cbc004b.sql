
-- 1. Add new columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recurrence_group_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS package_id uuid;

-- 2. Create customer_packages table
CREATE TABLE IF NOT EXISTS public.customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  total_sessions integer NOT NULL,
  used_sessions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add FK from bookings.package_id to customer_packages
ALTER TABLE public.bookings ADD CONSTRAINT bookings_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.customer_packages(id);

-- 4. Validation trigger for status (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_customer_package_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'exhausted', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid package status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_customer_package_status
  BEFORE INSERT OR UPDATE ON public.customer_packages
  FOR EACH ROW EXECUTE FUNCTION public.validate_customer_package_status();

-- 5. RLS for customer_packages
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view customer packages"
  ON public.customer_packages FOR SELECT
  TO authenticated
  USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage customer packages"
  ON public.customer_packages FOR ALL
  TO authenticated
  USING (is_venue_member(auth.uid(), venue_id))
  WITH CHECK (is_venue_member(auth.uid(), venue_id));

-- 6. Trigger: auto-increment used_sessions when booking is FINALIZED
CREATE OR REPLACE FUNCTION public.handle_booking_package_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'FINALIZED' AND OLD.status != 'FINALIZED' AND NEW.package_id IS NOT NULL THEN
    UPDATE public.customer_packages
    SET used_sessions = used_sessions + 1
    WHERE id = NEW.package_id AND status = 'active';

    -- Exhaust the package if all sessions used
    UPDATE public.customer_packages
    SET status = 'exhausted'
    WHERE id = NEW.package_id AND used_sessions >= total_sessions AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_package_session
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_package_session();

-- 7. Update create_recurring_bookings to include recurrence_group_id (the one with p_timezone)
CREATE OR REPLACE FUNCTION public.create_recurring_bookings(
  p_venue_id uuid, p_space_id uuid, p_customer_name text,
  p_base_date date, p_start_hour integer, p_end_hour integer,
  p_customer_email text DEFAULT NULL, p_customer_phone text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL, p_notes text DEFAULT NULL,
  p_space_price_per_hour numeric DEFAULT 0,
  p_recurrence_type text DEFAULT 'weekly', p_recurrence_count integer DEFAULT 1,
  p_timezone text DEFAULT 'America/Sao_Paulo'
)
RETURNS TABLE(booking_id uuid, booking_date date, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_date date;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_conflict_count integer;
  v_hours numeric;
  v_space_total numeric;
  v_recurrence_group_id uuid;
  i integer;
BEGIN
  PERFORM 1 FROM spaces WHERE id = p_space_id FOR UPDATE;
  
  v_hours := p_end_hour - p_start_hour;
  v_space_total := v_hours * p_space_price_per_hour;
  v_recurrence_group_id := gen_random_uuid();
  
  FOR i IN 0..(p_recurrence_count - 1) LOOP
    IF p_recurrence_type = 'weekly' THEN
      v_current_date := p_base_date + (i * 7);
    ELSE
      v_current_date := p_base_date + (i || ' months')::interval;
    END IF;
    
    IF v_current_date < CURRENT_DATE THEN
      booking_id := NULL;
      booking_date := v_current_date;
      success := false;
      error_message := 'Data no passado';
      RETURN NEXT;
      CONTINUE;
    END IF;
    
    v_start_time := ((v_current_date || ' ' || p_start_hour || ':00:00') || ' ' || p_timezone)::timestamptz;
    v_end_time := ((v_current_date || ' ' || p_end_hour || ':00:00') || ' ' || p_timezone)::timestamptz;
    
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
    
    INSERT INTO bookings (
      venue_id, space_id, customer_name, customer_email, customer_phone,
      customer_id, start_time, end_time, notes, status,
      space_total, grand_total, created_by, recurrence_group_id
    ) VALUES (
      p_venue_id, p_space_id, p_customer_name, p_customer_email, p_customer_phone,
      p_customer_id, v_start_time, v_end_time,
      '[Reserva Recorrente ' || (i + 1) || '/' || p_recurrence_count || '] ' || COALESCE(p_notes, ''),
      'CONFIRMED'::booking_status, v_space_total, v_space_total, auth.uid(),
      v_recurrence_group_id
    )
    RETURNING id INTO v_booking_id;
    
    booking_id := v_booking_id;
    booking_date := v_current_date;
    success := true;
    error_message := NULL;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- 8. Update create_service_booking to accept p_package_id
CREATE OR REPLACE FUNCTION public.create_service_booking(
  p_venue_id uuid, p_professional_id uuid, p_service_ids uuid[],
  p_start_time timestamptz, p_customer_name text,
  p_customer_email text DEFAULT NULL, p_customer_phone text DEFAULT NULL,
  p_status text DEFAULT 'CONFIRMED', p_notes text DEFAULT NULL,
  p_package_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_duration integer;
  v_total_price numeric;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_service RECORD;
BEGIN
  SELECT 
    COALESCE(SUM(COALESCE(ps.custom_duration, s.duration_minutes)), 30),
    COALESCE(SUM(COALESCE(ps.custom_price, s.price)), 0)
  INTO v_total_duration, v_total_price
  FROM unnest(p_service_ids) AS sid(id)
  JOIN services s ON s.id = sid.id AND s.venue_id = p_venue_id AND s.is_active = true
  LEFT JOIN professional_services ps ON ps.service_id = s.id AND ps.member_id = p_professional_id;

  IF v_total_duration = 0 THEN
    RAISE EXCEPTION 'Nenhum serviço válido selecionado';
  END IF;

  -- If using a package, zero the price for covered services
  IF p_package_id IS NOT NULL THEN
    v_total_price := 0;
  END IF;

  v_end_time := p_start_time + (v_total_duration || ' minutes')::interval;

  PERFORM 1
  FROM bookings
  WHERE venue_id = p_venue_id
    AND professional_id = p_professional_id
    AND status != 'CANCELLED'
    AND start_time < v_end_time
    AND end_time > p_start_time
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Conflito de horário detectado para este profissional';
  END IF;

  INSERT INTO bookings (
    venue_id, space_id, booking_type, professional_id,
    customer_name, customer_email, customer_phone,
    start_time, end_time, total_duration_minutes,
    space_total, grand_total, notes, status, package_id
  ) VALUES (
    p_venue_id,
    (SELECT id FROM spaces WHERE venue_id = p_venue_id LIMIT 1),
    'service', p_professional_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_start_time, v_end_time, v_total_duration,
    0, v_total_price,
    p_notes, p_status::booking_status, p_package_id
  )
  RETURNING id INTO v_booking_id;

  FOR v_service IN
    SELECT s.id, s.duration_minutes, s.price,
           ps.custom_duration, ps.custom_price
    FROM unnest(p_service_ids) AS sid(id)
    JOIN services s ON s.id = sid.id
    LEFT JOIN professional_services ps ON ps.service_id = s.id AND ps.member_id = p_professional_id
  LOOP
    INSERT INTO booking_services (booking_id, service_id, professional_id, price, duration_minutes)
    VALUES (
      v_booking_id, v_service.id, p_professional_id,
      CASE WHEN p_package_id IS NOT NULL THEN 0
           ELSE COALESCE(v_service.custom_price, v_service.price) END,
      COALESCE(v_service.custom_duration, v_service.duration_minutes)
    );
  END LOOP;

  RETURN v_booking_id;
END;
$function$;
