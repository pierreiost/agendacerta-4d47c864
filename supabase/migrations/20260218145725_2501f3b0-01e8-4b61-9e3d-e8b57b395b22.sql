CREATE OR REPLACE FUNCTION public.get_client_bookings_by_phone(p_phone text)
RETURNS TABLE(
  booking_id uuid,
  customer_name text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  grand_total numeric,
  service_title text,
  professional_name text,
  venue_name text,
  venue_whatsapp text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_clean_phone) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.customer_name,
    b.start_time,
    b.end_time,
    b.status::text,
    b.grand_total,
    s.title,
    COALESCE(vm.display_name, pr.full_name),
    v.name,
    v.whatsapp
  FROM bookings b
  JOIN venues v ON v.id = b.venue_id
  LEFT JOIN booking_services bs ON bs.booking_id = b.id
  LEFT JOIN services s ON s.id = bs.service_id
  LEFT JOIN venue_members vm ON vm.id = b.professional_id
  LEFT JOIN profiles pr ON pr.user_id = vm.user_id
  WHERE regexp_replace(b.customer_phone, '[^0-9]', '', 'g') LIKE '%' || v_clean_phone
    AND b.start_time >= (now() - interval '30 days')
    AND b.status != 'CANCELLED'
  ORDER BY b.start_time DESC;
END;
$$;