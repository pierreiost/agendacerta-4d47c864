-- P2: Adicionar coluna metadata JSONB para campos dinâmicos por segmento
-- Permite extensibilidade sem alterar schema

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Criar índice GIN para queries eficientes no metadata
CREATE INDEX IF NOT EXISTS idx_bookings_metadata ON public.bookings USING GIN (metadata);

-- Comentário documentando uso
COMMENT ON COLUMN public.bookings.metadata IS 'Campos dinâmicos por segmento: equipamentos, observações específicas, preferências, etc.';