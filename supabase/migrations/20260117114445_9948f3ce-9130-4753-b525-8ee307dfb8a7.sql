-- Create table for Google Calendar OAuth tokens (per venue)
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id)
);

-- Add google_event_id to bookings for sync tracking
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Only venue admins can manage tokens
CREATE POLICY "Venue admins can view tokens"
ON public.google_calendar_tokens
FOR SELECT
USING (
  public.is_venue_admin(auth.uid(), venue_id)
);

CREATE POLICY "Venue admins can insert tokens"
ON public.google_calendar_tokens
FOR INSERT
WITH CHECK (
  public.is_venue_admin(auth.uid(), venue_id)
);

CREATE POLICY "Venue admins can update tokens"
ON public.google_calendar_tokens
FOR UPDATE
USING (
  public.is_venue_admin(auth.uid(), venue_id)
);

CREATE POLICY "Venue admins can delete tokens"
ON public.google_calendar_tokens
FOR DELETE
USING (
  public.is_venue_admin(auth.uid(), venue_id)
);

-- Create trigger for updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();