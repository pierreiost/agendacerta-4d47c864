-- ============================================
-- MIGRAÇÃO DE SEGURANÇA CRÍTICA - AGENDA CERTA
-- ============================================

-- 1. CRIAR TABELA DE SEQUÊNCIAS PARA RESOLVER RACE CONDITION
CREATE TABLE IF NOT EXISTS public.venue_sequences (
  venue_id uuid PRIMARY KEY REFERENCES public.venues(id) ON DELETE CASCADE,
  current_order_number integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de sequências
ALTER TABLE public.venue_sequences ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas membros podem ver sequências da sua venue
CREATE POLICY "Members can view venue sequences"
ON public.venue_sequences
FOR SELECT
TO authenticated
USING (public.is_venue_member(auth.uid(), venue_id));

-- 2. SUBSTITUIR FUNÇÃO DE GERAÇÃO DE NÚMERO DE OS COM TRAVAMENTO ATÔMICO
CREATE OR REPLACE FUNCTION public.generate_service_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  next_number integer;
BEGIN
  -- Travamento atômico: SELECT FOR UPDATE evita race condition
  UPDATE public.venue_sequences
  SET current_order_number = current_order_number + 1,
      updated_at = now()
  WHERE venue_id = NEW.venue_id
  RETURNING current_order_number INTO next_number;
  
  -- Se não existe sequência para a venue, criar
  IF next_number IS NULL THEN
    INSERT INTO public.venue_sequences (venue_id, current_order_number)
    VALUES (NEW.venue_id, 1)
    ON CONFLICT (venue_id) DO UPDATE
    SET current_order_number = public.venue_sequences.current_order_number + 1,
        updated_at = now()
    RETURNING current_order_number INTO next_number;
  END IF;
  
  NEW.order_number := next_number;
  RETURN NEW;
END;
$function$;

-- 3. BLINDAR FUNÇÕES SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_venue_member(_user_id uuid, _venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_members
    WHERE user_id = _user_id
      AND venue_id = _venue_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_venue_admin(_user_id uuid, _venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_members
    WHERE user_id = _user_id
      AND venue_id = _venue_id
      AND role = 'admin'::app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'superadmin'
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_venue_with_admin(_name text, _address text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS venues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.venues (name, address, phone)
  VALUES (_name, _address, _phone)
  RETURNING * INTO v;

  INSERT INTO public.venue_members (venue_id, user_id, role)
  VALUES (v.id, auth.uid(), 'admin'::app_role);

  RETURN v;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_booking_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  items_sum DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.order_items
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);

  UPDATE public.bookings
  SET items_total = items_sum,
      grand_total = space_total + items_sum,
      updated_at = now()
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_service_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  items_sum DECIMAL(10, 2);
  order_record RECORD;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.service_order_items
  WHERE service_order_id = COALESCE(NEW.service_order_id, OLD.service_order_id);

  SELECT * INTO order_record
  FROM public.service_orders
  WHERE id = COALESCE(NEW.service_order_id, OLD.service_order_id);

  UPDATE public.service_orders
  SET 
    subtotal = items_sum,
    tax_amount = CASE 
      WHEN order_record.order_type = 'complete' THEN (items_sum - COALESCE(order_record.discount, 0)) * COALESCE(order_record.tax_rate, 0.05)
      ELSE 0 
    END,
    total = items_sum - COALESCE(order_record.discount, 0) + 
      CASE 
        WHEN order_record.order_type = 'complete' THEN (items_sum - COALESCE(order_record.discount, 0)) * COALESCE(order_record.tax_rate, 0.05)
        ELSE 0 
      END,
    updated_at = now()
  WHERE id = COALESCE(NEW.service_order_id, OLD.service_order_id);

  RETURN NEW;
END;
$function$;

-- 4. CRIAR ÍNDICES COMPOSTOS PARA OTIMIZAÇÃO DE QUERIES RLS
CREATE INDEX IF NOT EXISTS idx_venue_members_user_venue ON public.venue_members (user_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_start ON public.bookings (venue_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_venue_status ON public.bookings (venue_id, status);
CREATE INDEX IF NOT EXISTS idx_service_orders_venue_created ON public.service_orders (venue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_spaces_venue_active ON public.spaces (venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_venue ON public.customers (venue_id);
CREATE INDEX IF NOT EXISTS idx_products_venue_active ON public.products (venue_id, is_active);