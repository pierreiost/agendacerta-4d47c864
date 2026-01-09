-- Ensure is_venue_member is SECURITY DEFINER to avoid RLS recursion when used inside policies
CREATE OR REPLACE FUNCTION public.is_venue_member(_user_id uuid, _venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_members
    WHERE user_id = _user_id
      AND venue_id = _venue_id
  )
$$;