# MELIA duplicate groups — pre-cleanup review

**Generated:** 2026-04-25 (local DB `planning_prod`)
**Total duplicate groups:** 31 across 5 programs (47, 48, 50, 53, 57)
**Total rows in those groups:** 63

Each group below shares `(program_id, toc_id, center_id, porb_aow_id)`. The cleanup
SQL would collapse each group to a single row. **No group has two rows with
non-zero budgets**, so no money is at risk of being silently dropped — the row
with the budget is always the keeper. Groups marked **money** have user-entered
budget data; groups marked **empty** are all zero.

Columns: `id` `prog` `aow` `ctr` `budget` `asm`(=Y if assumption present) `del`(=toc_is_deleted) `updated`

---

## Program 47 — 1 group  (empty)

### Group: toc_id `58e90dd4-...` / center 66 / aow 176
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 455 | 0      |     | 0   | 2026-04-16 16:36 | "methodology for improved assessment of innovation users..." |
| 457 | 0      |     | 0   | 2026-04-16 18:15 | "Methodology for improved assessment of innovation users..." (capitalised M) |
**Keeper:** 457 (latest updated, both empty). **Budget kept:** 0.

---

## Program 48 — 5 groups  (2 with money, 3 empty)

### Group: toc_id `0beed620-...` / center 46 / aow 178   ⚠️ **money**
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 331 | 0      |     | 0   | 2026-04-17 20:30 | "Landscape appropriate Impact Assessment system implementation " |
| 551 | **66** | Y   | 0   | 2026-04-25 13:58 | " Deliverable - MELIA STUDY Landscape appropriate Impact Assessment system implementation: cross country..." |
**Keeper:** 551. **Budget kept:** 66. **Assumption kept:** yes (only one row has it).

### Group: toc_id `0e793cee-...` / center 89 / aow 178   (empty)
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 333 | 0      |     | 0   | 2026-04-17 20:30 | "Landscape appropriate impact assessment data collection for Kenya" |
| 552 | 0      |     | 0   | 2026-04-24 17:23 | " Deliverable - MELIA STUDY ... data collection for Kenya..." |
**Keeper:** 552. **Budget kept:** 0.

### Group: toc_id `7f643a56-...` / center 99 / aow 178   (empty)
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 329 | 0      |     | 0   | 2026-04-17 20:30 | " Landscape appropriate Impact Assessment implementation: System Level Theory of Change" |
| 555 | 0      |     | 0   | 2026-04-24 17:36 | " Deliverable - Critical Capabilities - MELIA STUDY ..." |
**Keeper:** 555. **Budget kept:** 0.

### Group: toc_id `aad589d0-...` / center 46 / aow 178   ⚠️ **money** (3 rows)
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 332 | 0      |     | 0   | 2026-04-17 20:30 | "Landscape appropriate Impact Assessment baseline data collection in Peru and Colombia" |
| 550 | **99** | Y   | 0   | 2026-04-25 13:58 | "Deliverable - MELIA STUDY ... system implementation: cross..." |
| 554 | 0      |     | 0   | 2026-04-24 17:28 | "Deliverable: MELIA STUDY ... data collection in Peru and Colombia..." |
**Keeper:** 550. **Budget kept:** 99. **Assumption kept:** yes.

### Group: toc_id `e36422d5-...` / center 89 / aow 178   (empty)
| id  | budget | asm | del | updated          | name |
|-----|--------|-----|-----|------------------|------|
| 330 | 0      |     | 0   | 2026-04-17 20:30 | "Midline/endline data collection from randomized controlled trial..." |
| 553 | 0      |     | 0   | 2026-04-24 17:25 | "Deliverable - MELIA STUDY Midline/endline data collection from RCT..." |
**Keeper:** 553. **Budget kept:** 0.

---

## Program 50 — 9 groups  (all empty)

All groups in program 50 have identical `melia_name`, identical `updated_at`, identical zero budgets — these look like clean duplicates from a re-import.

| group toc_id (truncated) | aow | ctr | rows | ids |
|--------------------------|-----|-----|------|-----|
| `dbbbfea6-...` | 193 | 49 | 2 | 361, 428 |
| `dbbbfea6-...` | 195 | 49 | 2 | 362, 429 |
| `e5ac8b5a-...` | 191 | 49 | 2 | 359, 435 |
| `e5ac8b5a-...` | 192 | 49 | 2 | 358, 434 |
| `e5ac8b5a-...` | 195 | 49 | 2 | 360, 436 |
| `e86324c4-...` | 190 | 49 | 2 | 370, 431 |
| `e86324c4-...` | 191 | 49 | 2 | 369, 430 |
| `e86324c4-...` | 194 | 49 | 2 | 371, 432 |
| `e86324c4-...` | 195 | 49 | 2 | 372, 433 |

**Keepers:** the lower id wins each (timestamps and budgets are tied). **Budget kept:** 0 in all groups.

---

## Program 53 — 15 groups  (12 with money, 3 empty)

⚠️ Important pattern in program 53: for every "money" group, the row WITH the budget has a renamed `melia_name` (e.g. `A5P11.x` → `A5P12.x`) and is the row that survives. The 0-budget row is the older name.

### Money groups (12)
| toc_id (trunc) | aow | ctr | rows | ids → keeper | budget kept |
|----------------|-----|-----|------|--------------|-------------|
| `36de1593-...` | 204 | 46  | 2 | 472(0), **494**(40000✓) | 40000 |
| `42d2aaf2-...` | 204 | 52  | 2 | 476(0), **499**(10000✓) | 10000 |
| `5cb06bee-...` | 204 | 66  | 2 | 463(0), **496**(10000✓) | 10000 |
| `5fcd5f64-...` | 204 | 67  | 2 | 529(0), **531**(50000✓) | 50000 |
| `869bbdca-...` | 204 | 89  | 2 | 474(0), **513**(20000✓) | 20000 |
| `92873614-...` | 204 | 67  | 2 | 475(0), **495**(10000✓) | 10000 |
| `99d209ee-...` | 204 | 172 | 2 | 478(0), **534**(10000✓) | 10000 |
| `a313ea76-...` | 204 | 50  | 2 | 471(0), **493**(40000✓) | 40000 |
| `a3cde2d4-...` | 204 | 172 | 2 | 470(0), **533**(24844✓) | 24844 |
| `ba5ff5db-...` | 204 | 99  | 2 | 480(0), **500**(10000✓) | 10000 |
| `c053e32e-...` | 204 | 5   | 2 | 473(0), **510**(20000✓) | 20000 |
| `e91a65bd-...` | 204 | 1279| 2 | 479(0), **516**(20000✓) | 20000 |

### Empty groups (3)
| toc_id (trunc) | aow | ctr | rows | ids → keeper |
|----------------|-----|-----|------|--------------|
| `5cb06bee-...` | 201 | 66  | 2 | 488(0), **497**(0) (latest updated) |
| `5cb06bee-...` | 206 | 66  | 2 | 489(0), **498**(0) (latest updated) |
| `ba5ff5db-...` | 206 | 99  | 2 | 490(0), **501**(0) (latest updated) |

---

## Program 57 — 1 group  ⚠️ **money**

### Group: toc_id `0e4b3e7a-...` / center 1279 / aow 225
| id  | budget   | asm | del | updated          | name |
|-----|----------|-----|-----|------------------|------|
| **421** | **35000** | Y   | 0   | 2026-04-20 17:12 | "Baseline study on the use of germplasm and associated data sourced from CGIAR Genebanks" |
| 456 | 0        |     | 0   | 2026-04-20 17:12 | "Study on the use of germplasm and associated data sourced from CGIAR Genebanks" |

**Keeper:** 421 (it has the budget). **Budget kept:** 35000. **Assumption kept:** yes.

⚠️ Note this is the **only group where the older row (lower id) has the budget**, not the newer one. The current keeper rule (highest budget wins) handles this correctly — 421 is selected because of its 35000 budget, not because of timestamp.

---

## Summary of money preservation (15 money groups in total)

| program | money groups | total budget across keepers (USD) |
|---------|--------------|-----------------------------------|
| 48      | 2            | 165 |
| 53      | 12           | 264,844 |
| 57      | 1            | 35,000 |
| **all** | **15**       | **300,009** |

In every money group, exactly one row has a non-zero budget; the keeper rule
selects that row. After cleanup, the total of `melia_budget` across all
keepers will be the same as the total across all current rows — **no dollars
are dropped**.

---

## Things to spot-check before running

1. **Program 53 "A5P11.x" vs "A5P12.x" naming** — is this an intentional TOC
   re-numbering (P11 = old plan / P12 = current plan)? If yes, keeping the
   newer "P12" row with the budget is correct. If "P11" rows were also
   meaningful, we'd be losing the older series.
2. **Program 57 group** — keeper is the *older* row (id 421) because it has
   the budget. The newer row (456) is the renamed-and-emptied version. Make
   sure 421's name is the one you want surfaced post-cleanup; if the new
   shorter name is preferred, the script's name-canonicalisation step will
   pick the most-recent-updated row's name (456) and copy it onto 421.
3. **Program 50 — 9 perfect duplicates** — all rows in each group are
   byte-identical (same name, same updated_at, same budget=0). Looks like a
   re-import bug. Safe to collapse.
