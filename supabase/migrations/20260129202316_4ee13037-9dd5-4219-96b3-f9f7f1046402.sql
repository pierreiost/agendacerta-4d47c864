-- Add public_page_sections column to venues for customizable sections
-- This stores configuration for: hero, gallery, testimonials, stats, faq, map, hours, social

ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS public_page_sections JSONB DEFAULT '{
  "hero": {
    "enabled": true,
    "title": null,
    "subtitle": null,
    "background_image_url": null,
    "show_cta": true,
    "cta_text": "Agendar agora"
  },
  "gallery": {
    "enabled": false,
    "images": []
  },
  "testimonials": {
    "enabled": false,
    "items": []
  },
  "stats": {
    "enabled": false,
    "years_in_business": null,
    "customers_served": null,
    "bookings_completed": null,
    "custom_stats": []
  },
  "faq": {
    "enabled": false,
    "items": []
  },
  "location": {
    "enabled": false,
    "show_map": true,
    "address_line1": null,
    "address_line2": null,
    "google_maps_embed_url": null
  },
  "hours": {
    "enabled": false,
    "schedule": {
      "monday": { "open": "08:00", "close": "18:00", "closed": false },
      "tuesday": { "open": "08:00", "close": "18:00", "closed": false },
      "wednesday": { "open": "08:00", "close": "18:00", "closed": false },
      "thursday": { "open": "08:00", "close": "18:00", "closed": false },
      "friday": { "open": "08:00", "close": "18:00", "closed": false },
      "saturday": { "open": "09:00", "close": "14:00", "closed": false },
      "sunday": { "open": null, "close": null, "closed": true }
    }
  },
  "social": {
    "enabled": false,
    "whatsapp": null,
    "instagram": null,
    "facebook": null,
    "phone": null,
    "email": null
  }
}'::jsonb;

-- Create storage bucket for public page images (gallery, hero backgrounds)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-page-assets',
  'public-page-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for public-page-assets bucket
CREATE POLICY "Anyone can view public page assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-page-assets');

CREATE POLICY "Venue members can upload public page assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-page-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.venues 
      WHERE id IN (
        SELECT venue_id FROM public.venue_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Venue members can update public page assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'public-page-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.venues 
      WHERE id IN (
        SELECT venue_id FROM public.venue_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Venue members can delete public page assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public-page-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.venues 
      WHERE id IN (
        SELECT venue_id FROM public.venue_members 
        WHERE user_id = auth.uid()
      )
    )
  );