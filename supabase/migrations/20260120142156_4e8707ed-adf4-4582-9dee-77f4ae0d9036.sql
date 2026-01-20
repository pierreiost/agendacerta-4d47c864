-- Fix #1: Add RLS policy to bookings_safe view
-- The view needs to inherit RLS from the base bookings table
-- Views with security_invoker=on will use the calling user's permissions

-- First, drop and recreate the view with security_invoker=on to inherit RLS
DROP VIEW IF EXISTS public.bookings_safe;

-- Recreate the view with security_invoker=on 
-- This view shows customer info only to admin/manager roles, otherwise masks it
CREATE VIEW public.bookings_safe
WITH (security_invoker = on)
AS
SELECT 
  b.id,
  b.venue_id,
  b.space_id,
  b.start_time,
  b.end_time,
  b.status,
  b.notes,
  b.google_event_id,
  b.grand_total,
  b.space_total,
  b.items_total,
  b.reminder_sent,
  b.created_at,
  b.updated_at,
  b.created_by,
  -- Only show PII to admin/manager roles
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.venue_id = b.venue_id 
      AND vm.user_id = auth.uid() 
      AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_name
    ELSE 'Cliente'
  END AS customer_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.venue_id = b.venue_id 
      AND vm.user_id = auth.uid() 
      AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_email
    ELSE NULL
  END AS customer_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.venue_id = b.venue_id 
      AND vm.user_id = auth.uid() 
      AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_phone
    ELSE NULL
  END AS customer_phone
FROM public.bookings b;