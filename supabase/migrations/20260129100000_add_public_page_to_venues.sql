-- Migration: Adiciona funcionalidade de Página Pública aos venues
-- Permite que estabelecimentos tenham sua própria página de agendamento

-- Adicionar colunas para Página Pública
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_page_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_mode TEXT CHECK (booking_mode IN ('calendar', 'inquiry', 'external_link')),
  ADD COLUMN IF NOT EXISTS public_settings JSONB DEFAULT '{}';

-- Índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_venues_slug ON public.venues(slug) WHERE slug IS NOT NULL;

-- Índice para páginas públicas ativas
CREATE INDEX IF NOT EXISTS idx_venues_public_enabled ON public.venues(public_page_enabled) WHERE public_page_enabled = TRUE;

-- Comentários para documentação
COMMENT ON COLUMN public.venues.slug IS 'Identificador único da URL pública (ex: agendacerta.com/slug)';
COMMENT ON COLUMN public.venues.public_page_enabled IS 'Se a página pública está ativa e acessível';
COMMENT ON COLUMN public.venues.booking_mode IS 'Modo de operação: calendar (agenda), inquiry (orçamento), external_link (link externo)';
COMMENT ON COLUMN public.venues.public_settings IS 'Configurações JSON: external_link_url, inquiry_notification_email, page_title, page_instruction';

-- Função para validar slug (apenas letras, números e hífens)
CREATE OR REPLACE FUNCTION validate_venue_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$' THEN
    RAISE EXCEPTION 'Slug inválido. Use apenas letras minúsculas, números e hífens.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar slug antes de insert/update
DROP TRIGGER IF EXISTS validate_venue_slug_trigger ON public.venues;
CREATE TRIGGER validate_venue_slug_trigger
  BEFORE INSERT OR UPDATE OF slug ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION validate_venue_slug();
