
-- Fix trigger to fire on INSERT OR UPDATE OF segment
DROP TRIGGER IF EXISTS set_dashboard_mode_trigger ON venues;
CREATE TRIGGER set_dashboard_mode_trigger
  BEFORE INSERT OR UPDATE OF segment ON venues
  FOR EACH ROW
  EXECUTE FUNCTION set_default_dashboard_mode();

-- Fix existing venues with mismatched dashboard_mode
UPDATE venues SET dashboard_mode = 'appointments' WHERE segment IN ('beauty', 'health') AND dashboard_mode != 'appointments';
UPDATE venues SET dashboard_mode = 'service_orders' WHERE segment = 'custom' AND dashboard_mode != 'service_orders';
UPDATE venues SET dashboard_mode = 'bookings' WHERE segment = 'sports' AND dashboard_mode != 'bookings';
