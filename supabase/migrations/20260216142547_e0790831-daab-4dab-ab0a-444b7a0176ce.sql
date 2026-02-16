
-- Add setting to venues to allow negative stock
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS allow_negative_stock boolean NOT NULL DEFAULT false;

-- Recreate the RPC to conditionally allow negative stock based on venue setting
CREATE OR REPLACE FUNCTION public.create_stock_movement(
  p_venue_id uuid,
  p_product_id uuid,
  p_type text,
  p_reason text,
  p_quantity integer,
  p_unit_cost numeric DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock integer;
  v_new_balance integer;
  v_movement_id uuid;
  v_allow_negative boolean;
BEGIN
  -- Lock the product row
  SELECT stock_quantity INTO v_current_stock
  FROM products
  WHERE id = p_product_id AND venue_id = p_venue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  -- Check venue setting for negative stock
  SELECT COALESCE(allow_negative_stock, false) INTO v_allow_negative
  FROM venues
  WHERE id = p_venue_id;

  -- Calculate new balance
  IF p_type = 'IN' THEN
    v_new_balance := v_current_stock + p_quantity;
  ELSIF p_type = 'OUT' THEN
    v_new_balance := v_current_stock - p_quantity;
  ELSIF p_type = 'ADJUSTMENT' THEN
    v_new_balance := p_quantity;
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido: %', p_type;
  END IF;

  -- Only block negative if venue does NOT allow it
  IF v_new_balance < 0 AND NOT v_allow_negative THEN
    RAISE EXCEPTION 'Estoque insuficiente. Saldo atual: %, Solicitado: %', v_current_stock, p_quantity;
  END IF;

  -- Insert the movement record
  INSERT INTO stock_movements (venue_id, product_id, type, reason, quantity, unit_cost, reference_id, reference_type, notes, balance_after, created_by)
  VALUES (p_venue_id, p_product_id, p_type, p_reason, p_quantity, p_unit_cost, p_reference_id, p_reference_type, p_notes, v_new_balance, p_user_id)
  RETURNING id INTO v_movement_id;

  -- Update the product stock cache
  UPDATE products SET stock_quantity = v_new_balance, updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('id', v_movement_id, 'balance_after', v_new_balance);
END;
$$;
