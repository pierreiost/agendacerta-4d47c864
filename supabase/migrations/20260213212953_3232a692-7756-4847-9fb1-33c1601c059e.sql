
-- Create venue_notifications table
CREATE TABLE public.venue_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'NEW_BOOKING',
  title text NOT NULL,
  message text NOT NULL,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: venue members can read notifications
CREATE POLICY "Members can view venue notifications"
  ON public.venue_notifications
  FOR SELECT
  USING (is_venue_member(auth.uid(), venue_id));

-- RLS: venue members can update (mark as read)
CREATE POLICY "Members can update venue notifications"
  ON public.venue_notifications
  FOR UPDATE
  USING (is_venue_member(auth.uid(), venue_id));

-- RLS: system inserts via trigger (no direct user insert needed, but allow for admins)
CREATE POLICY "Members can insert venue notifications"
  ON public.venue_notifications
  FOR INSERT
  WITH CHECK (is_venue_member(auth.uid(), venue_id));

-- RLS: admins can delete notifications
CREATE POLICY "Members can delete venue notifications"
  ON public.venue_notifications
  FOR DELETE
  USING (is_venue_member(auth.uid(), venue_id));

-- Index for fast lookups
CREATE INDEX idx_venue_notifications_venue_unread
  ON public.venue_notifications(venue_id, is_read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_notifications;

-- Trigger function: auto-create notification on PENDING booking insert
CREATE OR REPLACE FUNCTION public.notify_new_pending_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'PENDING' THEN
    INSERT INTO public.venue_notifications (venue_id, type, title, message, reference_id)
    VALUES (
      NEW.venue_id,
      'NEW_BOOKING',
      'Novo Agendamento',
      'Cliente ' || NEW.customer_name || ' solicitou horário em ' || to_char(NEW.start_time AT TIME ZONE 'America/Sao_Paulo', 'DD/MM às HH24:MI'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to bookings table
CREATE TRIGGER trg_notify_pending_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_pending_booking();
