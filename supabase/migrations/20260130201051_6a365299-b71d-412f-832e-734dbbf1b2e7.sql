-- Fix search_path for set_default_dashboard_mode function to prevent search_path injection
CREATE OR REPLACE FUNCTION public.set_default_dashboard_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;