-- =====================================================
-- FASE 1: Migração Multi-Segmento (Sports + Beauty/Health)
-- =====================================================

-- 1. Enum para segmentos de negócio
CREATE TYPE public.venue_segment AS ENUM ('sports', 'beauty', 'health', 'custom');

-- 2. Adicionar campos de segmento na tabela venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS segment public.venue_segment DEFAULT 'sports',
ADD COLUMN IF NOT EXISTS business_category text,
ADD COLUMN IF NOT EXISTS slot_interval_minutes integer DEFAULT 30;

-- 3. Tabela de Serviços (para beauty/health)
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 30,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Índices para services
CREATE INDEX idx_services_venue ON public.services(venue_id);
CREATE INDEX idx_services_active ON public.services(venue_id, is_active);

-- 5. Estender venue_members para profissionais agendáveis
ALTER TABLE public.venue_members
ADD COLUMN IF NOT EXISTS is_bookable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 6. Tabela de junção: Profissional <-> Serviços (N:N)
CREATE TABLE public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.venue_members(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price numeric(10,2), -- Preço específico do profissional (opcional)
  custom_duration integer,     -- Duração específica do profissional (opcional)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, service_id)
);

-- 7. Índices para professional_services
CREATE INDEX idx_prof_services_member ON public.professional_services(member_id);
CREATE INDEX idx_prof_services_service ON public.professional_services(service_id);

-- 8. Estender bookings para suportar ambos os modelos
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'space', -- 'space' ou 'service'
ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES public.venue_members(id),
ADD COLUMN IF NOT EXISTS total_duration_minutes integer;

-- 9. Tabela para itens de serviço dentro de um booking (carrinho de serviços)
CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  professional_id uuid REFERENCES public.venue_members(id),
  price numeric(10,2) NOT NULL,
  duration_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_services_booking ON public.booking_services(booking_id);

-- 10. Enable RLS em novas tabelas
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para services
CREATE POLICY "Members can view services"
ON public.services FOR SELECT
USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage services"
ON public.services FOR ALL
USING (is_venue_member(auth.uid(), venue_id));

-- 12. Políticas RLS para professional_services
CREATE POLICY "Members can view professional services"
ON public.professional_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.venue_members vm
    WHERE vm.id = professional_services.member_id
    AND is_venue_member(auth.uid(), vm.venue_id)
  )
);

CREATE POLICY "Members can manage professional services"
ON public.professional_services FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.venue_members vm
    WHERE vm.id = professional_services.member_id
    AND is_venue_member(auth.uid(), vm.venue_id)
  )
);

-- 13. Políticas RLS para booking_services
CREATE POLICY "Members can view booking services"
ON public.booking_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_services.booking_id
    AND is_venue_member(auth.uid(), b.venue_id)
  )
);

CREATE POLICY "Members can manage booking services"
ON public.booking_services FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_services.booking_id
    AND is_venue_member(auth.uid(), b.venue_id)
  )
);

-- 14. Trigger para updated_at em services
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Função para buscar disponibilidade de profissionais
CREATE OR REPLACE FUNCTION public.get_professional_availability(
  p_venue_id uuid,
  p_date date,
  p_service_ids uuid[],
  p_professional_id uuid DEFAULT NULL
)
RETURNS TABLE (
  professional_id uuid,
  professional_name text,
  available_slots timestamptz[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_duration integer;
  v_slot_interval integer;
  v_start_hour integer := 8;  -- Hora de início (configurável depois)
  v_end_hour integer := 20;   -- Hora de fim (configurável depois)
BEGIN
  -- Calcular duração total dos serviços
  SELECT COALESCE(SUM(duration_minutes), 30) INTO v_total_duration
  FROM services
  WHERE id = ANY(p_service_ids) AND venue_id = p_venue_id AND is_active = true;

  -- Buscar intervalo de slot da venue
  SELECT COALESCE(slot_interval_minutes, 30) INTO v_slot_interval
  FROM venues WHERE id = p_venue_id;

  -- Retornar profissionais disponíveis com seus slots
  RETURN QUERY
  WITH bookable_professionals AS (
    SELECT vm.id, COALESCE(vm.display_name, p.full_name) as name
    FROM venue_members vm
    JOIN profiles p ON p.user_id = vm.user_id
    WHERE vm.venue_id = p_venue_id
      AND vm.is_bookable = true
      AND (p_professional_id IS NULL OR vm.id = p_professional_id)
      -- Verifica se o profissional oferece TODOS os serviços solicitados
      AND NOT EXISTS (
        SELECT 1 FROM unnest(p_service_ids) AS requested_service
        WHERE NOT EXISTS (
          SELECT 1 FROM professional_services ps
          WHERE ps.member_id = vm.id AND ps.service_id = requested_service
        )
      )
  ),
  existing_bookings AS (
    SELECT 
      b.professional_id,
      b.start_time,
      b.end_time
    FROM bookings b
    WHERE b.venue_id = p_venue_id
      AND b.booking_type = 'service'
      AND DATE(b.start_time AT TIME ZONE 'America/Sao_Paulo') = p_date
      AND b.status NOT IN ('CANCELLED')
  ),
  time_slots AS (
    SELECT generate_series(
      (p_date + (v_start_hour || ' hours')::interval) AT TIME ZONE 'America/Sao_Paulo',
      (p_date + (v_end_hour || ' hours')::interval - (v_slot_interval || ' minutes')::interval) AT TIME ZONE 'America/Sao_Paulo',
      (v_slot_interval || ' minutes')::interval
    ) AS slot_time
  )
  SELECT 
    bp.id,
    bp.name,
    ARRAY_AGG(ts.slot_time ORDER BY ts.slot_time) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM existing_bookings eb
        WHERE eb.professional_id = bp.id
          AND (
            -- Verifica conflito: novo slot sobrepõe booking existente
            (ts.slot_time < eb.end_time AND ts.slot_time + (v_total_duration || ' minutes')::interval > eb.start_time)
          )
      )
    )
  FROM bookable_professionals bp
  CROSS JOIN time_slots ts
  GROUP BY bp.id, bp.name;
END;
$$;

-- 16. Função pública para criar booking de serviço
CREATE OR REPLACE FUNCTION public.create_service_booking(
  p_venue_id uuid,
  p_professional_id uuid,
  p_service_ids uuid[],
  p_start_time timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venue RECORD;
  v_total_duration integer;
  v_total_price numeric;
  v_end_time timestamptz;
  v_booking_id uuid;
  v_service RECORD;
  v_conflict_count integer;
BEGIN
  -- Validar venue
  SELECT id, public_page_enabled FROM venues WHERE id = p_venue_id INTO v_venue;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;
  IF NOT v_venue.public_page_enabled THEN RAISE EXCEPTION 'Agendamento online não está ativo'; END IF;

  -- Calcular totais
  SELECT 
    COALESCE(SUM(duration_minutes), 30),
    COALESCE(SUM(price), 0)
  INTO v_total_duration, v_total_price
  FROM services
  WHERE id = ANY(p_service_ids) AND venue_id = p_venue_id AND is_active = true;

  v_end_time := p_start_time + (v_total_duration || ' minutes')::interval;

  -- Verificar conflitos
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE venue_id = p_venue_id
    AND professional_id = p_professional_id
    AND booking_type = 'service'
    AND status != 'CANCELLED'
    AND (start_time < v_end_time AND end_time > p_start_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Horário indisponível para este profissional';
  END IF;

  -- Criar booking principal
  INSERT INTO bookings (
    venue_id,
    space_id,
    booking_type,
    professional_id,
    customer_name,
    customer_email,
    customer_phone,
    start_time,
    end_time,
    total_duration_minutes,
    space_total,
    grand_total,
    notes,
    status
  )
  VALUES (
    p_venue_id,
    (SELECT id FROM spaces WHERE venue_id = p_venue_id LIMIT 1), -- Placeholder space
    'service',
    p_professional_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    v_end_time,
    v_total_duration,
    v_total_price,
    v_total_price,
    COALESCE(p_notes, 'Agendamento via página pública'),
    'PENDING'
  )
  RETURNING id INTO v_booking_id;

  -- Inserir serviços do booking
  FOR v_service IN 
    SELECT id, price, duration_minutes
    FROM services
    WHERE id = ANY(p_service_ids) AND venue_id = p_venue_id
  LOOP
    INSERT INTO booking_services (booking_id, service_id, professional_id, price, duration_minutes)
    VALUES (v_booking_id, v_service.id, p_professional_id, v_service.price, v_service.duration_minutes);
  END LOOP;

  RETURN v_booking_id;
END;
$$;