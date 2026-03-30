-- Migration: Move W3/Bilateral from AOW-level to Center-level
-- This merges bilateral rows that share (toc_id, center_id, program_id) but differ by porb_aow_id.
-- After migration, porb_aow_id is set to NULL on all bilateral rows.

-- Step 1: For groups with duplicates, sum budgets and concat assumptions into the row with lowest id
UPDATE porb_bilateral AS target
JOIN (
  SELECT
    MIN(id) AS keep_id,
    toc_id,
    center_id,
    program_id,
    SUM(COALESCE(bilateral_budget, 0)) AS total_budget,
    GROUP_CONCAT(
      CASE WHEN bilateral_assumption IS NOT NULL AND TRIM(bilateral_assumption) != ''
           THEN bilateral_assumption
           ELSE NULL
      END
      SEPARATOR '\n'
    ) AS merged_assumption
  FROM porb_bilateral
  GROUP BY toc_id, center_id, program_id
  HAVING COUNT(*) > 1
) AS merged
ON target.id = merged.keep_id
SET
  target.bilateral_budget = merged.total_budget,
  target.bilateral_assumption = merged.merged_assumption,
  target.porb_aow_id = NULL;

-- Step 2: Delete duplicate rows (non-kept) from groups
DELETE pb FROM porb_bilateral pb
JOIN (
  SELECT
    MIN(id) AS keep_id,
    toc_id,
    center_id,
    program_id
  FROM porb_bilateral
  GROUP BY toc_id, center_id, program_id
  HAVING COUNT(*) > 1
) AS dupes
ON pb.toc_id = dupes.toc_id
  AND pb.center_id = dupes.center_id
  AND pb.program_id = dupes.program_id
  AND pb.id != dupes.keep_id;

-- Step 3: Set porb_aow_id = NULL on remaining unique rows
UPDATE porb_bilateral SET porb_aow_id = NULL WHERE porb_aow_id IS NOT NULL;

-- Verification: Should return 0 rows with non-null porb_aow_id
SELECT COUNT(*) AS remaining_with_aow FROM porb_bilateral WHERE porb_aow_id IS NOT NULL;

-- Verification: No duplicates should exist per (toc_id, center_id, program_id)
SELECT toc_id, center_id, program_id, COUNT(*) AS cnt
FROM porb_bilateral
GROUP BY toc_id, center_id, program_id
HAVING cnt > 1;
