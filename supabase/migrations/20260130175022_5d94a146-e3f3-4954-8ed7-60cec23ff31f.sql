-- Add dashboard_mode column to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS dashboard_mode text DEFAULT 'bookings';

-- Add constraint for valid values
ALTER TABLE public.venues 
DROP CONSTRAINT IF EXISTS venues_dashboard_mode_check;

ALTER TABLE public.venues 
ADD CONSTRAINT venues_dashboard_mode_check 
CHECK (dashboard_mode IN ('bookings', 'appointments', 'service_orders'));

-- Create function to set default dashboard_mode based on segment
CREATE OR REPLACE FUNCTION public.set_default_dashboard_mode()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if dashboard_mode is null or if segment changed
  IF NEW.dashboard_mode IS NULL OR (TG_OP = 'UPDATE' AND OLD.segment IS DISTINCT FROM NEW.segment AND OLD.dashboard_mode = NEW.dashboard_mode) THEN
    CASE NEW.segment
      WHEN 'sports' THEN NEW.dashboard_mode := 'bookings';
      WHEN 'beauty' THEN NEW.dashboard_mode := 'appointments';
      WHEN 'health' THEN NEW.dashboard_mode := 'appointments';
      ELSE NEW.dashboard_mode := 'service_orders';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new venues
DROP TRIGGER IF EXISTS set_dashboard_mode_trigger ON public.venues;
CREATE TRIGGER set_dashboard_mode_trigger
  BEFORE INSERT ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_dashboard_mode();

-- Update existing venues based on their segment
UPDATE public.venues 
SET dashboard_mode = CASE 
  WHEN segment = 'sports' THEN 'bookings'
  WHEN segment IN ('beauty', 'health') THEN 'appointments'
  ELSE 'service_orders'
END
WHERE dashboard_mode IS NULL OR dashboard_mode = 'bookings';