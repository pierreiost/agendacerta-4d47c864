-- Função para buscar horários ocupados de um espaço em uma data específica
CREATE OR REPLACE FUNCTION public.get_space_bookings_for_date(
  p_venue_id UUID,
  p_space_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
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
  WHERE id = p_venue_id;

  IF NOT FOUND OR NOT v_venue.public_page_enabled THEN
    RETURN;
  END IF;

  -- Retornar horários ocupados (exceto cancelados)
  RETURN QUERY
  SELECT b.start_time, b.end_time
  FROM bookings b
  WHERE b.venue_id = p_venue_id
    AND b.space_id = p_space_id
    AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = p_date
    AND b.status != 'CANCELLED'
  ORDER BY b.start_time;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_space_bookings_for_date TO anon;
GRANT EXECUTE ON FUNCTION public.get_space_bookings_for_date TO authenticated;

-- Função para criar reserva via página pública (modo calendar)
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

  -- Validar dados obrigatórios
  IF p_customer_name IS NULL OR p_customer_name = '' THEN
    RAISE EXCEPTION 'Nome obrigatório';
  END IF;

  IF p_customer_email IS NULL OR p_customer_email = '' THEN
    RAISE EXCEPTION 'Email obrigatório';
  END IF;

  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Horário obrigatório';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Horário de término deve ser após o início';
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

  -- Criar reserva com status PENDING (aguardando confirmação)
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
    COALESCE(p_notes, 'Agendamento via página pública'),
    'PENDING',
    v_space_total,
    v_space_total,
    NULL
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_booking TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_booking TO authenticated;

COMMENT ON FUNCTION public.get_space_bookings_for_date IS 'Retorna horários ocupados de um espaço em uma data';
COMMENT ON FUNCTION public.create_public_booking IS 'Cria agendamento via página pública (modo calendar)';
