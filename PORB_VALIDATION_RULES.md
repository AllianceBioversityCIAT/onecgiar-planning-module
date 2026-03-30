# PORB Validation Rules

This is the single source of truth for all validation rules in the PORB module. When adding or changing rules, update this file first.

---

## How to Read Each Rule

Every rule has 5 parts:

- **Section** — Which part of PORB this applies to
- **Rule** — What the system checks
- **What the user sees** — The error message or visual indicator
- **Prevents Mark As Complete?** — Whether this rule prevents the user from marking a center as complete
- **Blocks submit?** — Whether this prevents submission

---

## Current Rules

### Rule 1 — Pool Funding HLO: Budget requires assumption

| Field | Description |
|-------|-------------|
| **Section** | Pool Funding HLO |
| **Rule** | If a budget amount is entered, the user must also provide an assumption (explanation text). |
| **What the user sees** | The row is highlighted in red and a warning icon appears. The section tab and center tab also show a red icon. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No — the user can still submit, but the error icons remain visible as a reminder. |

---

### Rule 2 — MELIA Study: Budget requires assumption

| Field | Description |
|-------|-------------|
| **Section** | MELIA Study |
| **Rule** | If a budget amount is entered, the user must also provide an assumption. |
| **What the user sees** | Same as Rule 1 — red row highlight, warning icon on the row, section tab, and center tab. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |

---

### Rule 3 — W3/Bilateral: Budget requires assumption

| Field | Description |
|-------|-------------|
| **Section** | W3/Bilateral |
| **Rule** | If a budget amount is entered, the user must also provide an assumption. |
| **What the user sees** | Same red highlight and warning icons. Since W3/Bilateral is at the center level (not per-AOW), the error icon appears on the center tab only. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |
| **Notes** | W3/Bilateral is hidden when the "Unknown Center" (999999) is selected. |

---

### Rule 4 — Cross-Cutting: Budget requires assumption (AOW00 only)

| Field | Description |
|-------|-------------|
| **Section** | Cross-Cutting |
| **Rule** | If a budget amount is entered for a cross-cutting item under AOW00, the user must also provide an assumption. |
| **What the user sees** | Same red highlight and warning icons as other sections. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |
| **Notes** | There are 7 fixed cross-cutting items. Users cannot add or remove them. |

---

### Rule 5 — Anaplan: No validation

| Field | Description |
|-------|-------------|
| **Section** | Anaplan |
| **Rule** | No validation. Anaplan data is imported from an external system and is accepted as-is. |
| **What the user sees** | No errors are ever shown on the Anaplan section. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |

---

### Rule 6 — Partners (non-contracted): Budget requires assumption

| Field | Description |
|-------|-------------|
| **Section** | Partners (non-contracted) |
| **Rule** | If a budget amount is entered for a non-contracted partner, the user must also provide an assumption. |
| **What the user sees** | Red row highlight and warning icon, same as other sections. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |

---

### Rule 7 — Partners (contracted): Both budget AND assumption required

| Field | Description |
|-------|-------------|
| **Section** | Partners (contracted) |
| **Rule** | Contracted partners MUST have BOTH a budget amount AND an assumption filled in. Unlike other sections, leaving the budget empty is also an error for contracted partners. |
| **What the user sees** | Red row highlight and a specific message depending on what is missing: "Contracted partner requires budget and assumption" (both missing), "Contracted partner requires budget" (only budget missing), or "Contracted partner requires assumption" (only assumption missing). |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No |

---

### Rule 8 — Budget clearing: Confirmation when removing budget with assumption

| Field | Description |
|-------|-------------|
| **Section** | All budget sections |
| **Rule** | When a user clears a budget that previously had a value, and there is an assumption already written, the system asks for confirmation before deleting both. |
| **What the user sees** | A dialog box with two choices: "Delete Both" (removes the budget and the assumption) or "Cancel" (puts the budget value back). If there is no assumption, the budget is cleared silently. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | N/A — this is a confirmation prompt, not a validation error. |

---

### Rule 9 — Submission: Warn about incomplete centers

| Field | Description |
|-------|-------------|
| **Section** | Submission |
| **Rule** | When the user clicks Submit, the system checks if all centers have been marked as complete. If any centers are not complete, a warning is shown. |
| **What the user sees** | A dialog listing the incomplete centers and asking: "Do you want to proceed?" |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No — the user can choose to submit anyway. This is a soft warning only. |

---

### Rule 10 — Navigation tabs: Red warning icons on centers and AOWs with errors

| Field | Description |
|-------|-------------|
| **Section** | Navigation tabs (Centers and AOWs) |
| **Rule** | After any budget is saved, the system checks all sections across the entire program and shows red warning icons on any center or AOW tab that has validation errors. |
| **What the user sees** | A small red warning icon next to the center or AOW name in the navigation tabs. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | No — these are visual indicators only. |

---

### Rule 11 — Save feedback: Green flash on success, red highlight on failure

| Field | Description |
|-------|-------------|
| **Section** | All budget sections |
| **Rule** | After saving a budget value, the system shows visual feedback: a brief green flash if the save was successful, or a red highlight if the save failed. |
| **What the user sees** | Green flash (about 1 second) on success. Red highlight (stays until next save) on failure. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | N/A — this is feedback, not a validation rule. |

---

### Rule 12 — Partners: Budget must match Anaplan "Collaborators non-CGIAR Centers"

| Field | Description |
|-------|-------------|
| **Section** | Partners |
| **Rule** | The budgets reflected in the Partners table in the PORB should match the amounts recorded under "Collaborators non-CGIAR Centers" in the Anaplan section. |
| **What the user sees** | A red warning message in the Anaplan section indicating: "Budget does not match the amount included in the Partners section of the PORB." |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | Yes — the user must fix this before submitting. |

---

### Rule 13 — Submission: Total AOW budgets in Anaplan must match total AOW budgets in PORB

| Field | Description |
|-------|-------------|
| **Section** | Submission |
| **Rule** | Total AOW budgets in Anaplan should match total AOW budgets in the PORB. |
| **What the user sees** | A red warning message in the Anaplan section indicating: "Budget does not match the amount included in the AOW section of the PORB." |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | Yes — the user must fix this before submitting. |

---

### Rule 14 — All budget sections: Whole numbers only (no decimals)

| Field | Description |
|-------|-------------|
| **Section** | All budget sections (Pool HLO, Partners, MELIA, W3/Bilateral, Cross-Cutting, Anaplan) |
| **Rule** | Budget amounts must be whole numbers. Decimal values (e.g., 2000.25) are not allowed. |
| **What the user sees** | The input does not accept decimal points. If a decimal is entered, it is removed automatically. |
| **Prevents Mark As Complete?** | Yes |
| **Blocks submit?** | N/A — decimals are prevented at input level, so invalid values cannot be saved. |

---

## Quick Reference

| # | Section | What is checked | Prevents Mark As Complete? | Blocks submit? |
|---|---------|-----------------|---------------------------|----------------|
| 1 | Pool HLO | Budget entered → assumption required | Yes | No |
| 2 | MELIA | Budget entered → assumption required | Yes | No |
| 3 | W3/Bilateral | Budget entered → assumption required | Yes | No |
| 4 | Cross-Cutting | Budget entered → assumption required (AOW00) | Yes | No |
| 5 | Anaplan | No checks | Yes | No |
| 6 | Partners (non-contracted) | Budget entered → assumption required | Yes | No |
| 7 | Partners (contracted) | Both budget AND assumption required | Yes | No |
| 8 | Budget clearing | Asks to confirm when removing budget + assumption | Yes | N/A |
| 9 | Submission | Warns if centers are not marked complete | Yes | No (warning) |
| 10 | Navigation tabs | Shows red icons on tabs with errors | Yes | N/A |
| 11 | Save feedback | Green flash = saved, Red = failed | Yes | N/A |
| 12 | Partners | Partners budget must match Anaplan "Collaborators non-CGIAR Centers" | Yes | **Yes** |
| 13 | Submission | Total AOW budgets in Anaplan must match total AOW budgets in PORB | Yes | **Yes** |
| 14 | All budget sections | Whole numbers only — no decimals allowed | Yes | N/A (prevented at input) |

---

## How to Add a New Rule

Copy the template below, fill it in, and add it above this section:

```
### Rule [NUMBER] — [Section]: [Short description]

| Field | Description |
|-------|-------------|
| **Section** | [Which section? e.g., Partners, MELIA, Pool HLO, all sections] |
| **Rule** | [What should the system check?] |
| **What the user sees** | [What message or indicator should appear?] |
| **Prevents Mark As Complete?** | [Yes / No] |
| **Blocks submit?** | [Yes / No / Warning only] |
| **Notes** | [Any extra details or exceptions. Remove this row if none.] |
```

Also update the Quick Reference table above.
