# PORB Validation Rules 12, 13 + Whole Number Enforcement

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new cross-section validation rules (Partners vs Anaplan, Anaplan vs PORB pooled) that block submission, and enforce whole-number-only budget inputs.

**Architecture:** Backend `getValidation()` and `getValidationSummary()` gain new Anaplan checks that compare budgets across sections. `submitPorb()` gains a validation gate. Frontend adds warning banners in the Anaplan section and strips decimals from all budget inputs.

**Tech Stack:** NestJS/TypeORM (backend), Angular 19 (frontend)

---

## Chunk 1: Backend Validation

### Task 1: Add Rule 12 + Rule 13 to `getValidation()`

**Files:**
- Modify: `back-end/src/porb/porb.service.ts:571-675` (getValidation method)

- [ ] **Step 1: Add Anaplan + partner + HLO + cross queries to getValidation**

In `getValidation()`, after the existing `Promise.all` on line 582, add queries for Anaplan rows, and reuse existing data for the new comparisons. Replace the Anaplan "always pass" line (659) with actual validation:

```typescript
// Inside getValidation(), after line 598 (selectedAow query), add to the Promise.all:
// Add porbAnaplanRepository query and reuse existing partners/contractedRows/hlos/crossRows

// After existing section validations (after line 673), replace line 659:
// --- Rule 12: Non-contracted partners budget vs Anaplan "Collaborators non-CGIAR Centers" ---
const anaplanRows = await this.porbAnaplanRepository.find({
  where: { program_id, porb_aow_id, center_id },
  relations: ['anaplan'],
});

// Sum non-contracted partner budgets for this AOW+center
const nonContractedPartnerBudget = (() => {
  let total = 0;
  for (const partner of partners) {
    if (partner?.toc_is_deleted) continue;
    const contracted = relevantContracted.find(
      (c) => c.porb_partner_id === partner.id,
    );
    if (contracted) continue; // skip contracted partners
    // Non-contracted partners don't have budget in contracted table — they have no budget rows
    // Actually: ALL partner budgets are in porb_contracted_partners table
    // "Non-contracted" = porb_partner rows that DON'T have a matching porb_contracted_partners row
    // These partners have NO budget, so their total is 0
  }
  // Wait — re-reading the data model:
  // porb_partner has NO budget column
  // porb_contracted_partners has the budget column
  // partner_is_contracted is computed as '1' if a contracted row exists, '0' otherwise
  // So "non-contracted partners" = partners WITHOUT a porb_contracted_partners row = budget is 0/null
  // This means Rule 12 compares 0 vs Anaplan account — that can't be right
  // Let me re-check: the user said "non-contracted partners budget"
  // Looking at getPartners(): partner_budget = contracted?.budget ?? null
  // So ALL partner budgets come from porb_contracted_partners regardless of contracted status
  // The "is_contracted" field is just about whether the partner has a contracted row at all
  // ALL partners that have budget have it through porb_contracted_partners
  // So "non-contracted partner budget" likely means sum of ALL partner budgets (from contracted table)
  return total;
})();
```

Wait — I need to re-examine the data model more carefully.

- [ ] **Step 1 (revised): Clarify partner budget source**

Reading `getPartners()` (line 168-182): ALL partner budgets come from `porb_contracted_partners` table via `contractedMap.get(partner.id)`. The `partner_is_contracted` field is set to `'1'` if a contracted row exists, `'0'` otherwise. So every partner that has a budget has it stored in `porb_contracted_partners`.

For Rule 12, "non-contracted partners budget" = sum of `porb_contracted_partners.budget` for partners where `partner_is_contracted` would be computed as `'0'`... but that's impossible since `partner_is_contracted = '1'` exactly when a `porb_contracted_partners` row exists.

**Resolution:** The user likely means the total of ALL partner budgets for this AOW+center (since all budgets are in the contracted table). The comparison is: **total partner budget for this AOW+center** vs **Anaplan "Collaborators non-CGIAR Centers" budget for same AOW+center**.

> **NOTE TO IMPLEMENTOR:** Confirm with the user that "non-contracted partners" means ALL partners' budget total. If not, adjust the filter accordingly.

For now, proceed with: sum of ALL `porb_contracted_partners.budget` where the partner belongs to this AOW.

- [ ] **Step 2: Implement Rule 12 + 13 in getValidation()**

In `back-end/src/porb/porb.service.ts`, modify `getValidation()`. Add after the existing `Promise.all` (line 582), include `porbAnaplanRepository` query. Then replace line 659 (`emptyResult['Anaplan'] = { hasError: false, message: '' };`) with:

```typescript
// --- Anaplan validation (Rules 12 & 13) ---
const anaplanRows = await this.porbAnaplanRepository.find({
  where: { program_id, porb_aow_id, center_id },
});
const anaplanAccounts = await this.anaplanRepository.find();
const anaplanAccountMap = new Map<number, string>();
anaplanAccounts.forEach((a) => anaplanAccountMap.set(a.id, a.label));

const anaplanMessages: string[] = [];

// Rule 12: Partner budget vs Anaplan "Collaborators non-CGIAR Centers"
const partnerBudgetTotal = relevantContracted.reduce(
  (sum, row) => sum + parseBudget(row?.budget),
  0,
);
const collaboratorsAnaplanBudget = anaplanRows
  .filter((row) => anaplanAccountMap.get(row.anaplan_id) === 'Collaborators non-CGIAR Centers')
  .reduce((sum, row) => sum + parseBudget(row?.budget), 0);

if (partnerBudgetTotal !== collaboratorsAnaplanBudget) {
  anaplanMessages.push(
    'Budget does not match the amount included in the Partners section of the PORB.',
  );
}

// Rule 13: Total Anaplan budget vs PORB pooled (HLO + Cross-Cutting)
const totalAnaplanBudget = anaplanRows.reduce(
  (sum, row) => sum + parseBudget(row?.budget),
  0,
);
const hloBudgetTotal = hlos.reduce(
  (sum, row) => sum + parseBudget(row?.hlo_budget),
  0,
);
const crossBudgetTotal = (isCrossAow ? crossRows : []).reduce(
  (sum, row) => sum + parseBudget(row?.budget),
  0,
);
const pooledBudgetTotal = hloBudgetTotal + crossBudgetTotal;

if (totalAnaplanBudget !== pooledBudgetTotal) {
  anaplanMessages.push(
    'Budget does not match the amount included in the AOW section of the PORB.',
  );
}

emptyResult['Anaplan'] = {
  hasError: anaplanMessages.length > 0,
  message: anaplanMessages.join(' '),
};
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec"`
Expected: No new errors

---

### Task 2: Add Rule 12 + Rule 13 to `getValidationSummary()`

**Files:**
- Modify: `back-end/src/porb/porb.service.ts:677-761` (getValidationSummary method)

- [ ] **Step 1: Add Anaplan queries to getValidationSummary**

Add `porbAnaplanRepository` and `anaplanRepository` to the `Promise.all` on line 682:

```typescript
const [hlos, bilaterals, melias, partners, contractedRows, crossRows, anaplanRows, anaplanAccounts, allAows] = await Promise.all([
  this.porbHloRepository.find({ where: { program_id } }),
  this.porbBilateralRepository.find({ where: { program_id } }),
  this.porbMeliaRepository.find({ where: { program_id } }),
  this.porbPartnerRepository.find({ where: { program_id } }),
  this.porbContractedPartnerRepository.find({ where: { program_id } }),
  this.porbCrossRepository.find({ where: { program_id } }),
  this.porbAnaplanRepository.find({ where: { program_id } }),
  this.anaplanRepository.find(),
  this.porbAowRepository.find({ where: { program_id } }),
]);
```

- [ ] **Step 2: Add Rule 12 + 13 checks after existing validation loops**

After the existing contracted partner loop (before the return on line 757), add:

```typescript
// Build Anaplan account label map
const anaplanAccountMap = new Map<number, string>();
anaplanAccounts.forEach((a) => anaplanAccountMap.set(a.id, a.label));

// Build AOW code map
const aowCodeMap = new Map<number, string>();
allAows.forEach((aow) => aowCodeMap.set(aow.id, String(aow.aow_acrnum || '').trim().toUpperCase()));

// Group data by (center_id, porb_aow_id) for cross-section comparison
const aowCenterKeys = new Set<string>();
anaplanRows.forEach((row) => aowCenterKeys.add(`${row.center_id}::${row.porb_aow_id}`));
// Also add keys from HLO and cross rows
hlos.forEach((row) => aowCenterKeys.add(`${row.center_id}::${row.porb_aow_id}`));
crossRows.forEach((row) => aowCenterKeys.add(`${row.center_id}::${row.porb_aow_id}`));

for (const key of aowCenterKeys) {
  const [centerIdStr, aowIdStr] = key.split('::');
  const cId = Number(centerIdStr);
  const aowId = Number(aowIdStr);

  // Rule 12: Partner budget vs Anaplan "Collaborators non-CGIAR Centers"
  const aowPartnerIds = new Set(
    partners.filter((p) => p.porb_aow_id === aowId && !p.toc_is_deleted).map((p) => p.id),
  );
  const partnerBudgetTotal = contractedRows
    .filter((c) => aowPartnerIds.has(c.porb_partner_id) && Number(c.center_id) === cId)
    .reduce((sum, row) => sum + parseBudget(row?.budget), 0);

  const collaboratorsAnaplanBudget = anaplanRows
    .filter(
      (row) =>
        Number(row.center_id) === cId &&
        Number(row.porb_aow_id) === aowId &&
        anaplanAccountMap.get(row.anaplan_id) === 'Collaborators non-CGIAR Centers',
    )
    .reduce((sum, row) => sum + parseBudget(row?.budget), 0);

  if (partnerBudgetTotal !== collaboratorsAnaplanBudget) {
    pushError(cId, aowId);
  }

  // Rule 13: Total Anaplan vs PORB pooled (HLO + Cross-Cutting)
  const totalAnaplanBudget = anaplanRows
    .filter((row) => Number(row.center_id) === cId && Number(row.porb_aow_id) === aowId)
    .reduce((sum, row) => sum + parseBudget(row?.budget), 0);

  const hloBudgetTotal = hlos
    .filter((row) => Number(row.center_id) === cId && Number(row.porb_aow_id) === aowId)
    .reduce((sum, row) => sum + parseBudget(row?.hlo_budget), 0);

  const aowCode = aowCodeMap.get(aowId) || '';
  const isCrossAow = aowCode === 'AOW00';
  const crossBudgetTotal = isCrossAow
    ? crossRows
        .filter((row) => Number(row.center_id) === cId && Number(row.porb_aow_id) === aowId)
        .reduce((sum, row) => sum + parseBudget(row?.budget), 0)
    : 0;

  const pooledTotal = hloBudgetTotal + crossBudgetTotal;

  if (totalAnaplanBudget !== pooledTotal) {
    pushError(cId, aowId);
  }
}
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec"`
Expected: No new errors

---

### Task 3: Block submission in `submitPorb()`

**Files:**
- Modify: `back-end/src/porb/porb.service.ts:3262-3352` (submitPorb method)

- [ ] **Step 1: Add validation gate before creating submission**

After the `activePhase` check (line 3274), add:

```typescript
// Validate before submission — Rules 12 & 13 block submit
const validationSummary = await this.getValidationSummary(programId);
if (
  validationSummary.center_error_codes.length > 0 ||
  validationSummary.aow_error_ids.length > 0
) {
  throw new BadRequestException(
    'Cannot submit: there are validation errors that must be resolved first.',
  );
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec"`
Expected: No new errors

---

### Task 4: Whole number enforcement in backend budget saves

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — all `update*` methods that accept budget

- [ ] **Step 1: Add integer rounding to budget save methods**

In each of these methods, after receiving the budget value, round it:

1. `updateHlo()` — find method, add `Math.round()` to `hlo_budget` before save
2. `updateMelia()` — same for `melia_budget`
3. `updateBilateral()` — same for `bilateral_budget`
4. `updateCross()` — same for `budget`
5. `updatePartnerBudget()` — same for `budget`
6. `updateAnaplan()` (line 1182) — same for `budget`

For each, add before the save/update call:

```typescript
if (data.budget != null) {
  data.budget = Math.round(data.budget);
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec"`
Expected: No new errors

- [ ] **Step 3: Commit backend changes**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): add validation Rules 12, 13 and whole-number budget enforcement

Rule 12: Partners budget must match Anaplan Collaborators non-CGIAR Centers
Rule 13: Total Anaplan budget must match PORB pooled (HLO + Cross-Cutting)
Both rules block Mark As Complete and submission.
Budget values are rounded to integers on save."
```

---

## Chunk 2: Frontend Changes

### Task 5: Whole number enforcement in budget input

**Files:**
- Modify: `front-end/src/app/porb/components/porb-budget-sections/shared/budget-and-assumption/budget-and-assumption.component.ts`
- Modify: `front-end/src/app/porb/components/porb-budget-sections/shared/budget-and-assumption/budget-and-assumption.component.html`

- [ ] **Step 1: Strip decimal points from budget input**

In `budget-and-assumption.component.ts`, modify `onValueChange()` to strip decimal points:

```typescript
onValueChange(next: string) {
  const sanitized = (next ?? "").replace(/\./g, "");
  this.valueChange.emit(sanitized);
}
```

- [ ] **Step 2: Prevent decimal input via HTML pattern**

In `budget-and-assumption.component.html`, add `inputmode="numeric"` to the input:

```html
<input
  class="budget-input"
  type="text"
  inputmode="numeric"
  [ngModel]="value ?? ''"
  (ngModelChange)="onValueChange($event)"
  ...
/>
```

- [ ] **Step 3: Also enforce in Anaplan section's parseBudgetValue**

In `front-end/src/app/porb/components/porb-budget-sections/sections/anaplan/anaplan-section.component.ts`, update `parseBudgetValue()`:

```typescript
private parseBudgetValue(value: any): number | null {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/\./g, "")
    .trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
```

---

### Task 6: Anaplan section warning banners

**Files:**
- Modify: `front-end/src/app/porb/components/porb-budget-sections/sections/anaplan/anaplan-section.component.ts`
- Modify: `front-end/src/app/porb/components/porb-budget-sections/sections/anaplan/anaplan-section.component.html`
- Modify: `front-end/src/app/porb/components/porb-budget-sections/sections/anaplan/anaplan-section.component.scss`

- [ ] **Step 1: Add sectionValidation input to anaplan component**

In `anaplan-section.component.ts`, add an input for validation messages:

```typescript
@Input() sectionValidation: { hasError: boolean; message: string } = { hasError: false, message: '' };
```

- [ ] **Step 2: Add warning banner HTML**

In `anaplan-section.component.html`, add before the `<div class="table-scroll">` (line 16):

```html
<div class="validation-warnings" *ngIf="sectionValidation?.hasError">
  <div class="validation-warning" *ngFor="let msg of validationMessages">
    <mat-icon>error_outline</mat-icon>
    <span>{{ msg }}</span>
  </div>
</div>
```

- [ ] **Step 3: Add validationMessages getter**

In `anaplan-section.component.ts`:

```typescript
get validationMessages(): string[] {
  const message = this.sectionValidation?.message || '';
  if (!message) return [];
  // Messages are joined with space in backend, split them back
  return message.split(/(?<=\.) /).filter(Boolean);
}
```

- [ ] **Step 4: Add warning banner styles**

In `anaplan-section.component.scss`:

```scss
.validation-warnings {
  margin-bottom: 12px;
}

.validation-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 6px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
    color: #dc2626;
  }
}
```

- [ ] **Step 5: Pass sectionValidation to anaplan component from parent**

Find where `<app-anaplan-section>` is used in `porb.component.html` and add the input binding:

```html
<app-anaplan-section
  ...existing bindings...
  [sectionValidation]="sectionValidation['Anaplan']"
></app-anaplan-section>
```

---

### Task 7: Block submission in frontend

**Files:**
- Modify: `front-end/src/app/porb/porb.component.ts:363-396` (onSubmitClicked)

- [ ] **Step 1: Add validation check before submit dialog**

Modify `onSubmitClicked()` to check for validation errors first:

```typescript
async onSubmitClicked() {
  // Check for blocking validation errors (Rules 12, 13, etc.)
  if (this.centerErrorCodes.length > 0 || this.aowErrorIds.length > 0) {
    this.toastr.error(
      'Cannot submit: there are validation errors that must be resolved first.'
    );
    return;
  }

  // ... existing incomplete centers warning code continues below ...
  const incompleteCenters = this.centers
    .filter((c: any) => !this.isCenterCompleted(c))
    ...
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd front-end && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit frontend changes**

```bash
git add front-end/src/app/porb/
git commit -m "feat(porb): frontend validation Rules 12, 13 warnings and whole-number inputs

Anaplan section shows red warning banners for Rule 12/13 mismatches.
Submit blocked when validation errors exist.
Budget inputs strip decimal points."
```

---

## Chunk 3: Integration & Wiring

### Task 8: Wire the Anaplan sectionValidation binding

**Files:**
- Modify: `front-end/src/app/porb/porb.component.html` — find `<app-anaplan-section>` usage

- [ ] **Step 1: Find and update Anaplan section binding**

Search for `app-anaplan-section` in `porb.component.html` and add `[sectionValidation]`:

```html
[sectionValidation]="sectionValidation['Anaplan']"
```

- [ ] **Step 2: Verify the validation refresh flow**

The existing `onBudgetUpdated()` already calls `refreshSectionValidation()` and `refreshValidationSummary()`. Since we modified the backend `getValidation()` to return Anaplan errors, the frontend will automatically pick them up — no additional wiring needed.

- [ ] **Step 3: Final frontend build check**

Run: `cd front-end && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Final backend build check**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec"`
Expected: No new errors

- [ ] **Step 5: Final commit if needed**

If any wiring changes were made separately:

```bash
git add -A
git commit -m "feat(porb): wire Anaplan validation warnings to section component"
```
