-- Drop and recreate the function with new return type
DROP FUNCTION IF EXISTS public.get_public_venue_by_slug(text);

CREATE FUNCTION public.get_public_venue_by_slug(p_slug text)
RETURNS TABLE(
  id uuid, 
  name text, 
  slug text, 
  booking_mode text, 
  public_settings jsonb, 
  logo_url text, 
  primary_color text,
  public_page_sections jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v.public_page_sections
  FROM venues v 
  WHERE v.slug = p_slug AND v.public_page_enabled = TRUE;
END;
$function$;