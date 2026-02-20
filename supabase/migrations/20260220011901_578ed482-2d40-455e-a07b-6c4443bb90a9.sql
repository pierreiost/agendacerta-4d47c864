
-- ============================================================
-- Parte 1: Corrigir calculate_booking_totals para respeitar booking_type = 'service'
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_booking_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  items_sum DECIMAL(10, 2);
  services_sum DECIMAL(10, 2);
  booking_type_val TEXT;
BEGIN
  -- Obter o booking_type do booking afetado
  SELECT booking_type INTO booking_type_val
  FROM public.bookings
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  -- Calcular total dos order_items
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.order_items
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);

  IF booking_type_val = 'service' THEN
    -- Para bookings de serviço: somar booking_services + order_items
    SELECT COALESCE(SUM(price), 0) INTO services_sum
    FROM public.booking_services
    WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);

    UPDATE public.bookings
    SET items_total = items_sum,
        grand_total = services_sum + items_sum,
        updated_at = now()
    WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  ELSE
    -- Para bookings de espaço: comportamento original
    UPDATE public.bookings
    SET items_total = items_sum,
        grand_total = space_total + items_sum,
        updated_at = now()
    WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- Parte 2: RPC para adicionar serviço a agendamento existente
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_service_to_booking(
  p_booking_id UUID,
  p_service_id UUID,
  p_professional_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_price NUMERIC;
  v_duration INTEGER;
  v_venue_id UUID;
  v_services_sum NUMERIC;
  v_items_sum NUMERIC;
BEGIN
  -- Verificar que a booking existe e obter venue_id
  SELECT venue_id INTO v_venue_id
  FROM public.bookings
  WHERE id = p_booking_id AND status NOT IN ('FINALIZED', 'CANCELLED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado ou não pode ser editado';
  END IF;

  -- Buscar preço e duração (considerando preço customizado do profissional)
  SELECT
    COALESCE(ps.custom_price, s.price),
    COALESCE(ps.custom_duration, s.duration_minutes)
  INTO v_price, v_duration
  FROM public.services s
  LEFT JOIN public.professional_services ps
    ON ps.service_id = s.id AND ps.member_id = p_professional_id
  WHERE s.id = p_service_id AND s.venue_id = v_venue_id AND s.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inativo';
  END IF;

  -- Inserir em booking_services
  INSERT INTO public.booking_services (booking_id, service_id, professional_id, price, duration_minutes)
  VALUES (p_booking_id, p_service_id, p_professional_id, v_price, v_duration);

  -- Recalcular totais
  SELECT COALESCE(SUM(price), 0) INTO v_services_sum
  FROM public.booking_services
  WHERE booking_id = p_booking_id;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_items_sum
  FROM public.order_items
  WHERE booking_id = p_booking_id;

  -- Atualizar booking com novos totais e duração
  UPDATE public.bookings
  SET
    grand_total = v_services_sum + v_items_sum,
    items_total = v_items_sum,
    total_duration_minutes = (
      SELECT COALESCE(SUM(duration_minutes), 0)
      FROM public.booking_services
      WHERE booking_id = p_booking_id
    ),
    updated_at = now()
  WHERE id = p_booking_id;
END;
$function$;
