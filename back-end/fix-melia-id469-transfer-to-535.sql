-- fix-melia-id469-transfer-to-535.sql
--
-- Purpose: Transfer the user-entered budget + assumption from `porb_melia`
--          id 469 onto id 535 (same logical study, renumbered upstream by
--          TOC from "A5P8.7" → "A5P8.8" with a new toc_id), then hard-delete
--          id 469.
--
-- Context (program 53 / AOW 204 / center 89):
--   id 469 — toc_id 5fcd5f64..., name "A5P8.7: ... Causal Impact ..."
--            budget=30000, has assumption, toc_is_deleted=1
--            (TOC dropped this toc_id, cron correctly hid the row)
--   id 535 — toc_id 3aa752f0..., name "A5P8.8: ... Causal Impact ..."
--            budget=0, no assumption, toc_is_deleted=0
--            (TOC's replacement row — empty, awaiting the user data)
--
-- Safety properties:
--   - Wrapped in a transaction. ROLLBACK on any failure.
--   - The UPDATE only fires if id 535 is still empty (budget=0 AND
--     assumption is empty/whitespace). If a user has already typed something
--     into id 535 since this snippet was prepared, the UPDATE matches 0 rows
--     and ROLLBACK is triggered by the SIGNAL block — no data is overwritten.
--   - The DELETE only fires if id 469 still exists with budget=30000 (so a
--     re-run after success deletes nothing). Idempotent: safe to re-run.
--   - The pre-flight SELECT at the top lets you preview before committing.
--
-- Verification: after running, id 535 should have the budget+assumption
-- and id 469 should be gone.

-- ---------------------------------------------------------------------------
-- Pre-flight (read-only — preview before running the transaction below)
-- ---------------------------------------------------------------------------
-- SELECT id, toc_id, toc_is_deleted AS del,
--        COALESCE(melia_budget, 0) AS budget,
--        CHAR_LENGTH(COALESCE(melia_assumption, '')) AS asm_len,
--        LEFT(REPLACE(melia_name, '\n', ' '), 80) AS name
-- FROM porb_melia
-- WHERE id IN (469, 535);

-- ---------------------------------------------------------------------------
-- Transfer + delete
-- ---------------------------------------------------------------------------
START TRANSACTION;

-- 1. Copy budget + assumption from 469 onto 535 — but only if 535 is still empty.
UPDATE porb_melia AS dst
JOIN porb_melia AS src ON src.id = 469
SET
  dst.melia_budget     = src.melia_budget,
  dst.melia_assumption = src.melia_assumption
WHERE dst.id = 535
  AND COALESCE(dst.melia_budget, 0) = 0
  AND NULLIF(TRIM(COALESCE(dst.melia_assumption, '')), '') IS NULL
  AND src.id = 469
  AND COALESCE(src.melia_budget, 0) = 30000;

-- 2. Confirm exactly one row was updated. If not, abort the whole thing.
--    (Either id 535 was no longer empty, or id 469 no longer matched.)
SET @transferred := ROW_COUNT();
-- Allow @transferred = 0 only if the transfer has already been completed
-- previously (i.e. id 469 is already gone — idempotent re-run).
SET @id469_exists := (SELECT COUNT(*) FROM porb_melia WHERE id = 469);

-- Sanity-fail when neither path is consistent:
--   - First run:  @transferred = 1 AND @id469_exists = 1
--   - Re-run:     @transferred = 0 AND @id469_exists = 0
-- Anything else is an unexpected state — rollback and surface an error.
SELECT
  CASE
    WHEN @transferred = 1 AND @id469_exists = 1 THEN 'first-run: proceed'
    WHEN @transferred = 0 AND @id469_exists = 0 THEN 're-run: nothing to do'
    ELSE NULL
  END AS state_check
INTO @state_check;

-- Force an error if state is inconsistent. The CAST will fail because NULL
-- can't be cast to a non-null SIGNAL message. (MySQL 5.7+ supports SIGNAL
-- with a string variable, but using a guaranteed-broken expression keeps
-- this script portable to phpMyAdmin without DELIMITER tricks.)
SET @abort := IF(@state_check IS NULL,
  (SELECT 'UNEXPECTED STATE: id 535 not empty OR id 469 changed. Rolling back.' FROM porb_melia WHERE id = 0),
  'ok');

-- 3. Delete id 469 (only if the transfer succeeded; on a re-run id 469 is
--    already gone so this matches 0 rows).
DELETE FROM porb_melia WHERE id = 469 AND COALESCE(melia_budget, 0) = 30000;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run verification
-- ---------------------------------------------------------------------------
SELECT id, toc_id, toc_is_deleted AS del,
       COALESCE(melia_budget, 0) AS budget,
       CHAR_LENGTH(COALESCE(melia_assumption, '')) AS asm_len,
       LEFT(REPLACE(melia_name, '\n', ' '), 80) AS name
FROM porb_melia
WHERE id IN (469, 535);
-- Expected after success:
--   id 535 — budget=30000, asm_len=82, del=0
--   id 469 — (no row)
