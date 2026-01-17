-- Create a secure view for bookings that hides PII from staff
CREATE OR REPLACE VIEW public.bookings_safe AS
SELECT 
  b.id,
  b.space_id,
  b.venue_id,
  b.start_time,
  b.end_time,
  b.status,
  b.notes,
  b.space_total,
  b.items_total,
  b.grand_total,
  b.google_event_id,
  b.reminder_sent,
  b.created_at,
  b.updated_at,
  b.created_by,
  -- Only show customer PII to admins and managers
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.user_id = auth.uid() 
        AND vm.venue_id = b.venue_id 
        AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_name
    ELSE 'Cliente'
  END as customer_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.user_id = auth.uid() 
        AND vm.venue_id = b.venue_id 
        AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_email
    ELSE NULL
  END as customer_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.venue_members vm 
      WHERE vm.user_id = auth.uid() 
        AND vm.venue_id = b.venue_id 
        AND vm.role IN ('admin', 'manager')
    ) THEN b.customer_phone
    ELSE NULL
  END as customer_phone
FROM public.bookings b
WHERE public.is_venue_member(auth.uid(), b.venue_id);

-- Grant access to the view
GRANT SELECT ON public.bookings_safe TO authenticated;