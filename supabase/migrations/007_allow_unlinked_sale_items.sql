-- ============================================================
-- Migration 007: Allow deleting products while preserving sales snapshots
-- Run this in the Supabase SQL Editor AFTER existing migrations.
-- ============================================================

-- 1) product_id in sale_items must be nullable so old sales can exist without live product rows
ALTER TABLE sale_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 2) Replace restrictive FK with ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_items_product_id_fkey'
      AND conrelid = 'sale_items'::regclass
  ) THEN
    ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_fkey;
  END IF;
END $$;

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE SET NULL;
