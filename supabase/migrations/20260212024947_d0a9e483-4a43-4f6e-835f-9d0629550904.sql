
-- Create os_custom_fields table
CREATE TABLE public.os_custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  display_order integer NOT NULL CHECK (display_order >= 1 AND display_order <= 5),
  content text NOT NULL CHECK (char_length(content) <= 2000),
  is_active boolean NOT NULL DEFAULT true,
  is_bold boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venue_id, display_order)
);

-- Enable RLS
ALTER TABLE public.os_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS: venue members can read
CREATE POLICY "Venue members can read custom fields"
ON public.os_custom_fields
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.venue_members
    WHERE venue_members.venue_id = os_custom_fields.venue_id
      AND venue_members.user_id = auth.uid()
  )
);

-- RLS: venue admins can insert
CREATE POLICY "Venue admins can insert custom fields"
ON public.os_custom_fields
FOR INSERT
WITH CHECK (
  public.is_venue_admin(auth.uid(), venue_id)
);

-- RLS: venue admins can update
CREATE POLICY "Venue admins can update custom fields"
ON public.os_custom_fields
FOR UPDATE
USING (
  public.is_venue_admin(auth.uid(), venue_id)
);

-- RLS: venue admins can delete
CREATE POLICY "Venue admins can delete custom fields"
ON public.os_custom_fields
FOR DELETE
USING (
  public.is_venue_admin(auth.uid(), venue_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_os_custom_fields_updated_at
BEFORE UPDATE ON public.os_custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger to limit max 5 fields per venue
CREATE OR REPLACE FUNCTION public.validate_os_custom_fields_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.os_custom_fields WHERE venue_id = NEW.venue_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 custom fields per venue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_os_custom_fields_limit
BEFORE INSERT ON public.os_custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.validate_os_custom_fields_limit();
