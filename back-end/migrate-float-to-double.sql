-- Migration: Change budget/percentage columns from FLOAT to DOUBLE
-- Run this BEFORE deploying the code change to prevent data loss.
-- FLOAT (32-bit) silently rounds values at ~7 significant digits.
-- DOUBLE (64-bit, ~15 digits) preserves all budget values exactly.
-- FLOAT → DOUBLE is a safe widening conversion — no data loss.

ALTER TABLE porb_hlo MODIFY COLUMN hlo_budget double NULL;
ALTER TABLE porb_anaplan MODIFY COLUMN budget double NULL;
ALTER TABLE porb_cross MODIFY COLUMN budget double NULL;
ALTER TABLE porb_melia MODIFY COLUMN melia_budget double NULL;
ALTER TABLE porb_bilateral MODIFY COLUMN bilateral_budget double NULL;
ALTER TABLE porb_contracted_partners MODIFY COLUMN budget double NULL;
ALTER TABLE porb_country_percentage MODIFY COLUMN percentage double NULL;
ALTER TABLE porb_location_benefit MODIFY COLUMN percentage double NULL;
