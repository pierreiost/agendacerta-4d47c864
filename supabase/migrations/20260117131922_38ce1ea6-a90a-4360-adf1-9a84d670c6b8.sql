-- Create oauth_states table for secure state parameter storage
CREATE TABLE public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Only the service role can access this table (used by edge functions)
CREATE POLICY "Service role only" ON public.oauth_states
  FOR ALL USING (false);

-- Create index for faster lookups
CREATE INDEX idx_oauth_states_state ON public.oauth_states(state);

-- Create index for cleanup of expired states
CREATE INDEX idx_oauth_states_expires_at ON public.oauth_states(expires_at);

-- Fix the broken venues UPDATE policy with explicit table references
DROP POLICY IF EXISTS "Admins and managers can update venues" ON public.venues;

CREATE POLICY "Admins and managers can update venues" ON public.venues
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members
      WHERE venue_members.venue_id = venues.id
        AND venue_members.user_id = auth.uid()
        AND venue_members.role IN ('admin', 'manager')
    )
  );