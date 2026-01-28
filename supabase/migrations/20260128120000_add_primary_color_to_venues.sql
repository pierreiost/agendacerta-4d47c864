-- Adicionar campo primary_color à tabela venues para personalização de identidade visual
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.venues.primary_color IS 'Cor primária da identidade visual da unidade (formato hexadecimal, ex: #6366f1)';
