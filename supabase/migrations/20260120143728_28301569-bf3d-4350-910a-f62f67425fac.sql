-- Enum para tipo de OS
CREATE TYPE public.service_order_type AS ENUM ('simple', 'complete');

-- Enum para status de OS simples
CREATE TYPE public.service_order_status_simple AS ENUM ('open', 'finished', 'invoiced');

-- Enum para status de OS completa
CREATE TYPE public.service_order_status_complete AS ENUM ('draft', 'approved', 'in_progress', 'finished', 'invoiced', 'cancelled');

-- Tabela principal de Ordens de Serviço
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Tipo e status
  order_type service_order_type NOT NULL DEFAULT 'simple',
  status_simple service_order_status_simple DEFAULT 'open',
  status_complete service_order_status_complete DEFAULT NULL,
  
  -- Número sequencial da OS por venue
  order_number INTEGER NOT NULL,
  
  -- Dados do cliente (snapshot ou manual)
  customer_name TEXT NOT NULL,
  customer_document TEXT, -- CPF ou CNPJ
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_state TEXT DEFAULT 'RS',
  customer_zip_code TEXT,
  
  -- Descrição e observações
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Valores
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0.05, -- ISS padrão 5% Pelotas
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Datas
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  
  -- NFS-e fields (para futura integração)
  nfse_number TEXT,
  nfse_verification_code TEXT,
  nfse_issued_at TIMESTAMP WITH TIME ZONE,
  nfse_pdf_url TEXT,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens/serviços da OS
CREATE TABLE public.service_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  
  -- Código do serviço municipal (para NFS-e)
  service_code TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para busca por venue e número
CREATE INDEX idx_service_orders_venue ON public.service_orders(venue_id);
CREATE INDEX idx_service_orders_number ON public.service_orders(venue_id, order_number);
CREATE INDEX idx_service_orders_customer ON public.service_orders(customer_id);
CREATE INDEX idx_service_orders_booking ON public.service_orders(booking_id);

-- Unique constraint para número por venue
ALTER TABLE public.service_orders ADD CONSTRAINT unique_order_number_per_venue UNIQUE (venue_id, order_number);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número sequencial da OS
CREATE OR REPLACE FUNCTION public.generate_service_order_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number
  FROM public.service_orders
  WHERE venue_id = NEW.venue_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_order_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_service_order_number();

-- Função para calcular totais
CREATE OR REPLACE FUNCTION public.calculate_service_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  items_sum DECIMAL(10, 2);
  order_record RECORD;
BEGIN
  -- Buscar soma dos itens
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.service_order_items
  WHERE service_order_id = COALESCE(NEW.service_order_id, OLD.service_order_id);

  -- Buscar dados da OS para calcular impostos
  SELECT * INTO order_record
  FROM public.service_orders
  WHERE id = COALESCE(NEW.service_order_id, OLD.service_order_id);

  -- Atualizar totais
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
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calculate_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.service_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_service_order_totals();

-- Enable RLS
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies para service_orders
CREATE POLICY "Members can view service orders"
  ON public.service_orders
  FOR SELECT
  USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage service orders"
  ON public.service_orders
  FOR ALL
  USING (is_venue_member(auth.uid(), venue_id));

-- RLS Policies para service_order_items
CREATE POLICY "Members can view service order items"
  ON public.service_order_items
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_items.service_order_id
    AND is_venue_member(auth.uid(), so.venue_id)
  ));

CREATE POLICY "Members can manage service order items"
  ON public.service_order_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_items.service_order_id
    AND is_venue_member(auth.uid(), so.venue_id)
  ));