# PORB Synergy Programs & Outcomes

## Context

The existing submission module displays Synergy Programs and Outcomes as read-only TOC data per AOW. These sections are missing from the PORB module. This design adds both as read-only summary sections in PORB, stored in dedicated tables, auto-harvested from TOC, included in submission snapshots, version views, and Excel exports.

## Database Entities

### `porb_synergy`

Read-only TOC data. No budget/assumption columns. Per-AOW (not per-center).

| Column | Type | Notes |
|--------|------|-------|
| `id` | int, PK, auto-increment | |
| `program_id` | int, FK → initiative | CASCADE delete |
| `porb_aow_id` | int, FK → porb_aow, nullable | SET NULL on delete |
| `toc_id` | uuid | Dedup key |
| `synergy_program_name` | mediumtext | `flow.title` — Program or Accelerator |
| `synergy_hlo_title` | mediumtext | `result.title` — High Level Output |
| `synergy_description` | mediumtext, nullable | Brief description of contribution |
| `toc_is_deleted` | boolean, default false | |
| `created_at` | datetime (CreateDateColumn) | |
| `updated_at` | datetime (UpdateDateColumn) | |
| `toc_updated_at` | datetime, nullable | |
| `toc_created_at` | datetime, nullable | |

**Entity file:** `back-end/src/entities/porb-synergy.entity.ts` (follow `porb-melia.entity.ts` pattern)

### `porb_outcome`

Read-only TOC data. No budget/assumption columns. Per-AOW (not per-center).

| Column | Type | Notes |
|--------|------|-------|
| `id` | int, PK, auto-increment | |
| `program_id` | int, FK → initiative | CASCADE delete |
| `porb_aow_id` | int, FK → porb_aow, nullable | SET NULL on delete |
| `toc_id` | uuid | Dedup key (outcome node `related_node_id` or `id`) |
| `outcome_title` | mediumtext | Outcome name |
| `outcome_type` | varchar, nullable | `type_of_outcome.name` (e.g., "Capacity", "Uptake") |
| `outcome_indicators` | json, nullable | Array of `{type, description, location, target_value}` |
| `toc_is_deleted` | boolean, default false | |
| `created_at` | datetime (CreateDateColumn) | |
| `updated_at` | datetime (UpdateDateColumn) | |
| `toc_updated_at` | datetime, nullable | |
| `toc_created_at` | datetime, nullable | |

**Entity file:** `back-end/src/entities/porb-outcome.entity.ts`

## TOC Auto-Harvest

Add processing blocks in `importTocToPorbTables()` following the existing HLO upsert pattern.

### Synergy Programs

- **Source:** `dd?.data?.synergy_programs` filtered by `result.category == 'OUTPUT'`
- **Dedup key:** `toc_id`
- **AOW matching:** `group` / `parent_id` → resolve to `porb_aow_id`
- **Upsert:** Compare existing by `toc_id`, update changed name/description/hlo_title, insert new rows, call `syncTocDeletedFlags()` for removed items

### Outcomes

- **Source:** `filteredData` filtered by `category == 'OUTCOME'`
- **Dedup key:** `toc_id` (from `related_node_id` or `id`)
- **AOW matching:** Same `group` / `parent_id` resolution
- **Indicators:** Extract from `quantitative_indicators` array. For each indicator, store `{type: indicator.type.value, description: indicator.description, location: target.location, target_value: target[activePhase.reportingYear]}`
- **Upsert:** Same pattern as synergy — compare, update, insert, sync deleted flags

### Clear PORB Data

Add `porbSynergyRepository` and `porbOutcomeRepository` to `clearAllData()` (child-first FK order, before `porb_aow` deletion).

## Backend API

### No new endpoints

Both sections use the existing `GET /porb/summary-aow-detail` endpoint.

### Extend `getSummaryAowDetail()` return value

```typescript
return {
  ...existingFields,
  synergies: PorbSynergy[],   // where program_id + porb_aow_id match, toc_is_deleted = false
  outcomes: PorbOutcome[],     // where program_id + porb_aow_id match, toc_is_deleted = false
};
```

### Submission snapshot (`buildPorbSnapshot`)

Add `synergies` and `outcomes` arrays to each AOW object (per-AOW, not nested under centers):

```typescript
aows: [{
  ...existingFields,
  synergies: [...],
  outcomes: [...],
  centers: [...]
}]
```

### Module registration

Register both entities in `porb.module.ts` TypeOrmModule.forFeature imports. Inject repositories in `porb.service.ts`.

## Frontend Summary Display

### Section navigation

Add "Synergy Programs" and "Outcomes" to `summarySectionItems` after existing sections. Both sections are always visible (show "The data is missing in the TOC" when empty, not disabled).

### Cached data

Add in `computeSummaryDetailCache()`:
- `cachedFormattedSynergies` — mapped from `summaryAowDetail.synergies`
- `cachedFormattedOutcomes` — mapped from `summaryAowDetail.outcomes`, with indicators flattened for display
- `cachedSummarySectionEmpty.synergies` / `.outcomes` — boolean flags

### Synergy Programs table

Read-only, no budget column:

| Program or Accelerator | High Level Output | Brief description |
|------------------------|-------------------|-------------------|
| `synergy_program_name` | `synergy_hlo_title` | `synergy_description` |

### Outcomes table

Read-only, with indicator rows:

| Outcome | Type of Outcome | Indicator | Geographic Location | Target Value |
|---------|-----------------|-----------|---------------------|--------------|
| `outcome_title` (rowspan) | `outcome_type` (rowspan) | `indicator.type` | `indicator.location` | `indicator.target_value` |

Outcomes with multiple indicators use rowspan merging on Outcome + Type columns.

### Empty state

`ng-template` with "The data is missing in the TOC" message.

### Version view

Same read-only tables rendered from snapshot data. No special handling needed — these sections are already read-only.

## Excel Export

### "Synergy Programs" sheet

- **Headers:** AOW | Program or Accelerator | High Level Output | Brief description | id (hidden)
- Grouped by AOW with vertical merge on AOW column
- No budget/assumption columns
- `protectAndHideIds()` on id column

### "Outcomes" sheet

- **Headers:** AOW | Outcome | Type of Outcome | Indicator Type | Geographic Location | Target Value | id (hidden)
- Grouped by AOW with vertical merge on AOW column
- Outcomes with multiple indicators get rowspan merge on Outcome + Type columns
- `protectAndHideIds()` on id column

Both sheets use standard PORB styling (dark header `#2B3C53`, centered, wrapped text). Included in all export paths via `buildPorbWorkbook()`.

## Files to Modify

### Backend (new)
- `back-end/src/entities/porb-synergy.entity.ts`
- `back-end/src/entities/porb-outcome.entity.ts`

### Backend (modify)
- `back-end/src/porb/porb.module.ts` — register entities
- `back-end/src/porb/porb.service.ts` — import processing, summary detail, snapshot, clear data, Excel sheets

### Frontend (modify)
- `front-end/src/app/porb/porb.component.ts` — cached data, section nav, section empty checks
- `front-end/src/app/porb/porb.component.html` — summary detail templates for both sections

## Verification

1. **Backend type-check:** `cd back-end && npx tsc --noEmit`
2. **Frontend build:** `cd front-end && npx ng build --configuration=development`
3. **TOC harvest:** Trigger manual TOC import from Admin Danger Zone, verify `porb_synergy` and `porb_outcome` tables are populated
4. **Summary display:** Navigate to PORB Summary → Detailed → select an AOW → verify Synergy Programs and Outcomes sections show correct data
5. **Empty state:** Check an AOW with no synergy/outcome data shows "The data is missing in the TOC"
6. **Version view:** Submit a PORB, open the version view, verify both sections render from snapshot
7. **Excel export:** Export PORB Excel/ZIP, verify "Synergy Programs" and "Outcomes" sheets exist with correct data
8. **Clear data:** Use Admin Danger Zone "Clear PORB Data", verify both tables are emptied and re-harvested by cron
