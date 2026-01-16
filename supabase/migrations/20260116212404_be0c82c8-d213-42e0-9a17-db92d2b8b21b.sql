-- Add subscription columns to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS asaas_customer_id text,
ADD COLUMN IF NOT EXISTS asaas_subscription_id text,
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'basic';

-- Add comment for plan types
COMMENT ON COLUMN public.venues.plan_type IS 'Plan type: basic, pro, max (max includes Google Calendar integration)';