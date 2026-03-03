-- ============================================================
-- Migration 004: Add barcode fields, per-item discount, and payment methods
-- Run this in the Supabase SQL Editor AFTER 003_stock_transfers.sql
-- ============================================================

-- ========================
-- 1. Add barcode columns to products table
-- ========================
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode2 TEXT NOT NULL DEFAULT '';

-- ========================
-- 2. Add discount column to sale_items table (per-item discount)
-- ========================
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ========================
-- 3. Add payment_method column to expenses table
-- ========================
-- First, add the column as nullable to handle existing rows
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method payment_method;
-- Set default value for existing rows
UPDATE expenses SET payment_method = 'Cash' WHERE payment_method IS NULL;
-- Now make it NOT NULL with default
ALTER TABLE expenses ALTER COLUMN payment_method SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN payment_method SET DEFAULT 'Cash';

-- ========================
-- 4. Update payment_method enum to include new payment options
-- ========================
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'PayHere';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Online Transfer';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'MintPay';

-- ========================
-- 3. Drop and recreate the products view to include barcode columns
-- ========================
DROP VIEW IF EXISTS v_products_with_stock;
CREATE VIEW v_products_with_stock AS
SELECT
  p.*,
  COALESCE(SUM(pbs.quantity), 0)::INT AS total_stock,
  COALESCE(
    jsonb_object_agg(pbs.branch_id::TEXT, pbs.quantity) FILTER (WHERE pbs.branch_id IS NOT NULL),
    '{}'::jsonb
  ) AS branch_stock
FROM products p
LEFT JOIN product_branch_stock pbs ON pbs.product_id = p.id
GROUP BY p.id;

-- ========================
-- 4. Update fn_complete_sale to handle per-item discount
-- ========================
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
  p_items JSONB -- array of {product_id, product_name, quantity, price, cost_price, discount}
) RETURNS UUID AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
BEGIN
  -- Insert the sale
  INSERT INTO sales (
    invoice_number, date, subtotal, discount, tax, total_amount, total_cost,
    payment_method, customer_id, customer_name, branch_id, branch_name
  ) VALUES (
    p_invoice_number, p_date, p_subtotal, p_discount, p_tax, p_total_amount, p_total_cost,
    p_payment_method, p_customer_id, p_customer_name, p_branch_id, p_branch_name
  ) RETURNING id INTO v_sale_id;

  -- Insert sale items, stock movements, and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert sale item with discount
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

    -- Deduct stock from branch
    UPDATE product_branch_stock
    SET quantity = GREATEST(0, quantity - (v_item->>'quantity')::INT)
    WHERE product_id = (v_item->>'product_id')::UUID
      AND branch_id = p_branch_id;

    -- Log stock movement
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

  -- Update customer loyalty if applicable
  IF p_customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_spent = total_spent + p_total_amount,
        loyalty_points = loyalty_points + FLOOR(p_total_amount / 10)::INT
    WHERE id = p_customer_id;
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

