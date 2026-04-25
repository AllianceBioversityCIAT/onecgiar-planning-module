-- fix-melia-dedup-toc-id.sql
--
-- Purpose: Two-pass cleanup of duplicate `porb_melia` rows that share
--          (program_id, toc_id, center_id, porb_aow_id). Duplicates
--          accumulated because the auto-harvest cron originally deduped by
--          `melia_name`, so TOC renames produced extra rows for the same
--          study.
--
-- Two-pass strategy:
--   Tx 1 — HARD-DELETE non-keepers in "empty" duplicate groups (no user
--          data anywhere in the group). Destructive but safe: there is
--          nothing worth preserving.
--   Tx 2 — SOFT-FLAG (`toc_is_deleted = 1`) non-keepers in "money-bearing"
--          duplicate groups (any row has budget OR assumption). Reversible
--          — the UI's existing red "Deleted" badge surfaces these as
--          "TOC link unreliable, don't budget here" while preserving the
--          audit trail and any user-entered data.
--
-- Definition of "empty group" (strict — applied at the GROUP level):
--   For every row in the group:
--     - COALESCE(melia_budget, 0) = 0, AND
--     - NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NULL
--       (so blank/whitespace-only assumptions count as empty)
--   If even one row in the group has a non-zero budget OR a non-empty
--   assumption, the entire group is treated as money-bearing and goes
--   through Tx 2. We never split a group across the two strategies.
--
-- Tx 1 runs FIRST so empty groups disappear before Tx 2's group-selection
-- runs — Tx 2's WHERE additionally filters to money-bearing groups, both
-- to express intent and to keep Tx 2 safe to re-run in isolation.
--
-- Supersedes: an earlier revision of THIS file that issued
--             `DELETE FROM porb_melia` for ALL non-keepers — that broad
--             destructive approach has been replaced by the targeted
--             empty-group hard-delete (Tx 1) plus the soft-flag for
--             money-bearing groups (Tx 2). Also supersedes
--             `back-end/migrate-melia-dedup.sql` (which deduped by
--             `melia_name`, the precise bug this script compensates for).
--             Do NOT run any of the older variants alongside this script.
--
-- Keeper-selection rule (per duplicate group, identical in Tx 1 and Tx 2).
-- Must remain in sync with `meliaRowIsBetter` in
-- `back-end/src/porb/porb.service.ts`:
--   1) Highest `melia_budget`              (NULL treated as 0)
--   2) Tiebreak: longest non-empty
--      `melia_assumption`                  (NULL treated as 0 length)
--   3) Tiebreak: most recent `updated_at`
--   4) Tiebreak: lowest `id`               (deterministic)
-- For empty groups (Tx 1) the first two terms collapse to 0/NULL ties for
-- every row, so ordering effectively becomes updated_at DESC then id ASC,
-- but we keep the full ordering expression identical between Tx 1 and Tx 2
-- so any behavioural change happens in one place.
--
-- For money-bearing groups (Tx 2) the keeper additionally has its
-- `melia_name` and `melia_outputs` overwritten with the canonical values
-- from the row in the group with the most recent `updated_at` (TOC's latest
-- rename — tiebreak: highest id). All non-keepers in the group then have
-- `toc_is_deleted` set to 1, only when currently 0 so the UPDATE is a no-op
-- on subsequent runs.
--
-- Self-healing cron interaction: `syncTocDeletedFlags` in
-- `back-end/src/porb/porb.service.ts` is duplicate-aware. For MELIA it
-- groups rows with `meliaKeyOf` and picks a canonical with `meliaRowIsBetter`
-- (same ordering as this script) — non-canonical rows in each live group
-- stay flagged on every cron tick. So even if duplicates re-appear (e.g.
-- before this code reaches prod), the cron will keep extras at
-- `toc_is_deleted = 1`. The cleanup script and the cron MUST agree on
-- canonical-row ordering; if you change one, change the other.
--
-- Skipped: groups where `toc_id IS NULL` or `toc_id = ''` (legacy rows;
-- the application still falls back to name-based dedup for those).
--
-- Idempotency:
--   - Tx 1: a second run finds zero empty groups with >1 rows (the first
--           run collapsed each empty group down to its keeper), so the
--           DELETE matches zero rows.
--   - Tx 2: the canonical-name UPDATE has a `<=>` guard so it only writes
--           when something differs; the soft-flag UPDATE is guarded by
--           `WHERE pm.toc_is_deleted = 0`, so once non-keepers are flagged
--           the WHERE clause matches zero rows.
--
-- Transactionality: each pass is wrapped in its own
-- `START TRANSACTION ... COMMIT`. If Tx 1 fails, ROLLBACK leaves
-- `porb_melia` untouched; Tx 2 then has nothing to clean up beyond what
-- it already would have. If Tx 2 fails after Tx 1 committed, the empty
-- groups remain hard-deleted (correct) and the soft-flag pass can be
-- re-run safely.
--
-- Compatibility: MySQL 8 (also works on 5.7+). Uses
-- `SUBSTRING_INDEX(GROUP_CONCAT(... ORDER BY ...), ',', 1)` for keeper
-- picking. Runnable in phpMyAdmin or the `mysql` CLI. No stored procedures.
--
-- ----------------------------------------------------------------------------
-- Diagnostic / dry-run queries — uncomment and run BEFORE the cleanup to
-- preview which groups will be hard-deleted vs soft-flagged.
-- ----------------------------------------------------------------------------
--
-- -- A) Counts: empty groups vs money-bearing groups (and total).
-- --    Empty groups feed Tx 1 (hard-delete); money-bearing feed Tx 2.
-- SELECT
--   SUM(CASE WHEN is_empty = 1 THEN 1 ELSE 0 END) AS empty_groups,
--   SUM(CASE WHEN is_empty = 0 THEN 1 ELSE 0 END) AS money_bearing_groups,
--   COUNT(*)                                      AS total_dup_groups
-- FROM (
--   SELECT
--     program_id, toc_id, center_id, porb_aow_id,
--     CASE
--       WHEN SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) = 0
--        AND SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) = 0
--       THEN 1 ELSE 0
--     END AS is_empty
--   FROM porb_melia
--   WHERE toc_id IS NOT NULL AND toc_id <> ''
--   GROUP BY program_id, toc_id, center_id, porb_aow_id
--   HAVING COUNT(*) > 1
-- ) g;
--
-- -- B) List duplicate groups with row counts, ids, and empty-flag.
-- SELECT program_id, toc_id, center_id, porb_aow_id,
--        COUNT(*) AS cnt,
--        GROUP_CONCAT(id ORDER BY id) AS ids,
--        SUM(COALESCE(melia_budget, 0)) AS total_budget,
--        CASE
--          WHEN SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) = 0
--           AND SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) = 0
--          THEN 'empty'
--          ELSE 'money'
--        END AS group_kind
-- FROM porb_melia
-- WHERE toc_id IS NOT NULL AND toc_id <> ''
-- GROUP BY program_id, toc_id, center_id, porb_aow_id
-- HAVING COUNT(*) > 1
-- ORDER BY group_kind, cnt DESC, program_id, center_id;
--
-- -- C) Preview rows Tx 1 WILL HARD-DELETE (non-keepers in empty groups).
-- SELECT pm.id, pm.program_id, pm.toc_id, pm.center_id, pm.porb_aow_id,
--        pm.melia_name, pm.melia_budget, pm.melia_assumption, pm.updated_at
-- FROM porb_melia pm
-- JOIN (
--   SELECT
--     program_id, toc_id, center_id, porb_aow_id,
--     SUBSTRING_INDEX(
--       GROUP_CONCAT(
--         id
--         ORDER BY
--           COALESCE(melia_budget, 0)                              DESC,
--           COALESCE(CHAR_LENGTH(NULLIF(melia_assumption, '')), 0) DESC,
--           updated_at                                             DESC,
--           id                                                     ASC
--         SEPARATOR ','
--       ),
--       ',', 1
--     ) + 0 AS keeper_id
--   FROM porb_melia
--   WHERE toc_id IS NOT NULL AND toc_id <> ''
--   GROUP BY program_id, toc_id, center_id, porb_aow_id
--   HAVING COUNT(*) > 1
--      AND SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) = 0
--      AND SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) = 0
-- ) g
--   ON  g.program_id = pm.program_id
--   AND g.toc_id     = pm.toc_id
--   AND g.center_id  = pm.center_id
--   AND ((g.porb_aow_id IS NULL AND pm.porb_aow_id IS NULL)
--        OR g.porb_aow_id = pm.porb_aow_id)
-- WHERE pm.id <> g.keeper_id
-- ORDER BY pm.program_id, pm.center_id, pm.porb_aow_id, pm.id;
--
-- -- D) Preview rows Tx 2 WILL SOFT-FLAG (non-keepers in money-bearing
-- --    groups, currently toc_is_deleted = 0).
-- SELECT pm.id, pm.program_id, pm.toc_id, pm.center_id, pm.porb_aow_id,
--        pm.melia_name, pm.melia_budget, pm.toc_is_deleted, pm.updated_at
-- FROM porb_melia pm
-- JOIN (
--   SELECT
--     program_id, toc_id, center_id, porb_aow_id,
--     SUBSTRING_INDEX(
--       GROUP_CONCAT(
--         id
--         ORDER BY
--           COALESCE(melia_budget, 0)                              DESC,
--           COALESCE(CHAR_LENGTH(NULLIF(melia_assumption, '')), 0) DESC,
--           updated_at                                             DESC,
--           id                                                     ASC
--         SEPARATOR ','
--       ),
--       ',', 1
--     ) + 0 AS keeper_id
--   FROM porb_melia
--   WHERE toc_id IS NOT NULL AND toc_id <> ''
--   GROUP BY program_id, toc_id, center_id, porb_aow_id
--   HAVING COUNT(*) > 1
--      AND (SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) > 0
--           OR SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) > 0)
-- ) g
--   ON  g.program_id = pm.program_id
--   AND g.toc_id     = pm.toc_id
--   AND g.center_id  = pm.center_id
--   AND ((g.porb_aow_id IS NULL AND pm.porb_aow_id IS NULL)
--        OR g.porb_aow_id = pm.porb_aow_id)
-- WHERE pm.id <> g.keeper_id
--   AND pm.toc_is_deleted = 0
-- ORDER BY pm.program_id, pm.center_id, pm.porb_aow_id, pm.id;
--
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Tx 1 — HARD-DELETE non-keepers in empty duplicate groups.
--        Destructive: row data is gone after COMMIT. Targeted only at
--        groups where every row has zero budget AND empty assumption,
--        so there is no user data to preserve.
-- ============================================================================

START TRANSACTION;

-- 1a) Build a temp table of keeper ids for empty duplicate groups only.
--     Group key includes porb_aow_id (nullable). MySQL's GROUP BY treats
--     two NULLs as equal, which is what we want — NULL-AOW rows for the
--     same program/center/toc collapse together.
DROP TEMPORARY TABLE IF EXISTS tmp_melia_empty_keepers;

CREATE TEMPORARY TABLE tmp_melia_empty_keepers (
  keeper_id   INT NOT NULL,
  program_id  INT NOT NULL,
  toc_id      CHAR(36) NOT NULL,
  center_id   INT NOT NULL,
  porb_aow_id INT NULL,
  PRIMARY KEY (keeper_id),
  KEY idx_group (program_id, toc_id, center_id, porb_aow_id)
) ENGINE=InnoDB;

INSERT INTO tmp_melia_empty_keepers (
  keeper_id, program_id, toc_id, center_id, porb_aow_id
)
SELECT
  SUBSTRING_INDEX(
    GROUP_CONCAT(
      id
      ORDER BY
        COALESCE(melia_budget, 0)                              DESC,
        COALESCE(CHAR_LENGTH(NULLIF(melia_assumption, '')), 0) DESC,
        updated_at                                             DESC,
        id                                                     ASC
      SEPARATOR ','
    ),
    ',', 1
  ) + 0 AS keeper_id,
  program_id,
  toc_id,
  center_id,
  porb_aow_id
FROM porb_melia
WHERE toc_id IS NOT NULL AND toc_id <> ''
GROUP BY program_id, toc_id, center_id, porb_aow_id
HAVING COUNT(*) > 1
   AND SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) = 0
   AND SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) = 0;

-- 1b) Delete every non-keeper row of every empty group.
DELETE pm
FROM porb_melia pm
JOIN tmp_melia_empty_keepers t
  ON  t.program_id = pm.program_id
  AND t.toc_id     = pm.toc_id
  AND t.center_id  = pm.center_id
  AND ((t.porb_aow_id IS NULL AND pm.porb_aow_id IS NULL)
       OR t.porb_aow_id = pm.porb_aow_id)
WHERE pm.id <> t.keeper_id;

DROP TEMPORARY TABLE IF EXISTS tmp_melia_empty_keepers;

COMMIT;

-- ============================================================================
-- Tx 2 — SOFT-FLAG (`toc_is_deleted = 1`) non-keepers in money-bearing
--        duplicate groups. Reversible. Empty groups are explicitly
--        excluded from the group filter — by this point Tx 1 has already
--        collapsed them, so the filter is a belt-and-braces restatement
--        of intent that also makes Tx 2 safe to re-run in isolation.
-- ============================================================================

START TRANSACTION;

-- 2a) Build a temp table holding, for each MONEY-BEARING duplicate group,
--     the keeper id plus the canonical melia_name / melia_outputs (from
--     the most recently updated row in the group).
DROP TEMPORARY TABLE IF EXISTS tmp_melia_keepers;

CREATE TEMPORARY TABLE tmp_melia_keepers (
  keeper_id         INT NOT NULL,
  program_id        INT NOT NULL,
  toc_id            CHAR(36) NOT NULL,
  center_id         INT NOT NULL,
  porb_aow_id       INT NULL,
  canonical_name    MEDIUMTEXT NULL,
  canonical_outputs MEDIUMTEXT NULL,
  PRIMARY KEY (keeper_id),
  KEY idx_group (program_id, toc_id, center_id, porb_aow_id)
) ENGINE=InnoDB;

INSERT INTO tmp_melia_keepers (
  keeper_id, program_id, toc_id, center_id, porb_aow_id,
  canonical_name, canonical_outputs
)
SELECT
  k.keeper_id,
  k.program_id,
  k.toc_id,
  k.center_id,
  k.porb_aow_id,
  cpm.melia_name    AS canonical_name,
  cpm.melia_outputs AS canonical_outputs
FROM (
  -- Keeper picker: per money-bearing group, pick the row matching the
  -- rule in the header. GROUP_CONCAT(... ORDER BY ...) is bounded by
  -- group_concat_max_len; even with the 1024-byte default that's well
  -- over 100 numeric ids per group, and we only read the first one via
  -- SUBSTRING_INDEX.
  SELECT
    program_id,
    toc_id,
    center_id,
    porb_aow_id,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        id
        ORDER BY
          COALESCE(melia_budget, 0)                              DESC,
          COALESCE(CHAR_LENGTH(NULLIF(melia_assumption, '')), 0) DESC,
          updated_at                                             DESC,
          id                                                     ASC
        SEPARATOR ','
      ),
      ',', 1
    ) + 0 AS keeper_id
  FROM porb_melia
  WHERE toc_id IS NOT NULL AND toc_id <> ''
  GROUP BY program_id, toc_id, center_id, porb_aow_id
  HAVING COUNT(*) > 1
     AND (SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) > 0
          OR SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) > 0)
) k
JOIN (
  -- Canonical-name picker: per money-bearing duplicate group, the row
  -- with the most recent updated_at (tiebreak: highest id). Same group
  -- filter as the keeper picker so the JOIN below matches exactly.
  SELECT
    program_id,
    toc_id,
    center_id,
    porb_aow_id,
    SUBSTRING_INDEX(
      GROUP_CONCAT(
        id
        ORDER BY updated_at DESC, id DESC
        SEPARATOR ','
      ),
      ',', 1
    ) + 0 AS canonical_id
  FROM porb_melia
  WHERE toc_id IS NOT NULL AND toc_id <> ''
  GROUP BY program_id, toc_id, center_id, porb_aow_id
  HAVING COUNT(*) > 1
     AND (SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) > 0
          OR SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) > 0)
) cn
  ON  cn.program_id = k.program_id
  AND cn.toc_id     = k.toc_id
  AND cn.center_id  = k.center_id
  AND ((cn.porb_aow_id IS NULL AND k.porb_aow_id IS NULL)
       OR cn.porb_aow_id = k.porb_aow_id)
JOIN porb_melia cpm
  ON cpm.id = cn.canonical_id;

-- 2b) Update each keeper's melia_name / melia_outputs to the canonical
--     (latest TOC rename) values. Skip the write when nothing would
--     change. Keeper's `toc_is_deleted` is intentionally NOT touched —
--     it should remain 0 (the existing cron flow restores it if needed).
UPDATE porb_melia pm
JOIN tmp_melia_keepers t
  ON t.keeper_id = pm.id
SET
  pm.melia_name    = t.canonical_name,
  pm.melia_outputs = t.canonical_outputs
WHERE NOT (
      pm.melia_name <=> t.canonical_name
  AND pm.melia_outputs <=> t.canonical_outputs
);

-- 2c) Soft-flag every non-keeper row that belongs to a money-bearing
--     duplicate group. NO DELETE — set `toc_is_deleted = 1` so the UI
--     shows the existing red "Deleted" badge. Idempotency guard: only
--     flip rows that are still 0.
UPDATE porb_melia pm
JOIN tmp_melia_keepers t
  ON  t.program_id = pm.program_id
  AND t.toc_id     = pm.toc_id
  AND t.center_id  = pm.center_id
  AND ((t.porb_aow_id IS NULL AND pm.porb_aow_id IS NULL)
       OR t.porb_aow_id = pm.porb_aow_id)
SET pm.toc_is_deleted = 1
WHERE pm.id <> t.keeper_id
  AND pm.toc_is_deleted = 0;

DROP TEMPORARY TABLE IF EXISTS tmp_melia_keepers;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-run verification (run manually):
--
-- -- Expected: 0 — every non-keeper in a remaining duplicate group is now
-- -- flagged. (Empty groups have been hard-deleted by Tx 1, so the only
-- -- surviving duplicate groups are money-bearing.)
-- SELECT COUNT(*) AS unflagged_non_keepers
-- FROM porb_melia pm
-- JOIN (
--   SELECT
--     program_id, toc_id, center_id, porb_aow_id,
--     SUBSTRING_INDEX(
--       GROUP_CONCAT(
--         id
--         ORDER BY
--           COALESCE(melia_budget, 0)                              DESC,
--           COALESCE(CHAR_LENGTH(NULLIF(melia_assumption, '')), 0) DESC,
--           updated_at                                             DESC,
--           id                                                     ASC
--         SEPARATOR ','
--       ),
--       ',', 1
--     ) + 0 AS keeper_id
--   FROM porb_melia
--   WHERE toc_id IS NOT NULL AND toc_id <> ''
--   GROUP BY program_id, toc_id, center_id, porb_aow_id
--   HAVING COUNT(*) > 1
-- ) g
--   ON  g.program_id = pm.program_id
--   AND g.toc_id     = pm.toc_id
--   AND g.center_id  = pm.center_id
--   AND ((g.porb_aow_id IS NULL AND pm.porb_aow_id IS NULL)
--        OR g.porb_aow_id = pm.porb_aow_id)
-- WHERE pm.id <> g.keeper_id
--   AND pm.toc_is_deleted = 0;
--
-- -- Expected: 0 — no empty duplicate groups should remain after Tx 1.
-- SELECT COUNT(*) AS empty_dup_groups_remaining
-- FROM (
--   SELECT 1
--   FROM porb_melia
--   WHERE toc_id IS NOT NULL AND toc_id <> ''
--   GROUP BY program_id, toc_id, center_id, porb_aow_id
--   HAVING COUNT(*) > 1
--      AND SUM(CASE WHEN COALESCE(melia_budget, 0) <> 0 THEN 1 ELSE 0 END) = 0
--      AND SUM(CASE WHEN NULLIF(TRIM(COALESCE(melia_assumption, '')), '') IS NOT NULL THEN 1 ELSE 0 END) = 0
-- ) g;
-- ----------------------------------------------------------------------------
