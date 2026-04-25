-- fix-melia-id300-transfer-to-303.sql
--
-- Purpose: Transfer the user-entered budget + assumption from `porb_melia`
--          id 300 onto id 303. Same study (same toc_id, same name, same
--          center) — TOC moved the AOW mapping from 167 → 164. Program 46
--          team confirmed the move is intentional, so the user-entered
--          $168,914 should follow the study to its new AOW.
--
--          After the transfer, hard-delete the four hidden zero-budget
--          siblings (ids 300, 301, 302, 304) that share the same toc_id
--          across the now-stale AOWs (167, 168, 166, 169). They are noise.
--
-- Context (program 46 / center 45 / toc_id b59ed74b-...):
--   id 300 — aow 167, budget=168914, assumption=Y, toc_is_deleted=1   ← source
--   id 301 — aow 168, budget=0,      assumption= , toc_is_deleted=1
--   id 302 — aow 166, budget=0,      assumption= , toc_is_deleted=1
--   id 303 — aow 164, budget=0,      assumption= , toc_is_deleted=0   ← destination
--   id 304 — aow 169, budget=0,      assumption= , toc_is_deleted=1
--
-- Safety properties:
--   - Wrapped in a transaction.
--   - The UPDATE only fires if id 303 is still empty (budget=0 AND
--     assumption is empty/whitespace). If a user has typed into id 303
--     since this snippet was prepared, the UPDATE matches 0 rows and the
--     state-check below aborts — no data is overwritten.
--   - The DELETEs only target the 4 specific ids and only when they still
--     match the expected (toc_is_deleted=1, budget=0, empty assumption)
--     shape, except id 300 which we delete only after the transfer.
--   - Idempotent: re-running after success deletes 0 rows because the
--     target ids no longer exist.

-- ---------------------------------------------------------------------------
-- Pre-flight (read-only — preview before running)
-- ---------------------------------------------------------------------------
-- SELECT id, porb_aow_id AS aow, toc_is_deleted AS del,
--        COALESCE(melia_budget, 0) AS budget,
--        CHAR_LENGTH(COALESCE(melia_assumption, '')) AS asm_len,
--        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') AS updated,
--        LEFT(REPLACE(melia_name, '\n', ' '), 60) AS name
-- FROM porb_melia
-- WHERE id IN (300, 301, 302, 303, 304)
-- ORDER BY id;

-- ---------------------------------------------------------------------------
-- Transfer + delete
-- ---------------------------------------------------------------------------
START TRANSACTION;

-- 1. Copy budget + assumption from id 300 onto id 303 — only if 303 is empty.
UPDATE porb_melia AS dst
JOIN porb_melia AS src ON src.id = 300
SET
  dst.melia_budget     = src.melia_budget,
  dst.melia_assumption = src.melia_assumption
WHERE dst.id = 303
  AND COALESCE(dst.melia_budget, 0) = 0
  AND NULLIF(TRIM(COALESCE(dst.melia_assumption, '')), '') IS NULL
  AND src.id = 300
  AND COALESCE(src.melia_budget, 0) = 168914;

SET @transferred  := ROW_COUNT();
SET @id300_exists := (SELECT COUNT(*) FROM porb_melia WHERE id = 300);

-- Acceptable states:
--   First run:  @transferred = 1 AND @id300_exists = 1
--   Re-run:     @transferred = 0 AND @id300_exists = 0  (already cleaned up)
-- Anything else means id 303 was no longer empty OR id 300's budget changed
-- — abort.
SELECT
  CASE
    WHEN @transferred = 1 AND @id300_exists = 1 THEN 'first-run: proceed'
    WHEN @transferred = 0 AND @id300_exists = 0 THEN 're-run: nothing to do'
    ELSE NULL
  END
INTO @state_check;

-- Force an error if state is inconsistent: SELECT FROM a non-existent table
-- aborts the transaction. (Portable to phpMyAdmin without DELIMITER.)
SET @abort := IF(@state_check IS NULL,
  (SELECT 'UNEXPECTED STATE — id 303 not empty or id 300 changed; rolling back.'
     FROM porb_melia_does_not_exist),
  'ok');

-- 2. Delete the source row (id 300) and its zero-budget hidden siblings
--    (ids 301, 302, 304). Each DELETE matches only when the row still has
--    its expected shape — defensive against concurrent edits.
DELETE FROM porb_melia
WHERE id = 300
  AND toc_is_deleted = 1
  AND COALESCE(melia_budget, 0) = 168914;

DELETE FROM porb_melia
WHERE id IN (301, 302, 304)
  AND toc_is_deleted = 1
  AND COALESCE(melia_budget, 0) = 0
  AND NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NULL;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-run verification
-- ---------------------------------------------------------------------------
SELECT id, porb_aow_id AS aow, toc_is_deleted AS del,
       COALESCE(melia_budget, 0) AS budget,
       CHAR_LENGTH(COALESCE(melia_assumption, '')) AS asm_len,
       LEFT(REPLACE(melia_name, '\n', ' '), 60) AS name
FROM porb_melia
WHERE id IN (300, 301, 302, 303, 304)
ORDER BY id;
-- Expected after success:
--   id 303 — aow=164, budget=168914, asm_len=40, del=0
--   ids 300, 301, 302, 304 — (no rows)
