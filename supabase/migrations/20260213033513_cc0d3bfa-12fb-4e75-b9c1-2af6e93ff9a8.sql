
-- =============================================
-- PRIORIDADE 1: Storage RLS para public-page-assets
-- =============================================

-- Policy de INSERT para usuários autenticados
CREATE POLICY "Authenticated users can upload to public-page-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'public-page-assets');

-- Policy de UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update public-page-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'public-page-assets');

-- =============================================
-- PRIORIDADE 2: Índices de performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_bookings_venue_type_status_date
ON bookings (venue_id, booking_type, status, start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_professional_start
ON bookings (professional_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_professional_services_member_service
ON professional_services (member_id, service_id);

CREATE INDEX IF NOT EXISTS idx_venue_members_venue_bookable
ON venue_members (venue_id, is_bookable);
