-- Persist exchange headers and line items with discount-aware pricing snapshots

CREATE TABLE IF NOT EXISTS exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_number TEXT NOT NULL UNIQUE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  original_invoice_number TEXT,
  returned_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL,
  refund_method payment_method,
  settlement_type TEXT,
  exchange_bill_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('RETURN', 'NEW')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  size TEXT,
  color TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_item_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_bill_discount_share NUMERIC(12,2) NOT NULL DEFAULT 0,
  effective_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_effective_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  source_type TEXT,
  source_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  source_invoice_number TEXT,
  source_sale_item_index INT,
  source_line_key TEXT,
  original_quantity INT,
  manual_return_unit_price NUMERIC(12,2)
);

CREATE INDEX IF NOT EXISTS idx_exchanges_date ON exchanges(date DESC);
CREATE INDEX IF NOT EXISTS idx_exchanges_branch_id ON exchanges(branch_id);
CREATE INDEX IF NOT EXISTS idx_exchange_items_exchange_id ON exchange_items(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_items_product_id ON exchange_items(product_id);

NOTIFY pgrst, 'reload schema';
