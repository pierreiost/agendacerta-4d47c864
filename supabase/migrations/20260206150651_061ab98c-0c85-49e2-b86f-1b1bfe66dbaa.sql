
-- Create health_records table for health segment medical records
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  weight_kg NUMERIC,
  height_cm NUMERIC,
  bmi NUMERIC GENERATED ALWAYS AS (
    CASE WHEN height_cm > 0 AND weight_kg > 0 
      THEN ROUND(weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)), 1)
      ELSE NULL 
    END
  ) STORED,
  blood_pressure TEXT,
  allergies TEXT,
  medications TEXT,
  chief_complaint TEXT,
  clinical_notes TEXT,
  blood_type TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast customer history lookups
CREATE INDEX idx_health_records_customer ON public.health_records(customer_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS policies - same pattern as customers table
CREATE POLICY "Members can view health records"
ON public.health_records FOR SELECT
USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage health records"
ON public.health_records FOR ALL
USING (is_venue_member(auth.uid(), venue_id));
