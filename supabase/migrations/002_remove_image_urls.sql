-- ============================================================
-- Hoard Lavish ERP — Remove product image URLs
-- Run this in the Supabase SQL Editor after the initial schema
-- ============================================================

UPDATE products SET image_url = NULL;
