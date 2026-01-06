-- Fix security warnings

-- 1. Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Fix function search path for calculate_booking_totals
CREATE OR REPLACE FUNCTION public.calculate_booking_totals()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Fix overly permissive venue insert policy
DROP POLICY IF EXISTS "Admins and managers can insert venues" ON public.venues;

CREATE POLICY "Authenticated users can create venues"
  ON public.venues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);