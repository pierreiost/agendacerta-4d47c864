-- =====================================================
-- AGENDA CERTA - Database Schema
-- =====================================================

-- 1. Create ENUM types
CREATE TYPE public.booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FINALIZED');
CREATE TYPE public.payment_method AS ENUM ('CASH', 'CREDIT', 'DEBIT', 'PIX');
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- 2. Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. User roles table (for role-based access control)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Venues (unidades/estabelecimentos)
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  reminder_hours_before INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Venue members (associação usuário-venue)
CREATE TABLE public.venue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (venue_id, user_id)
);

-- 6. Categories (categorias de espaços)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Spaces (espaços para reserva)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 1,
  price_per_hour DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Bookings (reservas)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status booking_status DEFAULT 'PENDING' NOT NULL,
  notes TEXT,
  space_total DECIMAL(10, 2) DEFAULT 0,
  items_total DECIMAL(10, 2) DEFAULT 0,
  grand_total DECIMAL(10, 2) DEFAULT 0,
  reminder_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 9. Product categories
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 10. Products (produtos/serviços para comanda)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 11. Order items (itens da comanda)
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 12. Payments (pagamentos)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  method payment_method NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is member of venue
CREATE OR REPLACE FUNCTION public.is_venue_member(_user_id UUID, _venue_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.venue_members
    WHERE user_id = _user_id
      AND venue_id = _venue_id
  )
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate booking totals
CREATE OR REPLACE FUNCTION public.calculate_booking_totals()
RETURNS TRIGGER AS $$
DECLARE
  items_sum DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO items_sum
  FROM public.order_items
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);

  UPDATE public.bookings
  SET items_total = items_sum,
      grand_total = space_total + items_sum,
      updated_at = now()
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Calculate totals trigger
CREATE TRIGGER calculate_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_booking_totals();

-- Create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Venues policies
CREATE POLICY "Users can view venues they are members of"
  ON public.venues FOR SELECT
  USING (public.is_venue_member(auth.uid(), id));

CREATE POLICY "Admins and managers can insert venues"
  ON public.venues FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins and managers can update venues"
  ON public.venues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members
      WHERE venue_id = id
        AND user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

-- Venue members policies
CREATE POLICY "Members can view venue members"
  ON public.venue_members FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Admins can manage venue members"
  ON public.venue_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_members vm
      WHERE vm.venue_id = venue_id
        AND vm.user_id = auth.uid()
        AND vm.role = 'admin'
    )
  );

CREATE POLICY "Users can insert themselves as members"
  ON public.venue_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Members can view categories"
  ON public.categories FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage categories"
  ON public.categories FOR ALL
  USING (public.is_venue_member(auth.uid(), venue_id));

-- Spaces policies
CREATE POLICY "Members can view spaces"
  ON public.spaces FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage spaces"
  ON public.spaces FOR ALL
  USING (public.is_venue_member(auth.uid(), venue_id));

-- Bookings policies
CREATE POLICY "Members can view bookings"
  ON public.bookings FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage bookings"
  ON public.bookings FOR ALL
  USING (public.is_venue_member(auth.uid(), venue_id));

-- Product categories policies
CREATE POLICY "Members can view product categories"
  ON public.product_categories FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage product categories"
  ON public.product_categories FOR ALL
  USING (public.is_venue_member(auth.uid(), venue_id));

-- Products policies
CREATE POLICY "Members can view products"
  ON public.products FOR SELECT
  USING (public.is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Members can manage products"
  ON public.products FOR ALL
  USING (public.is_venue_member(auth.uid(), venue_id));

-- Order items policies
CREATE POLICY "Members can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND public.is_venue_member(auth.uid(), b.venue_id)
    )
  );

CREATE POLICY "Members can manage order items"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND public.is_venue_member(auth.uid(), b.venue_id)
    )
  );

-- Payments policies
CREATE POLICY "Members can view payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND public.is_venue_member(auth.uid(), b.venue_id)
    )
  );

CREATE POLICY "Members can manage payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND public.is_venue_member(auth.uid(), b.venue_id)
    )
  );