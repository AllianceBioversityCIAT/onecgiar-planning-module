-- migrate-melia-dedup.sql
-- Merges duplicate MELIA rows that share (program_id, center_id, porb_aow_id, melia_name).
-- Keeps the row with the lowest id, sums budgets, concatenates assumptions.
-- Run inside a transaction.

-- 1. Preview: show duplicate groups before migration
SELECT program_id, center_id, porb_aow_id, melia_name, COUNT(*) AS cnt,
       GROUP_CONCAT(id ORDER BY id) AS ids,
       SUM(COALESCE(melia_budget, 0)) AS total_budget
FROM porb_melia
GROUP BY program_id, center_id, porb_aow_id, melia_name
HAVING COUNT(*) > 1;

-- 2. Update kept rows (lowest id per group) with summed budget
UPDATE porb_melia pm
JOIN (
  SELECT
    MIN(id) AS keep_id,
    program_id, center_id, porb_aow_id, melia_name,
    SUM(COALESCE(melia_budget, 0)) AS total_budget
  FROM porb_melia
  GROUP BY program_id, center_id, porb_aow_id, melia_name
  HAVING COUNT(*) > 1
) grouped ON pm.id = grouped.keep_id
SET pm.melia_budget = grouped.total_budget;

-- 3. Update kept rows with concatenated assumptions
-- NOTE: GROUP_CONCAT may truncate at group_concat_max_len (default 1024).
-- Run `SET SESSION group_concat_max_len = 65536;` first if assumptions are long.
UPDATE porb_melia pm
JOIN (
  SELECT
    MIN(id) AS keep_id,
    program_id, center_id, porb_aow_id, melia_name,
    GROUP_CONCAT(
      CASE WHEN melia_assumption IS NOT NULL AND TRIM(melia_assumption) != ''
           THEN TRIM(melia_assumption) END
      ORDER BY id SEPARATOR '\n'
    ) AS merged_assumption
  FROM porb_melia
  GROUP BY program_id, center_id, porb_aow_id, melia_name
  HAVING COUNT(*) > 1
) grouped ON pm.id = grouped.keep_id
SET pm.melia_assumption = grouped.merged_assumption;

-- 4. Delete duplicate rows (all except the lowest id per group)
DELETE pm FROM porb_melia pm
JOIN (
  SELECT id FROM porb_melia
  WHERE id NOT IN (
    SELECT keep_id FROM (
      SELECT MIN(id) AS keep_id
      FROM porb_melia
      GROUP BY program_id, center_id, porb_aow_id, melia_name
    ) AS keepers
  )
  AND (program_id, center_id, COALESCE(porb_aow_id, 0), melia_name) IN (
    SELECT program_id, center_id, COALESCE(porb_aow_id, 0), melia_name
    FROM porb_melia
    GROUP BY program_id, center_id, porb_aow_id, melia_name
    HAVING COUNT(*) > 1
  )
) dups ON pm.id = dups.id;

-- 5. Verification: should return 0 rows
SELECT program_id, center_id, porb_aow_id, melia_name, COUNT(*) AS cnt
FROM porb_melia
GROUP BY program_id, center_id, porb_aow_id, melia_name
HAVING COUNT(*) > 1;

-- 6. Final row count
SELECT COUNT(*) AS total_melia_rows FROM porb_melia;
