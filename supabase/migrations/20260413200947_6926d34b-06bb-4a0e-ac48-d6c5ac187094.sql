
-- Create warranty_templates table
CREATE TABLE public.warranty_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (venue_id)
);

-- Enable RLS
ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;

-- Members can view
CREATE POLICY "Members can view warranty templates"
ON public.warranty_templates
FOR SELECT
TO authenticated
USING (is_venue_member(auth.uid(), venue_id));

-- Admins can insert
CREATE POLICY "Admins can insert warranty templates"
ON public.warranty_templates
FOR INSERT
TO authenticated
WITH CHECK (is_venue_admin(auth.uid(), venue_id));

-- Admins can update
CREATE POLICY "Admins can update warranty templates"
ON public.warranty_templates
FOR UPDATE
TO authenticated
USING (is_venue_admin(auth.uid(), venue_id));

-- Trigger for updated_at
CREATE TRIGGER update_warranty_templates_updated_at
BEFORE UPDATE ON public.warranty_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
