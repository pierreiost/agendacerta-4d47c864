-- Tornar o bucket público para visualização
UPDATE storage.buckets 
SET public = true 
WHERE id = 'venue-logos';

-- Política para permitir upload de logos pelos admins da venue
CREATE POLICY "Admins can upload venue logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'venue-logos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.venue_members vm
    WHERE vm.user_id = auth.uid()
    AND vm.venue_id::text = (storage.foldername(name))[1]
    AND vm.role IN ('admin', 'superadmin')
  )
);

-- Política para visualização pública dos logos
CREATE POLICY "Anyone can view venue logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'venue-logos');

-- Política para admins poderem atualizar/deletar logos
CREATE POLICY "Admins can update venue logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'venue-logos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.venue_members vm
    WHERE vm.user_id = auth.uid()
    AND vm.venue_id::text = (storage.foldername(name))[1]
    AND vm.role IN ('admin', 'superadmin')
  )
);

CREATE POLICY "Admins can delete venue logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'venue-logos' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.venue_members vm
    WHERE vm.user_id = auth.uid()
    AND vm.venue_id::text = (storage.foldername(name))[1]
    AND vm.role IN ('admin', 'superadmin')
  )
);