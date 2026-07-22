
-- Drop overly broad storage policies
DROP POLICY IF EXISTS "Authenticated users can upload to public-page-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update public-page-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload inquiry photos with restrictions" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view inquiry photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public page assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view venue logos" ON storage.objects;

-- Tightened INSERT for inquiry-photos: folder must be a real venue with public page enabled
CREATE POLICY "Public can upload inquiry photos to enabled venues"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'inquiry-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT v.id::text FROM public.venues v
    WHERE v.public_page_enabled = true
  )
);

-- Venue members can view their own inquiry photos (bucket becomes private)
CREATE POLICY "Venue members can view own inquiry photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'inquiry-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT vm.venue_id::text FROM public.venue_members vm
    WHERE vm.user_id = auth.uid()
  )
);

-- Venue members can delete their own inquiry photos
CREATE POLICY "Venue members can delete own inquiry photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inquiry-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT vm.venue_id::text FROM public.venue_members vm
    WHERE vm.user_id = auth.uid()
  )
);
