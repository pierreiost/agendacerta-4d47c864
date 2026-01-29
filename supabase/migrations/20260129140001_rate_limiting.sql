-- Migration: Rate Limiting para prevenir spam e abuso
-- Limita requisições por IP/email em funções públicas

-- =====================================================
-- 1. TABELA DE RATE LIMITING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP ou email
  action_type TEXT NOT NULL, -- 'inquiry', 'booking', 'upload'
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_logs(identifier, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON rate_limit_logs(created_at);

-- RLS - tabela interna, sem acesso direto
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. FUNÇÃO DE VERIFICAÇÃO DE RATE LIMIT
-- =====================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_venue_id UUID,
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Contar requisições no período
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_logs
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND (p_venue_id IS NULL OR venue_id = p_venue_id)
    AND created_at > v_window_start;

  -- Se excedeu o limite, retorna FALSE
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Registrar esta requisição
  INSERT INTO rate_limit_logs (identifier, action_type, venue_id)
  VALUES (p_identifier, p_action_type, p_venue_id);

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO DE LIMPEZA DE LOGS ANTIGOS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remover logs com mais de 24 horas
  DELETE FROM rate_limit_logs
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- =====================================================
-- 4. ATUALIZAR FUNÇÕES PÚBLICAS COM RATE LIMITING
-- =====================================================

-- Atualizar create_service_inquiry com rate limiting
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

  -- Sanitizar email primeiro para usar no rate limiting
  v_sanitized_email := LOWER(TRIM(SUBSTRING(p_customer_email FROM 1 FOR 254)));
  IF v_sanitized_email IS NULL OR v_sanitized_email = '' THEN
    RAISE EXCEPTION 'Email do cliente é obrigatório';
  END IF;

  IF NOT v_sanitized_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- Rate limiting: máximo 5 inquiries por email por hora
  IF NOT check_rate_limit(v_sanitized_email, 'inquiry', p_venue_id, 5, 60) THEN
    RAISE EXCEPTION 'Muitas solicitações. Por favor, aguarde alguns minutos antes de tentar novamente.';
  END IF;

  -- Sanitizar e validar nome
  v_sanitized_name := TRIM(SUBSTRING(p_customer_name FROM 1 FOR 200));
  IF v_sanitized_name IS NULL OR v_sanitized_name = '' THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;

  IF LENGTH(v_sanitized_name) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
  END IF;

  -- Sanitizar telefone
  v_sanitized_phone := NULLIF(TRIM(SUBSTRING(REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g') FROM 1 FOR 20)), '');

  IF v_sanitized_phone IS NOT NULL AND LENGTH(v_sanitized_phone) < 8 THEN
    RAISE EXCEPTION 'Telefone deve ter pelo menos 8 dígitos';
  END IF;

  -- Sanitizar descrição
  v_sanitized_description := TRIM(SUBSTRING(COALESCE(p_problem_description, '') FROM 1 FOR 5000));

  -- Validar número de fotos
  IF array_length(p_photo_urls, 1) > 5 THEN
    RAISE EXCEPTION 'Máximo de 5 fotos permitidas';
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

-- Atualizar create_public_booking com rate limiting
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

  -- Sanitizar email primeiro para usar no rate limiting
  v_sanitized_email := LOWER(TRIM(SUBSTRING(p_customer_email FROM 1 FOR 254)));
  IF v_sanitized_email IS NULL OR v_sanitized_email = '' THEN
    RAISE EXCEPTION 'Email obrigatório';
  END IF;

  IF NOT v_sanitized_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  -- Rate limiting: máximo 10 bookings por email por hora
  IF NOT check_rate_limit(v_sanitized_email, 'booking', p_venue_id, 10, 60) THEN
    RAISE EXCEPTION 'Muitas reservas. Por favor, aguarde alguns minutos antes de tentar novamente.';
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

  -- Sanitizar nome
  v_sanitized_name := TRIM(SUBSTRING(p_customer_name FROM 1 FOR 200));
  IF v_sanitized_name IS NULL OR v_sanitized_name = '' THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF LENGTH(v_sanitized_name) < 2 THEN
    RAISE EXCEPTION 'Nome deve ter pelo menos 2 caracteres';
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

  IF p_start_time < NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Não é possível agendar no passado';
  END IF;

  IF EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600 > 12 THEN
    RAISE EXCEPTION 'Reserva não pode exceder 12 horas';
  END IF;

  -- Verificar conflitos
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = p_venue_id
    AND space_id = p_space_id
    AND status != 'CANCELLED'
    AND (start_time < p_end_time AND end_time > p_start_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Horário indisponível. Por favor, escolha outro horário.';
  END IF;

  -- Calcular valor
  v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
  v_space_total := v_hours * COALESCE(v_space.price_per_hour, 0);

  -- Criar reserva
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
-- 5. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE rate_limit_logs IS 'Logs de rate limiting para prevenir abuso nas APIs públicas';
COMMENT ON FUNCTION check_rate_limit IS 'Verifica e registra rate limit. Retorna TRUE se permitido, FALSE se bloqueado';
COMMENT ON FUNCTION cleanup_rate_limit_logs IS 'Remove logs de rate limiting antigos (>24h)';
