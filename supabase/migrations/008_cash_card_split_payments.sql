-- Add split payment support for sales (Cash+Card)

-- 1) Extend enum with mixed payment option
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'PayHere';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Online Transfer';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'MintPay';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Cash+Card';

-- 2) Track split amounts at sale level
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS card_amount NUMERIC(12,2);

-- Backfill existing rows so reports can safely read these columns
UPDATE sales
SET cash_amount = CASE
  WHEN payment_method::text = 'Cash' THEN total_amount
  WHEN payment_method::text = 'Cash+Card' THEN COALESCE(cash_amount, 0)
  ELSE 0
END,
card_amount = CASE
  WHEN payment_method::text = 'Cash+Card' THEN COALESCE(card_amount, 0)
  WHEN payment_method::text = 'Cash' THEN 0
  ELSE total_amount
END
WHERE cash_amount IS NULL OR card_amount IS NULL;

-- 3) Add RPC overload with split fields (non-destructive)

CREATE OR REPLACE FUNCTION fn_complete_sale(
  p_invoice_number TEXT,
  p_date TIMESTAMPTZ,
  p_subtotal NUMERIC,
  p_discount NUMERIC,
  p_tax NUMERIC,
  p_total_amount NUMERIC,
  p_total_cost NUMERIC,
  p_payment_method payment_method,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_branch_id UUID,
  p_branch_name TEXT,
  p_items JSONB,
  p_cash_amount NUMERIC DEFAULT NULL,
  p_card_amount NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
BEGIN
  IF p_payment_method::text = 'Cash+Card' THEN
    IF COALESCE(p_cash_amount, 0) < 0 OR COALESCE(p_card_amount, 0) < 0 THEN
      RAISE EXCEPTION 'Cash/Card split amounts cannot be negative';
    END IF;

    IF ABS((COALESCE(p_cash_amount, 0) + COALESCE(p_card_amount, 0)) - COALESCE(p_total_amount, 0)) > 0.01 THEN
      RAISE EXCEPTION 'Cash/Card split total (cash + card) must equal total amount';
    END IF;
  END IF;

  INSERT INTO sales (
    invoice_number,
    date,
    subtotal,
    discount,
    tax,
    total_amount,
    total_cost,
    payment_method,
    customer_id,
    customer_name,
    branch_id,
    branch_name,
    cash_amount,
    card_amount
  ) VALUES (
    p_invoice_number,
    p_date,
    p_subtotal,
    p_discount,
    p_tax,
    p_total_amount,
    p_total_cost,
    p_payment_method,
    p_customer_id,
    p_customer_name,
    p_branch_id,
    p_branch_name,
    CASE
      WHEN p_payment_method::text = 'Cash+Card' THEN COALESCE(p_cash_amount, 0)
      WHEN p_payment_method::text = 'Cash' THEN p_total_amount
      ELSE 0
    END,
    CASE
      WHEN p_payment_method::text = 'Cash+Card' THEN COALESCE(p_card_amount, 0)
      WHEN p_payment_method::text = 'Cash' THEN 0
      ELSE p_total_amount
    END
  ) RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost_price, discount)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INT,
      (v_item->>'price')::NUMERIC,
      (v_item->>'cost_price')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    UPDATE product_branch_stock
    SET quantity = GREATEST(0, quantity - (v_item->>'quantity')::INT)
    WHERE product_id = (v_item->>'product_id')::UUID
      AND branch_id = p_branch_id;

    INSERT INTO stock_movements (product_id, product_name, branch_id, branch_name, type, quantity, reason, date)
    VALUES (
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      p_branch_id,
      p_branch_name,
      'OUT',
      (v_item->>'quantity')::INT,
      'Sale #' || p_invoice_number,
      p_date
    );
  END LOOP;

  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_spent = total_spent + p_total_amount,
        loyalty_points = loyalty_points + FLOOR(p_total_amount / 10)::INT
    WHERE id = p_customer_id;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- 4) Refresh PostgREST schema cache so the new RPC signature is discoverable immediately.
NOTIFY pgrst, 'reload schema';
