
-- 1. Add device_model column to service_inquiries
ALTER TABLE public.service_inquiries ADD COLUMN device_model TEXT;

-- 2. Replace create_service_inquiry RPC to accept device_model and allow custom segment
CREATE OR REPLACE FUNCTION public.create_service_inquiry(
  p_venue_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text DEFAULT NULL,
  p_problem_description text DEFAULT NULL,
  p_photo_urls text[] DEFAULT '{}'::text[],
  p_device_model text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venue RECORD;
  v_inquiry_id UUID;
BEGIN
  SELECT id, public_page_enabled, booking_mode, segment INTO v_venue FROM venues WHERE id = p_venue_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;
  IF NOT v_venue.public_page_enabled THEN RAISE EXCEPTION 'Página pública não está ativa'; END IF;
  -- Allow if booking_mode is 'inquiry' OR segment is 'custom'
  IF v_venue.booking_mode != 'inquiry' AND v_venue.segment != 'custom' THEN
    RAISE EXCEPTION 'Não aceita solicitações';
  END IF;
  IF p_customer_name IS NULL OR p_customer_name = '' THEN RAISE EXCEPTION 'Nome obrigatório'; END IF;
  IF p_customer_email IS NULL OR p_customer_email = '' THEN RAISE EXCEPTION 'Email obrigatório'; END IF;

  INSERT INTO service_inquiries (venue_id, customer_name, customer_email, customer_phone, problem_description, photo_urls, device_model, status)
  VALUES (p_venue_id, p_customer_name, p_customer_email, p_customer_phone, COALESCE(p_problem_description, ''), COALESCE(p_photo_urls, '{}'), p_device_model, 'pending')
  RETURNING id INTO v_inquiry_id;

  RETURN v_inquiry_id;
END;
$$;

-- 3. Create notification trigger for service_inquiries
CREATE OR REPLACE FUNCTION public.notify_new_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.venue_notifications (venue_id, type, title, message, reference_id)
  VALUES (
    NEW.venue_id,
    'NEW_INQUIRY',
    'Nova Solicitação de Orçamento',
    'Cliente ' || NEW.customer_name || ' solicitou orçamento para ' || COALESCE(NEW.device_model, 'equipamento'),
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_inquiry
AFTER INSERT ON public.service_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_inquiry();
