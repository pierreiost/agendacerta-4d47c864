-- Create function to check if user is superadmin (using text comparison for now)
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'superadmin'
  )
$$;

-- Create RLS policy for superadmins to view all venues
CREATE POLICY "Superadmins can view all venues"
ON public.venues
FOR SELECT
USING (is_superadmin(auth.uid()));

-- Create RLS policy for superadmins to update all venues
CREATE POLICY "Superadmins can update all venues"
ON public.venues
FOR UPDATE
USING (is_superadmin(auth.uid()));

-- Create RLS policy for superadmins to view all venue_members
CREATE POLICY "Superadmins can view all venue_members"
ON public.venue_members
FOR SELECT
USING (is_superadmin(auth.uid()));