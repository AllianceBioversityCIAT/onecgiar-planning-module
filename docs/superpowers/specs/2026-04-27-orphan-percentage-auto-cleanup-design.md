# Auto-Cleanup of Orphaned Country / Location Percentage Rows

**Date**: 2026-04-27
**Status**: Deferred (low priority, not blocking)
**Related commit**: `fb07809` — Fix percentage validator counting orphaned (hidden) rows
**Related SQL**: `back-end/cleanup-orphan-percentage-rows.sql`

## Background

`porb_country_percentage` and `porb_location_benefit` rows can become "orphaned" when a TOC change removes a country from an HLO's `hlo_geo` (or a location from an outcome's `outcome_geo`). The row stays in the database but:

- The read endpoints (`getCountryPercentage`, `getLocationBenefit`) filter it out — invisible in the UI.
- The validator used to count it toward the 100% cap — produced "phantom 100%-block" bugs (e.g. Belgium=100% silently blocked Kenya).

The validator was patched in `fb07809` to mirror the read filter, so orphans **no longer cause functional bugs**. They're just dead weight in the DB. As of 2026-04-27 there were 23 such rows on prod (cleaned up via the one-time SQL).

## Why this is deferred (not done now)

- Storage cost is negligible — likely never more than a few hundred rows over the app's lifetime.
- Keeping orphans means a TOC geo "flip and revert" preserves the user's previously-entered percentage instead of silently zeroing it. That's a small but real UX win.
- The validator is now self-correcting; orphans cause no bugs.
- Risk of auto-deletion: silent data loss when TOC geo changes are temporary (e.g. accidental TOC edit reverted same day, but cleanup ran in between).

## When to revisit

Trigger a re-evaluation if any of these become true:

- Orphan row count exceeds ~5,000 (storage / query-perf concern).
- A new bug surfaces where orphans cause incorrect calculations (e.g. consolidated views, exports, validators we haven't touched yet).
- Product confirms that "TOC geo revert restores prior percentages" is NOT a desired behavior — at which point auto-cleanup becomes net-positive.

## Design Options

### Option A: Cleanup on TOC harvest (synchronous)

Where: `importTocToPorbTables` in `back-end/src/porb/porb.service.ts`. After updating HLO `hlo_geo` and outcome `outcome_geo`, run the same `DELETE … WHERE NOT EXISTS …` queries from `cleanup-orphan-percentage-rows.sql` scoped to the affected `program_id`.

- **Pros**: zero orphan accumulation; tight coupling to the source of truth (TOC changes).
- **Cons**: data-loss-on-flip — if TOC removes Belgium then re-adds it 5 minutes later, the percentage is gone. Adds I/O to the harvest cron, which already runs every minute.
- **Trigger granularity**: run only for HLOs/outcomes whose `hlo_geo` / `outcome_geo` actually changed in this harvest pass (avoid touching unchanged programs).

### Option B: Daily cleanup cron (asynchronous)

Where: a new `@Cron(CronExpression.EVERY_DAY_AT_3AM)` in `porb.service.ts`. Runs the SQL from `cleanup-orphan-percentage-rows.sql` against the whole DB.

- **Pros**: simple, decoupled from harvest, easy to disable/tune.
- **Cons**: same data-loss-on-flip risk as A, just delayed up to 24h. Wasteful when no orphans exist.
- **Mitigation**: log row counts deleted per run (sanity check / alerting if a run deletes thousands).

### Option C: Soft-delete with grace period (recommended if we ever ship this)

Add an `orphaned_at TIMESTAMP NULL` column to both tables. On harvest:

1. If a row's name no longer matches live geo AND `orphaned_at IS NULL` → set `orphaned_at = NOW()`.
2. If a row's name matches live geo again AND `orphaned_at IS NOT NULL` → set `orphaned_at = NULL` (geo flipped back, restore visibility).
3. Daily cron: `DELETE WHERE orphaned_at < NOW() - INTERVAL 30 DAY AND is_manual = 0`.

- **Pros**: survives TOC flip-and-revert within the grace window; no surprise data loss; auditable (you can see what's pending deletion).
- **Cons**: schema change; more code; need to verify the read path / validator continue to ignore `orphaned_at IS NOT NULL` rows.

## Recommendation

If/when this ships, prefer **Option C** (soft-delete with grace period). The grace window (30 days suggested) eliminates the only real downside of auto-cleanup — silent data loss when TOC geo flips. Same logic applies to MELIA/HLO `toc_is_deleted` rows already in the system, so it's consistent with existing patterns.

If product wants it sooner-and-simpler, **Option B** (daily cron) is fine — accept the small data-loss risk; the validator fix means orphans are no longer urgent.

**Avoid Option A**. Coupling cleanup to the harvest cron makes the harvest path heavier and less debuggable, with no benefit over B.

## Implementation Sketch (Option C)

1. Migration / synchronize: add `orphaned_at DATETIME NULL` to `porb_country_percentage` and `porb_location_benefit`. (TypeORM synchronize: just add the column to the entities.)
2. In `importTocToPorbTables`, after geo updates per program, run two SQL passes per table:
   - Mark newly-orphaned: `UPDATE … SET orphaned_at = NOW() WHERE program_id = ? AND is_manual = 0 AND orphaned_at IS NULL AND NOT EXISTS (… live-geo check …)`
   - Unmark restored: `UPDATE … SET orphaned_at = NULL WHERE program_id = ? AND is_manual = 0 AND orphaned_at IS NOT NULL AND EXISTS (… live-geo check …)`
3. Add a daily cron that hard-deletes `WHERE orphaned_at < NOW() - INTERVAL 30 DAY`.
4. Update `getCountryPercentage` and `getLocationBenefit` read paths to also filter `orphaned_at IS NULL` (currently they filter implicitly via the live-geo intersect — keep as-is, but make the intent explicit).
5. Update the validator (already filters via live-geo intersect) — no change needed if step 4 keeps current logic; revisit if we change how `orphaned_at` interacts with the validator.
6. Tests: add cases for (a) orphan marked on TOC removal, (b) orphan unmarked on TOC re-add, (c) hard-delete after grace period, (d) manual rows immune.

## Out of scope

- Cleaning up other PORB tables (HLO, MELIA, partner, bilateral) — those already use `toc_is_deleted` for soft-delete and have UI surface ("Deleted" badge + delete button). Different problem.
- Backfilling `orphaned_at` for existing rows — by the time this ships, the one-time cleanup has already run. New orphans will be timestamped going forward.
