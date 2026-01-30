-- Create enum for subscription status
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'overdue', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for plan type
DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('basic', 'max');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to venues table
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS status public.subscription_status DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS cnpj_cpf text,
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Migrate existing subscription_status text to new enum
-- First update the existing text values to match new enum
UPDATE public.venues 
SET status = CASE 
  WHEN subscription_status = 'trial' THEN 'trialing'::subscription_status
  WHEN subscription_status = 'active' THEN 'active'::subscription_status
  WHEN subscription_status = 'suspended' THEN 'suspended'::subscription_status
  WHEN subscription_status = 'cancelled' THEN 'suspended'::subscription_status
  WHEN subscription_status = 'overdue' THEN 'overdue'::subscription_status
  ELSE 'trialing'::subscription_status
END
WHERE status IS NULL OR status = 'trialing';

-- Update the create_venue_with_admin function to set trial period
CREATE OR REPLACE FUNCTION public.create_venue_with_admin(
  _name text, 
  _address text DEFAULT NULL, 
  _phone text DEFAULT NULL,
  _cnpj_cpf text DEFAULT NULL,
  _whatsapp text DEFAULT NULL
)
RETURNS venues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.venues (
    name, 
    address, 
    phone, 
    cnpj_cpf, 
    whatsapp, 
    status,
    trial_ends_at,
    subscription_status
  )
  VALUES (
    _name, 
    _address, 
    _phone, 
    _cnpj_cpf, 
    _whatsapp, 
    'trialing'::subscription_status,
    now() + interval '7 days',
    'trial'
  )
  RETURNING * INTO v;

  INSERT INTO public.venue_members (venue_id, user_id, role)
  VALUES (v.id, auth.uid(), 'admin'::app_role);

  RETURN v;
END;
$$;

-- Create function to check if venue access is blocked
CREATE OR REPLACE FUNCTION public.is_venue_blocked(_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN v.status = 'active' THEN false
      WHEN v.status = 'trialing' AND v.trial_ends_at > now() THEN false
      WHEN v.status = 'overdue' AND v.subscription_ends_at > now() THEN false
      ELSE true
    END
  FROM public.venues v
  WHERE v.id = _venue_id;
$$;

-- Create function to get days until expiration
CREATE OR REPLACE FUNCTION public.get_venue_days_until_expiration(_venue_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN v.status = 'active' THEN 
        EXTRACT(DAY FROM (v.subscription_ends_at - now()))::integer
      WHEN v.status = 'trialing' THEN 
        EXTRACT(DAY FROM (v.trial_ends_at - now()))::integer
      ELSE 0
    END
  FROM public.venues v
  WHERE v.id = _venue_id;
$$;