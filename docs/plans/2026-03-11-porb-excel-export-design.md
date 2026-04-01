# PORB Excel Export — Match Submission Structure

## Goal
Rewrite the PORB Excel export to match the approved submission export structure exactly, with shared styling utilities for maintainability and ID columns for future import support.

## Sheets (7 total)

### 1. Summary
- **Source**: `getSummaryConsolidation(programId)`
- **Header**: 3 rows with merged cells (matches `generateExcelSummaryConsolidated`)
  - Row 0: `Area of Work` | `Pooled Funding` (colspan 11) | `W3/ Bilateral Project (USD)` (rowspan 3)
  - Row 1: `Innovation Development` (colspan 2) | `Knowledge product` (colspan 2) | `Capacity Sharing` (colspan 2) | `Others outputs` (colspan 2) | `Partner budget` (rowspan 2) | `MELIA Studies budget` (rowspan 2) | `Total Pooled Funding budget (USD)` (rowspan 2)
  - Row 2: `Target` | `Budget` | `Target` | `Budget` | `Target` | `Budget` | `Target` | `Budget`
- **Data**: One row per AOW with targets/budgets from summary data
- **Footer**: Total row with dark navy style
- **Last column**: `aow_id`
- **Column widths**: 30, 12, 15, 12, 15, 12, 15, 12, 15, 25, 25, 35, 30, 10

### 2. HLO
- **Source**: `getHlos(programId, undefined, centerId)`
- **Header**: 2 rows with merged cells
  - Row 0: `AOW` (rowspan 2) | `High Level Output` (rowspan 2) | `Key Performance Indicators` (colspan 5) | `Total Budget (USD)` (rowspan 2)
  - Row 1: `Description` | `Type` | `Geographic Location` | `Target` | `Budget (USD)`
- **Data**: Grouped by AOW. Per HLO, one row per indicator. HLO name merged across indicator rows. Total Budget merged across indicator rows.
- **Subtotal**: "HLO budget subtotal" row per AOW (light gray)
- **AOW column**: Merged vertically per AOW group, dark navy style
- **Last column**: `id` (porb_hlo.id)
- **Column widths**: 8, 40, 30, 30, 30, 10, 15, 20, 10

### 3. Partner
- **Source**: `getPartners(programId, undefined, centerId)` — returns contracted partner data with center/geo/budget
- **Header**: 1 row: `AOW` | `Partner` | `Center` | `Geographic location` | `Total Budget (USD)`
- **Data**: Grouped by AOW. Per partner, one row per contracted center. Partner name merged across center rows. Budget merged across center rows.
- **Subtotal**: "Contracted partners subtotal" row per AOW (light gray, merge B-D)
- **AOW column**: Merged vertically per AOW group
- **Last column**: `id` (porb_contracted_partner.id)
- **Column widths**: 8, 40, 30, 30, 30, 10

### 4. W3-Bilateral
- **Source**: `getBilaterals(programId, undefined, centerId)`
- **Header**: 1 row: `AOW` | `Project title` | `High Level Output title` | `W3/Bilateral Project (USD)`
- **Data**: Grouped by AOW. One row per bilateral.
- **Subtotal**: "W3/Bilateral budget subtotal" row per AOW (light gray, merge B-C)
- **AOW column**: Merged vertically per AOW group
- **Last column**: `id` (porb_bilateral.id)
- **Column widths**: 8, 40, 30, 30, 10

### 5. MELIA
- **Source**: `getMelia(programId, undefined, centerId)`
- **Header**: 1 row: `AOW` | `MELIA study` | `Supported outcomes` | `Geographic location` | `Total Budget (USD)`
- **Data**: Grouped by AOW. One row per MELIA.
- **Subtotal**: "MELIA budget subtotal" row per AOW (light gray, merge B-D)
- **AOW column**: Merged vertically per AOW group
- **Last column**: `id` (porb_melia.id)
- **Column widths**: 8, 40, 30, 30, 25, 10

### 6. Cross Cutting
- **Source**: `getCross(programId, undefined, centerId)` + cross-cutting item lookup
- **Header**: 1 row: `AOW` | `Cost elements` | `Total budget (USD)`
- **Data**: Grouped by AOW. One row per cross-cutting item.
- **AOW column**: Merged vertically per AOW group
- **Last columns**: `id` (porb_cross.id), `cross_id` (cross_cutting_id)
- **Column widths**: 10, 40, 25, 10, 10

### 7. Anaplan
- **Source**: `porbAnaplanRepository` with anaplan relation
- **Header**: 1 row: `Main Accounts` | AOW01 | AOW02 | ... | `Total budget (USD)`
- **Data**: One row per anaplan label. Cell values = sum of budgets across centers for that AOW+anaplan combo.
- **Footer**: Subtotal row with SUM formulas (dark navy)
- **Row totals**: SUM formula across AOW columns
- **Last columns**: (no ID needed — data is aggregated)
- **Column widths**: 25, 10×N (AOW columns), 20

## Shared Styling (defined once as class properties)

```typescript
// Already exists — reuse/update:
headerStyle      // #2B3C53, white bold, centered, thin black borders
cellStyle        // wrap, thin gray borders (existing — update to thin black borders to match submission)
numberStyle      // right-aligned + numFmt

// New:
subTotalRowStyle // #E6E6E6, bold black, centered, thin borders
wpVerticalStyle  // #2B3C53, white bold, centered, thin borders (for AOW merged column)
totalRowStyle    // #2B3C53, white bold, centered (for Summary total + Anaplan subtotal)
```

## Shared Utility Method

```typescript
applySheetStyles(ws, wsData, options: {
  headerRowCount: number;
  subtotalDetector?: (row: any[]) => boolean;
  wpColumnIndex?: number; // column index for AOW vertical merge styling
  numberColumns?: number[]; // columns that get number formatting
  rowHeights?: { header: number; data: number; subtotal: number };
})
```

Single method replaces per-sheet styling loops. Each sheet builder calls it with its config.

## ID Columns

All ID columns placed as last column(s) with same header style. Column width: 10. These are for programmatic use (future import), not for end-user display.

## File Changes

Only `back-end/src/porb/porb.service.ts`:
- Update shared style constants (add subTotalRowStyle, wpVerticalStyle, totalRowStyle)
- Update `applyDataStyles` → `applySheetStyles` (new unified method)
- Rewrite 7 sheet generators to match submission structure
- No changes to controller, endpoints, or ZIP logic
