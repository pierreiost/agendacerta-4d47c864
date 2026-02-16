
-- 1. Add stock columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock integer,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un';

-- 2. Create stock_movements table (immutable Kardex ledger)
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  reason text NOT NULL CHECK (reason IN ('purchase', 'sale', 'loss', 'return', 'adjustment', 'initial')),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric,
  reference_id uuid,
  reference_type text,
  notes text,
  balance_after integer NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable RLS (immutable: SELECT only, INSERT via RPC)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (is_venue_member(auth.uid(), venue_id));

-- No INSERT/UPDATE/DELETE policies: all writes go through the RPC function

-- 4. Performance index
CREATE INDEX idx_stock_movements_product ON public.stock_movements(venue_id, product_id, created_at DESC);

-- 5. Atomic function for creating stock movements
CREATE OR REPLACE FUNCTION public.create_stock_movement(
  p_venue_id uuid,
  p_product_id uuid,
  p_type text,
  p_reason text,
  p_quantity integer,
  p_unit_cost numeric DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock integer;
  v_track_stock boolean;
  v_new_balance integer;
  v_movement_id uuid;
BEGIN
  -- Validate type
  IF p_type NOT IN ('IN', 'OUT', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid movement type: %', p_type;
  END IF;

  -- Validate reason
  IF p_reason NOT IN ('purchase', 'sale', 'loss', 'return', 'adjustment', 'initial') THEN
    RAISE EXCEPTION 'Invalid movement reason: %', p_reason;
  END IF;

  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Lock the product row and get current values
  SELECT stock_quantity, track_stock
  INTO v_current_stock, v_track_stock
  FROM products
  WHERE id = p_product_id AND venue_id = p_venue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Calculate new balance
  IF p_type = 'IN' THEN
    v_new_balance := v_current_stock + p_quantity;
  ELSIF p_type = 'OUT' THEN
    v_new_balance := v_current_stock - p_quantity;
  ELSIF p_type = 'ADJUSTMENT' THEN
    -- Adjustment sets absolute value: quantity is the new stock level
    v_new_balance := p_quantity;
  END IF;

  -- Validate negative stock (only if track_stock is enabled)
  IF v_track_stock AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente. Saldo atual: %, Saída solicitada: %', v_current_stock, p_quantity;
  END IF;

  -- Insert immutable movement record
  INSERT INTO stock_movements (
    venue_id, product_id, type, reason, quantity,
    unit_cost, reference_id, reference_type, notes,
    balance_after, created_by
  ) VALUES (
    p_venue_id, p_product_id, p_type, p_reason, p_quantity,
    p_unit_cost, p_reference_id, p_reference_type, p_notes,
    v_new_balance, COALESCE(p_user_id, auth.uid())
  )
  RETURNING id INTO v_movement_id;

  -- Update cached stock on product
  UPDATE products
  SET stock_quantity = v_new_balance, updated_at = now()
  WHERE id = p_product_id;

  RETURN json_build_object(
    'id', v_movement_id,
    'balance_after', v_new_balance
  );
END;
$$;
