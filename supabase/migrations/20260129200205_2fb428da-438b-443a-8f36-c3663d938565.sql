
-- Fix inquiry-photos bucket: add file size limit and allowed MIME types
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB per file
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ]
WHERE id = 'inquiry-photos';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can upload inquiry photos" ON storage.objects;

-- Create a more restrictive policy requiring venue_id folder structure
CREATE POLICY "Anyone can upload inquiry photos with restrictions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inquiry-photos'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
