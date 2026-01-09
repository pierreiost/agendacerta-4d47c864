-- Create a safe helper to create a venue + first admin membership in one transaction
CREATE OR REPLACE FUNCTION public.create_venue_with_admin(
  _name text,
  _address text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS public.venues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.venues (name, address, phone)
  VALUES (_name, _address, _phone)
  RETURNING * INTO v;

  INSERT INTO public.venue_members (venue_id, user_id, role)
  VALUES (v.id, auth.uid(), 'admin'::app_role);

  RETURN v;
END;
$$;