
-- 1. Create quote_status enum
CREATE TYPE public.quote_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  quote_number integer NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'pending',
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  customer_document text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_city text,
  customer_state text DEFAULT 'RS',
  customer_zip_code text,
  description text NOT NULL DEFAULT '',
  notes text,
  device_model text,
  photo_urls text[] DEFAULT '{}',
  inquiry_id uuid,
  service_order_id uuid,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0.05,
  tax_amount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create quote_items table
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  service_code text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Add current_quote_number to venue_sequences
ALTER TABLE public.venue_sequences ADD COLUMN current_quote_number integer NOT NULL DEFAULT 0;

-- 5. Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for quotes
CREATE POLICY "Members can view quotes" ON public.quotes FOR SELECT USING (is_venue_member(auth.uid(), venue_id));
CREATE POLICY "Members can manage quotes" ON public.quotes FOR ALL USING (is_venue_member(auth.uid(), venue_id));

-- 7. RLS policies for quote_items (via join)
CREATE POLICY "Members can view quote items" ON public.quote_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND is_venue_member(auth.uid(), q.venue_id))
);
CREATE POLICY "Members can manage quote items" ON public.quote_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND is_venue_member(auth.uid(), q.venue_id))
);

-- 8. Trigger: generate_quote_number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  next_number integer;
BEGIN
  UPDATE public.venue_sequences
  SET current_quote_number = current_quote_number + 1,
      updated_at = now()
  WHERE venue_id = NEW.venue_id
  RETURNING current_quote_number INTO next_number;

  IF next_number IS NULL THEN
    INSERT INTO public.venue_sequences (venue_id, current_quote_number)
    VALUES (NEW.venue_id, 1)
    ON CONFLICT (venue_id) DO UPDATE
    SET current_quote_number = public.venue_sequences.current_quote_number + 1,
        updated_at = now()
    RETURNING current_quote_number INTO next_number;
  END IF;

  NEW.quote_number := next_number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_quote_number();

-- 9. Trigger: calculate_quote_totals
CREATE OR REPLACE FUNCTION public.calculate_quote_totals()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  items_sum DECIMAL(10, 2);
  quote_record RECORD;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.quote_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  UPDATE public.quotes
  SET
    subtotal = items_sum,
    tax_amount = (items_sum - COALESCE(quote_record.discount, 0)) * COALESCE(quote_record.tax_rate, 0.05),
    total = items_sum - COALESCE(quote_record.discount, 0) +
      (items_sum - COALESCE(quote_record.discount, 0)) * COALESCE(quote_record.tax_rate, 0.05),
    updated_at = now()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_quote_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_quote_totals();

-- 10. Updated_at trigger for quotes
CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Trigger: auto-create quote from service_inquiry
CREATE OR REPLACE FUNCTION public.auto_create_quote_from_inquiry()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_venue RECORD;
BEGIN
  SELECT segment INTO v_venue FROM public.venues WHERE id = NEW.venue_id;

  IF v_venue.segment = 'custom' THEN
    INSERT INTO public.quotes (
      venue_id, customer_name, customer_email, customer_phone,
      description, device_model, photo_urls, inquiry_id, status
    ) VALUES (
      NEW.venue_id, NEW.customer_name, NEW.customer_email, NEW.customer_phone,
      COALESCE(NEW.problem_description, ''), NEW.device_model, COALESCE(NEW.photo_urls, '{}'),
      NEW.id, 'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_quote_from_inquiry
  AFTER INSERT ON public.service_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_quote_from_inquiry();

-- 12. Migrate existing inquiries to quotes
INSERT INTO public.quotes (venue_id, customer_name, customer_email, customer_phone, description, device_model, photo_urls, inquiry_id, status)
SELECT
  si.venue_id,
  si.customer_name,
  si.customer_email,
  si.customer_phone,
  COALESCE(si.problem_description, ''),
  si.device_model,
  COALESCE(si.photo_urls, '{}'),
  si.id,
  'pending'::public.quote_status
FROM public.service_inquiries si
JOIN public.venues v ON v.id = si.venue_id
WHERE v.segment = 'custom'
  AND si.status = 'pending'
  AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.inquiry_id = si.id);
