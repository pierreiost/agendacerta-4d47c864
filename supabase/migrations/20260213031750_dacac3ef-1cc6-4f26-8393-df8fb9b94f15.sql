
-- 1.1 Adicionar cover_image_url na tabela services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 1.2 Drop e recriar get_public_venue_by_slug com segment
DROP FUNCTION IF EXISTS public.get_public_venue_by_slug(text);

CREATE OR REPLACE FUNCTION public.get_public_venue_by_slug(p_slug text)
 RETURNS TABLE(id uuid, name text, slug text, booking_mode text, public_settings jsonb, logo_url text, primary_color text, public_page_sections jsonb, segment text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    v.id, 
    v.name, 
    v.slug, 
    v.booking_mode, 
    v.public_settings, 
    v.logo_url, 
    v.primary_color,
    v.public_page_sections,
    v.segment::text
  FROM venues v 
  WHERE v.slug = p_slug AND v.public_page_enabled = TRUE;
END;
$function$;

-- 1.3 Criar RPC get_public_services_by_venue
CREATE OR REPLACE FUNCTION public.get_public_services_by_venue(p_venue_id uuid)
 RETURNS TABLE(id uuid, title text, description text, price numeric, duration_minutes integer, cover_image_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_venue RECORD;
BEGIN
  SELECT public_page_enabled INTO v_venue FROM venues WHERE venues.id = p_venue_id;
  IF NOT FOUND OR NOT v_venue.public_page_enabled THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.id, s.title, s.description, s.price, s.duration_minutes, s.cover_image_url
  FROM services s
  WHERE s.venue_id = p_venue_id AND s.is_active = TRUE
  ORDER BY s.display_order NULLS LAST, s.title;
END;
$function$;

-- 1.4 Criar RPC get_public_venue_professionals
CREATE OR REPLACE FUNCTION public.get_public_venue_professionals(p_venue_id uuid, p_service_ids uuid[])
 RETURNS TABLE(member_id uuid, display_name text, avatar_url text, bio text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_admin_member_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM venue_members vm
  WHERE vm.venue_id = p_venue_id
    AND vm.is_bookable = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p_service_ids) AS req_sid
      WHERE NOT EXISTS (
        SELECT 1 FROM professional_services ps
        WHERE ps.member_id = vm.id AND ps.service_id = req_sid
      )
    );

  IF v_count = 0 THEN
    SELECT vm.id INTO v_admin_member_id
    FROM venue_members vm
    WHERE vm.venue_id = p_venue_id AND vm.role = 'admin'
    LIMIT 1;

    IF v_admin_member_id IS NOT NULL THEN
      UPDATE venue_members
      SET is_bookable = true
      WHERE id = v_admin_member_id AND (is_bookable IS NULL OR is_bookable = false);

      INSERT INTO professional_services (member_id, service_id)
      SELECT v_admin_member_id, s.id
      FROM services s
      WHERE s.venue_id = p_venue_id AND s.is_active = true
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    vm.id AS member_id,
    COALESCE(vm.display_name, p.full_name) AS display_name,
    vm.avatar_url,
    vm.bio
  FROM venue_members vm
  JOIN profiles p ON p.user_id = vm.user_id
  WHERE vm.venue_id = p_venue_id
    AND vm.is_bookable = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p_service_ids) AS req_sid
      WHERE NOT EXISTS (
        SELECT 1 FROM professional_services ps
        WHERE ps.member_id = vm.id AND ps.service_id = req_sid
      )
    );
END;
$function$;

-- 1.5 Criar RPC get_professional_availability_public
CREATE OR REPLACE FUNCTION public.get_professional_availability_public(
  p_venue_id uuid,
  p_date date,
  p_total_duration_minutes integer,
  p_professional_id uuid DEFAULT NULL
)
 RETURNS TABLE(slot_start timestamptz, professional_id uuid, professional_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_interval integer;
  v_start_hour integer := 8;
  v_end_hour integer := 20;
BEGIN
  SELECT COALESCE(v.slot_interval_minutes, 30) INTO v_slot_interval
  FROM venues v WHERE v.id = p_venue_id;

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
      (p_date || ' ' || v_start_hour || ':00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo',
      (p_date || ' ' || v_end_hour || ':00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo' - (v_slot_interval || ' minutes')::interval,
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
      AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = p_date
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
      AND tsrange(eb.start_time, eb.end_time) && tsrange(ts.slot_time, ts.slot_time + (p_total_duration_minutes || ' minutes')::interval)
  )
  AND ts.slot_time + (p_total_duration_minutes || ' minutes')::interval <= (p_date || ' ' || v_end_hour || ':00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'
  ORDER BY ts.slot_time, bp.name;
END;
$function$;
