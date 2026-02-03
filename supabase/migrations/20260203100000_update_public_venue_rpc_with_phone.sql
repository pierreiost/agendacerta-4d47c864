-- Migration: Atualiza RPC get_public_venue_by_slug
-- Adiciona campo phone para botão WhatsApp e valida plan_type = 'max'

-- Drop e recriar função com phone e validação de plan_type
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
  public_page_sections jsonb,
  phone text
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
    v.public_page_sections,
    v.phone
  FROM venues v
  WHERE v.slug = p_slug
    AND v.public_page_enabled = TRUE
    AND v.plan_type = 'max';  -- Apenas plano max tem acesso à página pública
END;
$function$;

COMMENT ON FUNCTION public.get_public_venue_by_slug(text) IS
'Retorna dados públicos do venue por slug. Apenas venues com plan_type=max e public_page_enabled=true são retornados.';
