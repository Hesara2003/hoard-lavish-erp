-- Set default thermal printer for Mount Lavinia branch.
-- Keep existing explicit selections unchanged.
UPDATE branches
SET thermal_printer_name = 'XP - Q80B'
WHERE COALESCE(BTRIM(thermal_printer_name), '') = ''
  AND REGEXP_REPLACE(LOWER(name), '[^a-z0-9]', '', 'g') = 'mountlavinia';
