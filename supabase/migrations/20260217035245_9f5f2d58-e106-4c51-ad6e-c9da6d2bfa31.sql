
-- Novas colunas em venues
ALTER TABLE public.venues
  ADD COLUMN niche_id uuid REFERENCES public.niches(id) ON DELETE SET NULL,
  ADD COLUMN city text,
  ADD COLUMN state text DEFAULT 'RS',
  ADD COLUMN is_marketplace_visible boolean NOT NULL DEFAULT false;

-- Permitir leitura publica de venues no marketplace via RPC (nao muda RLS existente)

-- RPC: get_marketplace_venues
CREATE OR REPLACE FUNCTION public.get_marketplace_venues(p_niche_id uuid DEFAULT NULL, p_city text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  city text,
  state text,
  niche_name text,
  primary_color text,
  segment public.venue_segment
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id,
    v.name,
    v.slug,
    v.logo_url,
    v.city,
    v.state,
    n.name AS niche_name,
    v.primary_color,
    v.segment
  FROM venues v
  LEFT JOIN niches n ON n.id = v.niche_id
  WHERE v.is_marketplace_visible = true
    AND v.public_page_enabled = true
    AND v.status IN ('active', 'trialing')
    AND (p_niche_id IS NULL OR v.niche_id = p_niche_id)
    AND (p_city IS NULL OR v.city ILIKE '%' || p_city || '%')
  ORDER BY v.name;
$$;

-- RPC: get_marketplace_filters
CREATE OR REPLACE FUNCTION public.get_marketplace_filters()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'niches', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id,
        'name', n.name,
        'slug', n.slug,
        'segment', n.segment
      ) ORDER BY n.segment, n.name), '[]'::jsonb)
      FROM niches n
      WHERE EXISTS (
        SELECT 1 FROM venues v
        WHERE v.niche_id = n.id
          AND v.is_marketplace_visible = true
          AND v.public_page_enabled = true
          AND v.status IN ('active', 'trialing')
      )
    ),
    'cities', (
      SELECT coalesce(jsonb_agg(DISTINCT v.city ORDER BY v.city), '[]'::jsonb)
      FROM venues v
      WHERE v.is_marketplace_visible = true
        AND v.public_page_enabled = true
        AND v.status IN ('active', 'trialing')
        AND v.city IS NOT NULL
        AND v.city != ''
    )
  );
$$;
