-- Migration: Correções de segurança críticas
-- Hardening de validações e políticas

-- =====================================================
-- 1. CORRIGIR POLÍTICA DE STORAGE - Restringir tipos de arquivo
-- =====================================================

-- Remover política antiga (muito permissiva)
DROP POLICY IF EXISTS "Anyone can upload inquiry photos" ON storage.objects;

-- Nova política com validação de tipo de arquivo
CREATE POLICY "Anyone can upload inquiry photos with type validation"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inquiry-photos'
    AND (
      -- Permitir apenas imagens
      (storage.extension(name) = 'jpg') OR
      (storage.extension(name) = 'jpeg') OR
      (storage.extension(name) = 'png') OR
      (storage.extension(name) = 'gif') OR
      (storage.extension(name) = 'webp')
    )
    -- Limitar tamanho (5MB = 5242880 bytes) - se suportado
  );

-- =====================================================
-- 2. MELHORAR VALIDAÇÃO NA FUNÇÃO create_service_inquiry
-- =====================================================

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
  v_sanitized_name TEXT;
  v_sanitized_email TEXT;
  v_sanitized_phone TEXT;
  v_sanitized_description TEXT;
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

  -- Sanitizar e validar nome (trim + limite de 200 caracteres)
  v_sanitized_name := TRIM(SUBSTRING(p_customer_name FROM 1 FOR 200));
  IF v_sanitized_name IS NULL OR v_sanitized_name = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  -- Validar tamanho mínimo do nome
  IF LENGTH(v_sanitized_name) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Sanitizar e validar email (formato básico + limite)
  v_sanitized_email := LOWER(TRIM(SUBSTRING(p_customer_email FROM 1 FOR 254)));
  IF v_sanitized_email IS NULL OR v_sanitized_email = '' THEN
    RAISE EXCEPTION 'Email do cliente é obrigatório';
  END IF;

  -- Validação de formato de email (regex básico)
  IF NOT v_sanitized_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- Sanitizar telefone (apenas números, limite de 20 caracteres)
  v_sanitized_phone := NULLIF(TRIM(SUBSTRING(REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g') FROM 1 FOR 20)), '');

  -- Validar telefone se fornecido
  IF v_sanitized_phone IS NOT NULL AND LENGTH(v_sanitized_phone) < 8 THEN
    RAISE EXCEPTION 'Telefone deve ter pelo menos 8 dígitos';
  END IF;

  -- Sanitizar descrição (limite de 5000 caracteres)
  v_sanitized_description := TRIM(SUBSTRING(COALESCE(p_problem_description, '') FROM 1 FOR 5000));

  -- Validar número de fotos (máximo 5)
  IF array_length(p_photo_urls, 1) > 5 THEN
    RAISE EXCEPTION 'Máximo de 5 fotos permitidas';
  END IF;

  -- Criar a solicitação com dados sanitizados
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
    v_sanitized_name,
    v_sanitized_email,
    v_sanitized_phone,
    v_sanitized_description,
    COALESCE(p_photo_urls, '{}'),
    'pending'
  )
  RETURNING id INTO v_inquiry_id;

  RETURN v_inquiry_id;
END;
$$;

-- =====================================================
-- 3. MELHORAR VALIDAÇÃO NA FUNÇÃO create_public_booking
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_venue_id UUID,
  p_space_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
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
  v_conflict_count INTEGER;
  v_sanitized_name TEXT;
  v_sanitized_email TEXT;
  v_sanitized_phone TEXT;
  v_sanitized_notes TEXT;
BEGIN
  -- Validar venue
  SELECT id, public_page_enabled, booking_mode
  INTO v_venue
  FROM venues
  WHERE id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado';
  END IF;

  IF NOT v_venue.public_page_enabled THEN
    RAISE EXCEPTION 'Página pública não está ativa';
  END IF;

  IF v_venue.booking_mode != 'calendar' THEN
    RAISE EXCEPTION 'Este estabelecimento não aceita agendamentos online';
  END IF;

  -- Validar espaço
  SELECT id, name, price_per_hour, is_active
  INTO v_space
  FROM spaces
  WHERE id = p_space_id AND venue_id = p_venue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Espaço não encontrado';
  END IF;

  IF NOT v_space.is_active THEN
    RAISE EXCEPTION 'Espaço não disponível';
  END IF;

  -- Sanitizar e validar nome
  v_sanitized_name := TRIM(SUBSTRING(p_customer_name FROM 1 FOR 200));
  IF v_sanitized_name IS NULL OR v_sanitized_name = '' THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF LENGTH(v_sanitized_name) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Sanitizar e validar email
  v_sanitized_email := LOWER(TRIM(SUBSTRING(p_customer_email FROM 1 FOR 254)));
  IF v_sanitized_email IS NULL OR v_sanitized_email = '' THEN
    RAISE EXCEPTION 'Email obrigatório';
  END IF;

  IF NOT v_sanitized_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- Sanitizar telefone
  v_sanitized_phone := NULLIF(TRIM(SUBSTRING(REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g') FROM 1 FOR 20)), '');

  -- Sanitizar notas
  v_sanitized_notes := TRIM(SUBSTRING(COALESCE(p_notes, 'Agendamento via página pública') FROM 1 FOR 1000));

  -- Validar horários
  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Horário obrigatório';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Horário de término deve ser após o início';
  END IF;

  -- Validar que não é no passado
  IF p_start_time < NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Não é possível agendar no passado';
  END IF;

  -- Validar limite máximo de horas por reserva (12 horas)
  IF EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600 > 12 THEN
    RAISE EXCEPTION 'Reserva não pode exceder 12 horas';
  END IF;

  -- Verificar conflitos de horário
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = p_venue_id
    AND space_id = p_space_id
    AND status != 'CANCELLED'
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Horário indisponível. Por favor, escolha outro horário.';
  END IF;

  -- Calcular valor
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  v_space_total := v_hours * COALESCE(v_space.price_per_hour, 0);

  -- Criar reserva com dados sanitizados
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
    v_sanitized_name,
    v_sanitized_email,
    v_sanitized_phone,
    p_start_time,
    p_end_time,
    v_sanitized_notes,
    'PENDING',
    v_space_total,
    v_space_total,
    NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- =====================================================
-- 4. MELHORAR VALIDAÇÃO NA FUNÇÃO create_public_inquiry (legacy)
-- =====================================================

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
  v_sanitized_name TEXT;
  v_sanitized_email TEXT;
  v_sanitized_phone TEXT;
  v_sanitized_notes TEXT;
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

  -- Sanitizar e validar nome
  v_sanitized_name := TRIM(SUBSTRING(p_customer_name FROM 1 FOR 200));
  IF v_sanitized_name IS NULL OR v_sanitized_name = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF LENGTH(v_sanitized_name) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Sanitizar e validar email
  v_sanitized_email := LOWER(TRIM(SUBSTRING(p_customer_email FROM 1 FOR 254)));
  IF v_sanitized_email IS NULL OR v_sanitized_email = '' THEN
    RAISE EXCEPTION 'Email do cliente é obrigatório';
  END IF;

  IF NOT v_sanitized_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- Sanitizar telefone
  v_sanitized_phone := NULLIF(TRIM(SUBSTRING(REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g') FROM 1 FOR 20)), '');

  -- Sanitizar notas
  v_sanitized_notes := TRIM(SUBSTRING(COALESCE(p_notes, 'Solicitação via página pública') FROM 1 FOR 1000));

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
    v_sanitized_name,
    v_sanitized_email,
    v_sanitized_phone,
    p_start_time,
    p_end_time,
    v_sanitized_notes,
    'PENDING',
    v_space_total,
    v_space_total,
    NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

-- =====================================================
-- 5. ADICIONAR CONSTRAINT PARA VALIDAR EXTERNAL_LINK_URL
-- =====================================================

-- Função para validar URL segura (não permite javascript:, data:, etc.)
CREATE OR REPLACE FUNCTION is_safe_url(url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN TRUE;
  END IF;

  -- Rejeitar URLs potencialmente perigosas
  IF url ~* '^(javascript|data|vbscript|file):' THEN
    RETURN FALSE;
  END IF;

  -- Aceitar apenas http e https
  IF NOT url ~* '^https?://' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Adicionar trigger para validar public_settings antes de salvar
CREATE OR REPLACE FUNCTION validate_venue_public_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_external_url TEXT;
BEGIN
  IF NEW.public_settings IS NOT NULL THEN
    v_external_url := NEW.public_settings->>'external_link_url';

    IF v_external_url IS NOT NULL AND NOT is_safe_url(v_external_url) THEN
      RAISE EXCEPTION 'URL externa inválida ou insegura. Use apenas URLs http:// ou https://';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS validate_venue_settings_trigger ON venues;
CREATE TRIGGER validate_venue_settings_trigger
  BEFORE INSERT OR UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION validate_venue_public_settings();

-- =====================================================
-- 6. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.create_service_inquiry IS 'Cria solicitação de orçamento com validação de segurança (sanitização de inputs, validação de email, limites de tamanho)';
COMMENT ON FUNCTION public.create_public_booking IS 'Cria agendamento público com validação de segurança (sanitização, validação de horário, limite de duração)';
COMMENT ON FUNCTION is_safe_url IS 'Valida se uma URL é segura (apenas http/https, sem javascript/data)';
