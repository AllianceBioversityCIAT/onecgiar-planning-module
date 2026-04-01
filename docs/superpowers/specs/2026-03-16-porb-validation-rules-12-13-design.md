# PORB Validation Rules 12, 13 + Whole Number Enforcement

## Summary

Three changes to the PORB validation system:

1. **Rule 12** — Non-contracted partners budget must match Anaplan "Collaborators non-CGIAR Centers" (per AOW per center)
2. **Rule 13** — Total Anaplan budget must match PORB pooled budget (HLO + Cross-Cutting) (per AOW per center)
3. **Whole numbers only** — No decimal values allowed in any budget input

Rules 12 and 13 are the first rules that **block submission** and **prevent Mark As Complete**.

---

## Rule 12: Partners Budget vs Anaplan Account

### What is compared

- **Left side**: Sum of all **non-contracted** partner budgets for a given AOW + center
- **Right side**: Anaplan budget for account labeled **"Collaborators non-CGIAR Centers"** for the same AOW + center

### When it runs

- Real-time after any budget save (same as Rules 1-7)
- Part of per-AOW validation (`getValidation`) and program-wide validation (`getValidationSummary`)

### Error behavior

- Anaplan section shows red warning: "Budget does not match the amount included in the Partners section of the PORB."
- Center tab and AOW tab show red error icons
- Blocks Mark As Complete
- Blocks Submit

### Tolerance

- Exact match required (no tolerance). Whole numbers enforced separately.

---

## Rule 13: Anaplan Total vs PORB Pooled Budget

### What is compared

- **Left side**: Sum of ALL Anaplan account budgets for a given AOW + center
- **Right side**: Sum of **Pool HLO + Cross-Cutting** budgets for the same AOW + center

### When it runs

- Same as Rule 12: real-time + validation endpoints

### Error behavior

- Anaplan section shows red warning: "Budget does not match the amount included in the AOW section of the PORB."
- Center tab and AOW tab show red error icons
- Blocks Mark As Complete
- Blocks Submit

### Tolerance

- Exact match required.

---

## Whole Number Enforcement

### Scope

All budget inputs across all sections: Pool HLO, Partners, MELIA, W3/Bilateral, Cross-Cutting, Anaplan.

### Frontend

- Budget inputs reject decimal points. Strip or prevent `.` character on input.
- On blur, if a decimal somehow gets through, truncate to whole number.

### Backend

- Budget save endpoints reject or round decimal values.
- `parseBudget()` helper should `Math.round()` or reject non-integer values.

---

## Backend Changes

### `porb.service.ts` — `getValidation()`

Currently the Anaplan section always returns `{ hasError: false, message: '' }`. Change to:

1. Query non-contracted partners budget sum for this AOW + center
2. Query Anaplan budget for "Collaborators non-CGIAR Centers" account for this AOW + center
3. Query all Anaplan budgets sum for this AOW + center
4. Query HLO + Cross-Cutting budget sum for this AOW + center
5. Compare for Rule 12 and Rule 13
6. Return error messages if mismatched

Since Anaplan can now have TWO different errors, change the return format for Anaplan from a single object to include both messages (or combine into one message string with both errors listed).

### `porb.service.ts` — `getValidationSummary()`

Add Rule 12 and Rule 13 checks across all AOWs and centers. When either fails, add the center code to `center_error_codes` and the AOW ID to `aow_error_ids`.

### `porb.service.ts` — `submitPorb()`

Before creating the Submission record, call `getValidationSummary()`. If `center_error_codes` or `aow_error_ids` are non-empty, return an error response with the list of problems instead of proceeding.

### Budget save endpoints

All `update*()` methods: round budget to integer or reject decimals.

---

## Frontend Changes

### `anaplan-section.component.ts`

- Add section-level warning banner(s) at the top of the Anaplan table
- Display Rule 12 and/or Rule 13 error messages from `sectionValidation['Anaplan']`
- The validation data comes from the parent `porb.component.ts` via `sectionValidation` input

### `budget-and-assumption.component.ts`

- Prevent decimal point entry in the input field
- On blur, ensure value is a whole number

### `anaplan-section.component.html`

- Add decimal prevention to Anaplan budget inputs (same approach)

### `porb.component.ts` — `onSubmitClicked()`

- Before showing the incomplete centers warning, call a validation check
- If Rule 12 or 13 errors exist, show a **blocking** dialog (not soft warning) listing the mismatches
- User cannot proceed past this dialog — must fix errors first

### All section components

- `parseBudgetValue()`: add `Math.round()` or `Math.floor()` to strip decimals

---

## Error Messages (exact text)

| Rule | Message |
|------|---------|
| Rule 12 | "Budget does not match the amount included in the Partners section of the PORB." |
| Rule 13 | "Budget does not match the amount included in the AOW section of the PORB." |

---

## Data Flow

```
User saves budget (any section)
  → Backend saves value
  → Frontend calls refreshSectionValidation() + refreshValidationSummary()
  → Backend getValidation() now includes Rule 12 + 13 checks for Anaplan
  → Backend getValidationSummary() includes Rule 12 + 13 in error codes
  → Frontend shows Anaplan warnings + red tab icons
  → Mark As Complete blocked if errors exist (existing behavior)
  → Submit blocked if Rule 12/13 errors exist (new behavior)
```

---

## Files to modify

| File | Change |
|------|--------|
| `back-end/src/porb/porb.service.ts` | `getValidation()`, `getValidationSummary()`, `submitPorb()`, budget save methods |
| `front-end/src/app/porb/porb.component.ts` | `onSubmitClicked()` submit blocking |
| `front-end/src/app/porb/porb.component.html` | Anaplan section warning display |
| `front-end/src/app/porb/components/.../anaplan/anaplan-section.component.ts` | Warning banner logic |
| `front-end/src/app/porb/components/.../anaplan/anaplan-section.component.html` | Warning banner HTML |
| `front-end/src/app/porb/components/.../budget-and-assumption.component.ts` | Decimal prevention |
| All section components | `parseBudgetValue()` whole number enforcement |
