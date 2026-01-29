-- Tabela para armazenar solicitações de orçamento de serviço
CREATE TABLE IF NOT EXISTS public.service_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  problem_description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_service_inquiries_venue_id ON service_inquiries(venue_id);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_status ON service_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_created_at ON service_inquiries(created_at DESC);

-- RLS
ALTER TABLE service_inquiries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Venue members can view their inquiries"
  ON service_inquiries FOR SELECT
  USING (venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid()));

CREATE POLICY "Venue members can update their inquiries"
  ON service_inquiries FOR UPDATE
  USING (venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid()));

CREATE POLICY "Venue members can delete their inquiries"
  ON service_inquiries FOR DELETE
  USING (venue_id IN (SELECT venue_id FROM venue_members WHERE user_id = auth.uid()));

-- Função RPC para criar inquiry de serviço (acesso anônimo)
CREATE OR REPLACE FUNCTION public.create_service_inquiry(
  p_venue_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_problem_description TEXT DEFAULT NULL,
  p_photo_urls TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
  v_inquiry_id UUID;
BEGIN
  -- Validar que o venue existe e está com página pública ativa
  SELECT id, public_page_enabled, booking_mode
  INTO v_venue
  FROM venues
  WHERE id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado';
  END IF;

  IF NOT v_venue.public_page_enabled THEN
    RAISE EXCEPTION 'Página pública não está ativa para este estabelecimento';
  END IF;

  IF v_venue.booking_mode != 'inquiry' THEN
    RAISE EXCEPTION 'Este estabelecimento não aceita solicitações de orçamento';
  END IF;

  -- Validar dados obrigatórios
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF p_customer_email IS NULL OR p_customer_email = '' THEN
    RAISE EXCEPTION 'Email do cliente é obrigatório';
  END IF;

  -- Criar a solicitação
  INSERT INTO service_inquiries (
    venue_id,
    customer_name,
    customer_email,
    customer_phone,
    problem_description,
    photo_urls,
    status
  ) VALUES (
    p_venue_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    COALESCE(p_problem_description, ''),
    COALESCE(p_photo_urls, '{}'),
    'pending'
  )
  RETURNING id INTO v_inquiry_id;

  RETURN v_inquiry_id;
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.create_service_inquiry TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_inquiry TO authenticated;

-- Comentário
COMMENT ON FUNCTION public.create_service_inquiry IS 'Cria uma solicitação de orçamento de serviço via página pública (acesso anônimo)';
COMMENT ON TABLE public.service_inquiries IS 'Solicitações de orçamento de serviço recebidas via página pública';

-- Criar bucket para fotos de inquiries (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inquiry-photos', 'inquiry-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para upload anônimo
CREATE POLICY "Anyone can upload inquiry photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inquiry-photos');

CREATE POLICY "Anyone can view inquiry photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inquiry-photos');
