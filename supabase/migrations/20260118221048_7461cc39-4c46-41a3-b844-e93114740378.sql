-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Members can view customers"
ON public.customers
FOR SELECT
USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage customers"
ON public.customers
FOR ALL
USING (is_venue_member(auth.uid(), venue_id));

-- Create trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_customers_venue_id ON public.customers(venue_id);
CREATE INDEX idx_customers_name ON public.customers(name);

-- Add customer_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;