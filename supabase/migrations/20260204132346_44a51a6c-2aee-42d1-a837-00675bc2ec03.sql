-- Add RLS policies for login_attempts table
-- This table should only be accessible by edge functions (via service role) and superadmins

-- Drop any existing policies first
DROP POLICY IF EXISTS "Service role only" ON public.login_attempts;
DROP POLICY IF EXISTS "Superadmins can view login attempts" ON public.login_attempts;

-- Create restrictive policies - only superadmins can view login attempts
-- Edge functions use service role key which bypasses RLS
CREATE POLICY "Superadmins can view login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (public.is_superadmin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- These operations are handled by database functions with SECURITY DEFINER
-- which are called from edge functions using service role