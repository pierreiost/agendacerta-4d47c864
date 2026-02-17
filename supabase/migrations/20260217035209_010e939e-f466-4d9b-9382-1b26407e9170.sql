
-- Tabela niches com coluna segment vinculada ao enum venue_segment
CREATE TABLE public.niches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_url text,
  segment public.venue_segment NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: leitura publica, sem escrita
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view niches"
  ON public.niches FOR SELECT
  USING (true);

-- Seed: beauty (15)
INSERT INTO public.niches (name, slug, segment) VALUES
  ('Barbeiro', 'barbeiro', 'beauty'),
  ('Cabeleireiro(a)', 'cabeleireiro', 'beauty'),
  ('Manicure', 'manicure', 'beauty'),
  ('Pedicure', 'pedicure', 'beauty'),
  ('Maquiador(a)', 'maquiador', 'beauty'),
  ('Design de Sobrancelhas', 'design-sobrancelhas', 'beauty'),
  ('Esteticista', 'esteticista', 'beauty'),
  ('Depilador(a)', 'depilador', 'beauty'),
  ('Extensionista de Cílios', 'extensionista-cilios', 'beauty'),
  ('Colorista', 'colorista', 'beauty'),
  ('Trancista', 'trancista', 'beauty'),
  ('Nail Designer', 'nail-designer', 'beauty'),
  ('Micropigmentador(a)', 'micropigmentador', 'beauty'),
  ('Visagista', 'visagista', 'beauty'),
  ('Penteadista', 'penteadista', 'beauty');

-- Seed: health (17)
INSERT INTO public.niches (name, slug, segment) VALUES
  ('Nutricionista', 'nutricionista', 'health'),
  ('Psicólogo(a)', 'psicologo', 'health'),
  ('Fisioterapeuta', 'fisioterapeuta', 'health'),
  ('Dentista', 'dentista', 'health'),
  ('Fonoaudiólogo(a)', 'fonoaudiologo', 'health'),
  ('Terapeuta Ocupacional', 'terapeuta-ocupacional', 'health'),
  ('Acupunturista', 'acupunturista', 'health'),
  ('Quiropraxista', 'quiropraxista', 'health'),
  ('Podólogo(a)', 'podologo', 'health'),
  ('Massagista', 'massagista', 'health'),
  ('Personal Trainer', 'personal-trainer', 'health'),
  ('Pilates/Yoga', 'pilates-yoga', 'health'),
  ('Dermatologista', 'dermatologista', 'health'),
  ('Médico(a)', 'medico', 'health'),
  ('Enfermeiro(a)', 'enfermeiro', 'health'),
  ('Osteopata', 'osteopata', 'health'),
  ('Naturopata', 'naturopata', 'health');

-- Seed: sports (12)
INSERT INTO public.niches (name, slug, segment) VALUES
  ('Quadra de Beach Tennis', 'quadra-beach-tennis', 'sports'),
  ('Quadra de Futevôlei', 'quadra-futevolei', 'sports'),
  ('Quadra Society', 'quadra-society', 'sports'),
  ('Quadra de Tênis', 'quadra-tenis', 'sports'),
  ('Quadra de Padel', 'quadra-padel', 'sports'),
  ('Quadra de Vôlei', 'quadra-volei', 'sports'),
  ('Quadra de Basquete', 'quadra-basquete', 'sports'),
  ('Campo de Futebol', 'campo-futebol', 'sports'),
  ('Piscina', 'piscina', 'sports'),
  ('Espaço Fitness', 'espaco-fitness', 'sports'),
  ('Salão de Festas', 'salao-festas', 'sports'),
  ('Espaço de Eventos', 'espaco-eventos', 'sports');

-- Seed: custom (18)
INSERT INTO public.niches (name, slug, segment) VALUES
  ('Encanador', 'encanador', 'custom'),
  ('Eletricista', 'eletricista', 'custom'),
  ('Técnico HVAC', 'tecnico-hvac', 'custom'),
  ('Técnico de Informática', 'tecnico-informatica', 'custom'),
  ('Técnico de Celular', 'tecnico-celular', 'custom'),
  ('Técnico de Eletrodomésticos', 'tecnico-eletrodomesticos', 'custom'),
  ('Veterinário(a)', 'veterinario', 'custom'),
  ('Passeador de Cães', 'passeador-caes', 'custom'),
  ('Pet Sitter', 'pet-sitter', 'custom'),
  ('Faxina/Diarista', 'faxina-diarista', 'custom'),
  ('Jardineiro(a)', 'jardineiro', 'custom'),
  ('Pintor(a)', 'pintor', 'custom'),
  ('Marceneiro(a)', 'marceneiro', 'custom'),
  ('Serralheiro(a)', 'serralheiro', 'custom'),
  ('Vidraceiro', 'vidraceiro', 'custom'),
  ('Dedetizador', 'dedetizador', 'custom'),
  ('Fotógrafo(a)', 'fotografo', 'custom'),
  ('Tatuador(a)', 'tatuador', 'custom');
