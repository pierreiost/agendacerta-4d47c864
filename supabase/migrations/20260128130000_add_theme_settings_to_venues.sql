-- Adiciona campos de tema/cores adicionais na tabela venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON COLUMN public.venues.primary_color IS 'Cor primária: botões principais, links, sidebar ativa';
COMMENT ON COLUMN public.venues.secondary_color IS 'Cor secundária: botões secundários, badges, tags';
COMMENT ON COLUMN public.venues.accent_color IS 'Cor de destaque: notificações, alertas, destaques';
COMMENT ON COLUMN public.venues.dark_mode IS 'Ativa/desativa modo escuro';
