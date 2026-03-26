
-- Add unique constraint for ON CONFLICT to work
ALTER TABLE public.professional_services
ADD CONSTRAINT professional_services_member_service_unique UNIQUE (member_id, service_id);

-- Function to auto-assign new services to all bookable venue members
CREATE OR REPLACE FUNCTION public.auto_assign_service_to_professionals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO professional_services (member_id, service_id)
  SELECT vm.id, NEW.id
  FROM venue_members vm
  WHERE vm.venue_id = NEW.venue_id
    AND vm.is_bookable = true
  ON CONFLICT (member_id, service_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger fires after every new service is inserted
CREATE TRIGGER trg_auto_assign_service
AFTER INSERT ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_service_to_professionals();
