-- Create a security definer function to check if user is admin of a venue
CREATE OR REPLACE FUNCTION public.is_venue_admin(_user_id uuid, _venue_id uuid)
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
      AND role = 'admin'::app_role
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage venue members" ON public.venue_members;

-- Create new policy using the security definer function
CREATE POLICY "Admins can manage venue members"
ON public.venue_members
FOR ALL
TO authenticated
USING (is_venue_admin(auth.uid(), venue_id))
WITH CHECK (is_venue_admin(auth.uid(), venue_id));