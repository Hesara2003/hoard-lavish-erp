-- Persisted sale voiding (remove sale, restore stock, rollback loyalty)

CREATE OR REPLACE FUNCTION fn_void_sale(
  p_sale_id UUID
) RETURNS UUID AS $$
DECLARE
  v_sale RECORD;
  v_item RECORD;
  v_deleted_id UUID;
BEGIN
  SELECT id, invoice_number, branch_id, branch_name, customer_id, total_amount
  INTO v_sale
  FROM sales
  WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale % not found', p_sale_id;
  END IF;

  -- Restore stock using sale items before deleting the sale.
  FOR v_item IN
    SELECT product_id, product_name, quantity
    FROM sale_items
    WHERE sale_id = p_sale_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE product_branch_stock
      SET quantity = quantity + v_item.quantity
      WHERE product_id = v_item.product_id
        AND branch_id = v_sale.branch_id;

      INSERT INTO stock_movements (
        product_id,
        product_name,
        branch_id,
        branch_name,
        type,
        quantity,
        reason,
        date
      )
      VALUES (
        v_item.product_id,
        v_item.product_name,
        v_sale.branch_id,
        v_sale.branch_name,
        'IN',
        v_item.quantity,
        'Sale Voided #' || v_sale.invoice_number,
        now()
      );
    END IF;
  END LOOP;

  -- Reverse customer loyalty/spend impact.
  IF v_sale.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_spent = GREATEST(0, total_spent - v_sale.total_amount),
        loyalty_points = GREATEST(0, loyalty_points - FLOOR(v_sale.total_amount / 10)::INT)
    WHERE id = v_sale.customer_id;
  END IF;

  DELETE FROM sales
  WHERE id = p_sale_id
  RETURNING id INTO v_deleted_id;

  RETURN v_deleted_id;
END;
$$ LANGUAGE plpgsql;

-- Refresh PostgREST schema cache for new RPC
NOTIFY pgrst, 'reload schema';
