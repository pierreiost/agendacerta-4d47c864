-- Adicionar colunas de personalização visual que faltam
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;