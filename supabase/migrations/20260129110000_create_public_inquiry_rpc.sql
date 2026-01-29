-- Migration: Função RPC para criação de inquéritos/orçamentos via página pública
-- Permite que usuários anônimos enviem solicitações de orçamento

-- Função para criar inquiry de forma segura (bypass RLS para anônimos)
CREATE OR REPLACE FUNCTION public.create_public_inquiry(
  p_venue_id UUID,
  p_space_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
  v_space RECORD;
  v_booking_id UUID;
  v_hours NUMERIC;
  v_space_total NUMERIC;
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

  -- Validar que o espaço existe e pertence ao venue
  SELECT id, name, price_per_hour, is_active
  INTO v_space
  FROM spaces
  WHERE id = p_space_id AND venue_id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Espaço não encontrado ou não pertence a este estabelecimento';
  END IF;

  IF NOT v_space.is_active THEN
    RAISE EXCEPTION 'Este espaço não está disponível para reservas';
  END IF;

  -- Validar dados obrigatórios
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF p_customer_email IS NULL OR p_customer_email = '' THEN
    RAISE EXCEPTION 'Email do cliente é obrigatório';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'A data/hora de término deve ser posterior à de início';
  END IF;

  -- Calcular duração e valor
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  v_space_total := v_hours * COALESCE(v_space.price_per_hour, 0);

  -- Criar a reserva com status PENDING
  INSERT INTO bookings (
    venue_id,
    space_id,
    customer_name,
    customer_email,
    customer_phone,
    start_time,
    end_time,
    notes,
    status,
    space_total,
    grand_total,
    created_by
  ) VALUES (
    p_venue_id,
    p_space_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    p_end_time,
    COALESCE(p_notes, 'Solicitação via página pública'),
    'PENDING',
    v_space_total,
    v_space_total,
    NULL -- Criado por usuário anônimo
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.create_public_inquiry TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_inquiry TO authenticated;

-- Função para buscar dados públicos do venue pelo slug
CREATE OR REPLACE FUNCTION public.get_public_venue_by_slug(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  booking_mode TEXT,
  public_settings JSONB,
  logo_url TEXT,
  primary_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.slug,
    v.booking_mode,
    v.public_settings,
    v.logo_url,
    v.primary_color
  FROM venues v
  WHERE v.slug = p_slug
    AND v.public_page_enabled = TRUE;
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.get_public_venue_by_slug TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_venue_by_slug TO authenticated;

-- Função para buscar espaços públicos de um venue
CREATE OR REPLACE FUNCTION public.get_public_spaces_by_venue(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price_per_hour NUMERIC,
  capacity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
BEGIN
  -- Verificar se o venue tem página pública ativa
  SELECT public_page_enabled INTO v_venue
  FROM venues
  WHERE venues.id = p_venue_id;

  IF NOT FOUND OR NOT v_venue.public_page_enabled THEN
    RETURN; -- Retorna vazio se não encontrado ou não público
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.price_per_hour,
    s.capacity
  FROM spaces s
  WHERE s.venue_id = p_venue_id
    AND s.is_active = TRUE
  ORDER BY s.name;
END;
$$;

-- Permitir acesso anônimo à função
GRANT EXECUTE ON FUNCTION public.get_public_spaces_by_venue TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_spaces_by_venue TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION public.create_public_inquiry IS 'Cria uma solicitação de orçamento via página pública (acesso anônimo)';
COMMENT ON FUNCTION public.get_public_venue_by_slug IS 'Busca dados públicos do venue pelo slug';
COMMENT ON FUNCTION public.get_public_spaces_by_venue IS 'Busca espaços públicos de um venue';
