-- Criar bucket para logos das venues
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-logos',
  'venue-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Política para permitir upload por utilizadores autenticados
CREATE POLICY "Users can upload venue logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venue-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT v.id::text FROM venues v
    INNER JOIN venue_members vm ON vm.venue_id = v.id
    WHERE vm.user_id = auth.uid() AND vm.role IN ('admin', 'superadmin')
  )
);

-- Política para permitir atualização por admins
CREATE POLICY "Admins can update venue logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT v.id::text FROM venues v
    INNER JOIN venue_members vm ON vm.venue_id = v.id
    WHERE vm.user_id = auth.uid() AND vm.role IN ('admin', 'superadmin')
  )
);

-- Política para permitir exclusão por admins
CREATE POLICY "Admins can delete venue logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT v.id::text FROM venues v
    INNER JOIN venue_members vm ON vm.venue_id = v.id
    WHERE vm.user_id = auth.uid() AND vm.role IN ('admin', 'superadmin')
  )
);

-- Política para acesso público de leitura (logos são públicos)
CREATE POLICY "Public can view venue logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'venue-logos');
