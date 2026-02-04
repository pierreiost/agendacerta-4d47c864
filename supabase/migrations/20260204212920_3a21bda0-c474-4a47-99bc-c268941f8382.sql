-- Add JSONB size validation trigger for venues table
-- This prevents oversized objects in public_settings and public_page_sections

CREATE OR REPLACE FUNCTION public.validate_venue_jsonb_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limit public_settings to 50KB
  IF NEW.public_settings IS NOT NULL AND pg_column_size(NEW.public_settings) > 51200 THEN
    RAISE EXCEPTION 'public_settings exceeds maximum size (50KB)';
  END IF;
  
  -- Limit public_page_sections to 100KB
  IF NEW.public_page_sections IS NOT NULL AND pg_column_size(NEW.public_page_sections) > 102400 THEN
    RAISE EXCEPTION 'public_page_sections exceeds maximum size (100KB)';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
CREATE TRIGGER validate_venue_jsonb_size_trigger
  BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_venue_jsonb_size();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_venue_jsonb_size() IS 'Validates that JSONB fields public_settings and public_page_sections do not exceed size limits (50KB and 100KB respectively)';