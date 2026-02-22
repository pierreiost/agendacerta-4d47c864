
-- Add lunch break columns to venue_operating_hours
ALTER TABLE public.venue_operating_hours
  ADD COLUMN lunch_start time without time zone DEFAULT NULL,
  ADD COLUMN lunch_end time without time zone DEFAULT NULL;
