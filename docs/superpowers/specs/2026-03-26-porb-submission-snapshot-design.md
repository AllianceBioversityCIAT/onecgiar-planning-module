# PORB Submission Snapshot & Read-Only View

**Date**: 2026-03-26
**Status**: Approved

## Summary

When a PORB is submitted, save a full row-level JSON snapshot (`porb_data`) on the `Submission` entity. Submitted versions can be viewed read-only (full PORB experience with `canEdit: false`) and exported as ZIP — both sourced from the snapshot, not live DB.

## Design

### 1. Data Snapshot

**Column**: `porb_data` (longtext, nullable) on existing `Submission` entity.

**JSON Structure**:
```json
{
  "snapshot_version": 1,
  "program_id": 123,
  "submitted_at": "2026-03-26T...",
  "aows": [
    {
      "id": 1, "toc_id": "...", "aow_name": "AOW01", "aow_acrnum": "AOW01",
      "centers": [
        {
          "center_code": "ABC", "center_name": "Center ABC",
          "hlos": [ { ...full row fields... } ],
          "partners": [ { ...partner + contracted_partners nested... } ],
          "melias": [ { ...full row fields... } ],
          "anaplan": [ { ...full row fields... } ],
          "cross_cutting": [ { ...full row fields... } ],
          "country_percentages": [ { ...full row fields... } ]
        }
      ]
    }
  ],
  "bilaterals": [
    { "center_code": "ABC", "center_name": "...", ...full row fields... }
  ]
}
```

- Organized by AOW → Center → Section (matches UI hierarchy)
- Bilaterals at top level (center-level, not per-AOW)
- No pre-computed consolidation — computed on-the-fly from row data
- `snapshot_version: 1` for future schema evolution

### 2. Backend Changes

**Entity**: Add `porb_data` column to `Submission`.

**Submit** (`POST /porb/submit/:program_id`): After validation, query all porb_* tables, build JSON, store in `porb_data`. Existing `toc_data` snapshot preserved as-is.

**Read endpoint** (`GET /porb/version/:submission_id`): Returns parsed `porb_data`. Auth: approved versions viewable by any authenticated user; pending/rejected restricted to program team + admins.

**Export ZIP** (`GET /porb/version/:submission_id/zip`): Builds Excel workbooks from `porb_data` JSON (not live DB). Same structure as current ZIP export.

### 3. Frontend Changes

**Route**: `/porb/:program_id/version/:submission_id` → `PorbVersionViewComponent`

**Header bar**: Program name, "Submitted by X on Y", status badge, "Export ZIP" button.

**Body**: Reuses existing PORB layout — center nav → AOW nav → section nav → budget tables + summary tab. All section components receive `canEdit: false` (already supported). Data fed from parsed JSON snapshot.

**Submitted versions list**: "View" button routes to new page when `porb_data` exists, old page otherwise.

### 4. What's NOT Changing

- Old submission view pages (untouched)
- Existing `toc_data` column/behavior
- Section component APIs (just passing `canEdit: false`)
- Current draft PORB editor
