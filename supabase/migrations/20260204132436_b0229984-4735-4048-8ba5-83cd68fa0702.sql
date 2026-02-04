-- Update bookings RLS policies to explicitly target authenticated role only
-- This makes the security intent clearer and prevents any potential bypass

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members can manage bookings" ON public.bookings;

-- Recreate with explicit authenticated role targeting
CREATE POLICY "Members can view bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can insert bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_venue_member(auth.uid(), venue_id))
WITH CHECK (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can delete bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_venue_member(auth.uid(), venue_id));