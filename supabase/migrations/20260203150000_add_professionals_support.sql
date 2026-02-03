-- Migration: Add professionals support
-- This adds the professionals table and professional_id to bookings

-- 1. Create professionals table
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  specialties TEXT[], -- Array de especialidades
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  work_schedule JSONB, -- Horários de trabalho por dia da semana
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add professional_id to bookings (nullable - bookings can be space-only or professional-only)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL;

-- 3. Make space_id nullable (for professional-only bookings)
ALTER TABLE public.bookings
ALTER COLUMN space_id DROP NOT NULL;

-- 4. Add constraint: booking must have either space_id OR professional_id (or both)
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_must_have_space_or_professional
CHECK (space_id IS NOT NULL OR professional_id IS NOT NULL);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_professionals_venue_id ON public.professionals(venue_id);
CREATE INDEX IF NOT EXISTS idx_professionals_is_active ON public.professionals(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_professional_id ON public.bookings(professional_id);

-- 6. Enable RLS on professionals
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for professionals
-- Select: venue members can see their venue's professionals
CREATE POLICY "Venue members can view professionals"
  ON public.professionals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members vm
      WHERE vm.venue_id = professionals.venue_id
      AND vm.user_id = auth.uid()
    )
  );

-- Insert: admins/managers can create professionals
CREATE POLICY "Admins can create professionals"
  ON public.professionals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_members vm
      WHERE vm.venue_id = professionals.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Update: admins/managers can update professionals
CREATE POLICY "Admins can update professionals"
  ON public.professionals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members vm
      WHERE vm.venue_id = professionals.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Delete: admins can delete professionals
CREATE POLICY "Admins can delete professionals"
  ON public.professionals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members vm
      WHERE vm.venue_id = professionals.venue_id
      AND vm.user_id = auth.uid()
      AND vm.role IN ('admin', 'superadmin')
    )
  );

-- 8. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_professionals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_professionals_updated_at ON public.professionals;
CREATE TRIGGER trigger_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_professionals_updated_at();

-- 9. Function to get professionals by venue (public, for booking widget)
CREATE OR REPLACE FUNCTION public.get_public_professionals_by_venue(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  specialties TEXT[],
  bio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify venue has public page enabled and plan_type = 'max'
  IF NOT EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = p_venue_id
    AND venues.public_page_enabled = true
    AND venues.plan_type = 'max'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.avatar_url,
    p.specialties,
    p.bio
  FROM public.professionals p
  WHERE p.venue_id = p_venue_id
  AND p.is_active = true
  ORDER BY p.name;
END;
$$;

-- 10. Function to get professional bookings for a date (public, for booking widget)
CREATE OR REPLACE FUNCTION public.get_professional_bookings_for_date(
  p_venue_id UUID,
  p_professional_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify venue has public page enabled
  IF NOT EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = p_venue_id
    AND venues.public_page_enabled = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.start_time, b.end_time
  FROM public.bookings b
  WHERE b.venue_id = p_venue_id
  AND b.professional_id = p_professional_id
  AND b.start_time >= p_date::TIMESTAMPTZ
  AND b.start_time < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
  AND b.status != 'CANCELLED';
END;
$$;

-- 11. Grant execute to anon for public functions
GRANT EXECUTE ON FUNCTION public.get_public_professionals_by_venue(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_professional_bookings_for_date(UUID, UUID, DATE) TO anon;
