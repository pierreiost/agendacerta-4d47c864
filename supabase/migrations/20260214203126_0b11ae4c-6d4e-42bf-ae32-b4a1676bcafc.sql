-- Allow public (anon) read access to venue_operating_hours
CREATE POLICY "Public can view operating hours"
ON public.venue_operating_hours
FOR SELECT
USING (true);