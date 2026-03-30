# PORB Synergy Programs & Outcomes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Synergy Programs and Outcomes as read-only TOC-sourced sections in the PORB Summary detailed view, with auto-harvest, submission snapshots, version view, and Excel export.

**Architecture:** Two new entities (`porb_synergy`, `porb_outcome`) follow the existing PORB table pattern. Data flows from TOC API → auto-harvest cron → DB tables → summary API → frontend display. Both sections are read-only (no budget/assumption columns). Synergy programs are per-AOW (matched via `wp.id`). Outcomes are per-AOW (matched via `group`/`parent_id`), with quantitative indicators stored as JSON.

**Tech Stack:** NestJS/TypeORM (backend), Angular 19 (frontend), MySQL, xlsx (Excel export)

**Spec:** `docs/superpowers/specs/2026-03-30-porb-synergy-outcomes-design.md`

---

## File Structure

### New Files
- `back-end/src/entities/porb-synergy.entity.ts` — PorbSynergy entity
- `back-end/src/entities/porb-outcome.entity.ts` — PorbOutcome entity

### Modified Files
- `back-end/src/porb/porb.module.ts` — Register new entities (lines 40-67)
- `back-end/src/porb/porb.service.ts` — TOC import, summary detail, snapshot, clear data, Excel sheets
- `front-end/src/app/porb/porb.component.ts` — Summary section nav, cached data, empty checks
- `front-end/src/app/porb/porb.component.html` — Summary detail table templates
- `front-end/src/app/services/porb.service.ts` — Update error fallback in `getSummaryAowDetail()`

---

## Task 1: Create PorbSynergy Entity

**Files:**
- Create: `back-end/src/entities/porb-synergy.entity.ts`

- [ ] **Step 1: Create the entity file**

```typescript
// back-end/src/entities/porb-synergy.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { PorbAow } from './porb-aow.entity';

@Entity('porb_synergy')
export class PorbSynergy {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  program_id: number;

  @ManyToOne(() => Initiative, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Initiative;

  @ApiProperty()
  @Column({ nullable: true })
  porb_aow_id: number;

  @ManyToOne(() => PorbAow, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_aow_id' })
  porb_aow: PorbAow;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  toc_id: string;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  synergy_program_name: string;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  synergy_hlo_title: string;

  @ApiProperty()
  @Column({ type: 'mediumtext', nullable: true })
  synergy_description: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  toc_is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_created_at: Date;
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors (pre-existing `app.controller.spec.ts` errors are known/ignored)

- [ ] **Step 3: Commit**

```bash
git add back-end/src/entities/porb-synergy.entity.ts
git commit -m "feat(porb): add PorbSynergy entity for TOC synergy programs"
```

---

## Task 2: Create PorbOutcome Entity

**Files:**
- Create: `back-end/src/entities/porb-outcome.entity.ts`

- [ ] **Step 1: Create the entity file**

```typescript
// back-end/src/entities/porb-outcome.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Initiative } from './initiative.entity';
import { PorbAow } from './porb-aow.entity';

@Entity('porb_outcome')
export class PorbOutcome {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  program_id: number;

  @ManyToOne(() => Initiative, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Initiative;

  @ApiProperty()
  @Column({ nullable: true })
  porb_aow_id: number;

  @ManyToOne(() => PorbAow, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'porb_aow_id' })
  porb_aow: PorbAow;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  toc_id: string;

  @ApiProperty()
  @Column({ type: 'mediumtext' })
  outcome_title: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255, nullable: true })
  outcome_type: string;

  @ApiProperty()
  @Column({ type: 'json', nullable: true })
  outcome_indicators: any;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  toc_is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_updated_at: Date;

  @Column({ type: 'datetime', nullable: true, default: null })
  toc_created_at: Date;
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add back-end/src/entities/porb-outcome.entity.ts
git commit -m "feat(porb): add PorbOutcome entity for TOC outcomes"
```

---

## Task 3: Register Entities in PORB Module

**Files:**
- Modify: `back-end/src/porb/porb.module.ts:40-67`

- [ ] **Step 1: Add imports and register entities**

At the top of `porb.module.ts`, add the imports:

```typescript
import { PorbSynergy } from 'src/entities/porb-synergy.entity';
import { PorbOutcome } from 'src/entities/porb-outcome.entity';
```

In the `TypeOrmModule.forFeature([...])` array (line ~67, before the closing `]`), add:

```typescript
      PorbSynergy,
      PorbOutcome,
```

- [ ] **Step 2: Add repository injections in porb.service.ts**

At the top of `porb.service.ts`, add imports:

```typescript
import { PorbSynergy } from 'src/entities/porb-synergy.entity';
import { PorbOutcome } from 'src/entities/porb-outcome.entity';
```

In the constructor, add the two new repository injections (follow the pattern of existing `@InjectRepository` calls):

```typescript
    @InjectRepository(PorbSynergy)
    private porbSynergyRepository: Repository<PorbSynergy>,
    @InjectRepository(PorbOutcome)
    private porbOutcomeRepository: Repository<PorbOutcome>,
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add back-end/src/porb/porb.module.ts back-end/src/porb/porb.service.ts
git commit -m "feat(porb): register PorbSynergy and PorbOutcome in module and service"
```

---

## Task 4: Add Synergy Programs to TOC Import

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — `importTocToPorbTables()` method (after the HLO block, around line 2666)

The TOC response has `dd?.data?.synergy_programs` (already extracted in `getTocs()` at line 3890). However, `importTocToPorbTables()` works with the `results` array returned by `getTocs()`. Synergy programs are included in the results array (line 4163: `...synergyPrograms`). Each synergy program item has:
- `flow.title` — Program or Accelerator name
- `result.title` — High Level Output title
- `description` — Brief description
- `category` — Set to `'synergy-programs'` by the filter
- `wp.id` — Links to parent WP (used for AOW matching)

- [ ] **Step 1: Add synergy import block after the HLO sync block**

After the `syncTocDeletedFlags` call for HLOs (around line 2666), add:

```typescript
    // ── Synergy Programs ──────────────────────────────────────────
    const synergyItems = results.filter(
      (item: any) => item?.category === 'synergy-programs',
    );
    const synergyRows: any[] = [];
    const synergyKeySet = new Set<string>();
    for (const item of synergyItems) {
      const tocId = String(item?.id || item?.related_node_id || '');
      if (!tocId) continue;
      // Match AOW via wp.id — find the AOW whose toc_id matches the WP node
      const parentAow = resolveParentAow(item?.wp?.id, item?.parent_id);
      if (synergyKeySet.has(tocId)) continue;
      synergyKeySet.add(tocId);
      synergyRows.push(
        this.porbSynergyRepository.create({
          program_id: programId,
          porb_aow_id: parentAow?.id ?? null,
          toc_id: tocId,
          synergy_program_name: item?.flow?.title || '',
          synergy_hlo_title: item?.result?.title || '',
          synergy_description: item?.description || '',
          toc_is_deleted: false,
        }),
      );
    }

    const existingSynergies = await this.porbSynergyRepository.find({
      where: { program_id: programId },
    });
    const existingSynergyByKey = new Map<string, PorbSynergy>();
    existingSynergies.forEach((row) =>
      existingSynergyByKey.set(String(row.toc_id), row),
    );
    const existingSynergyKeys = new Set(
      existingSynergies.map((row) => String(row.toc_id)),
    );
    const newSynergyRows = synergyRows.filter(
      (row) => !existingSynergyKeys.has(String(row.toc_id)),
    );

    const synergyUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of synergyRows) {
      const existing = existingSynergyByKey.get(String(row.toc_id));
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0))
        changes.porb_aow_id = row.porb_aow_id;
      if ((existing.synergy_program_name || '') !== (row.synergy_program_name || ''))
        changes.synergy_program_name = row.synergy_program_name;
      if ((existing.synergy_hlo_title || '') !== (row.synergy_hlo_title || ''))
        changes.synergy_hlo_title = row.synergy_hlo_title;
      if ((existing.synergy_description || '') !== (row.synergy_description || ''))
        changes.synergy_description = row.synergy_description;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        synergyUpdates.push({ id: existing.id, changes });
      }
    }
    if (synergyUpdates.length) {
      await Promise.all(
        synergyUpdates.map((item) =>
          this.porbSynergyRepository.update(item.id, item.changes),
        ),
      );
    }
    if (setTocTimestamps) {
      newSynergyRows.forEach((r) => {
        r.toc_updated_at = new Date();
        r.toc_created_at = new Date();
      });
    }
    if (newSynergyRows.length) {
      await this.porbSynergyRepository.save(newSynergyRows);
    }
    await this.syncTocDeletedFlags(
      this.porbSynergyRepository,
      existingSynergies as any,
      new Set(synergyRows.map((row: any) => String(row.toc_id))),
    );
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): add synergy programs processing to TOC import"
```

---

## Task 5: Add Outcomes to TOC Import

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — `importTocToPorbTables()` method (after synergy block from Task 4)

Outcomes come from `filteredData` where `category == 'OUTCOME'`. Each outcome has:
- `title` — Outcome name
- `type_of_outcome.name` or `type.name` — Type (Capacity, Uptake, etc.)
- `quantitative_indicators[]` — Array of indicators, each with `type.value`, `description`, `location`, `targets[]`
- `group` / `parent_id` — AOW matching (same as HLOs)

- [ ] **Step 1: Add outcome import block after the synergy block**

```typescript
    // ── Outcomes ──────────────────────────────────────────────────
    const outcomeNodes = results.filter(
      (item: any) => item?.category === 'OUTCOME' || item?.category === 'EOI',
    );
    const outcomeRows: any[] = [];
    const outcomeKeySet = new Set<string>();
    for (const item of outcomeNodes) {
      const tocId = String(item?.related_node_id || item?.id || '');
      if (!tocId) continue;
      const parentAow = resolveParentAow(item?.group, item?.parent_id);
      if (outcomeKeySet.has(tocId)) continue;
      outcomeKeySet.add(tocId);

      // Extract indicators with target values for the active reporting year
      const indicators: any[] = [];
      for (const indicator of item?.quantitative_indicators || []) {
        const typeName = indicator?.type?.name || indicator?.type?.value || '';
        const description = indicator?.description || '';
        let location = 'Global';
        if (indicator?.location === 'regional') {
          const regionNames = (indicator?.regions || []).map((r: any) => r.name).sort();
          location = `Region: ${regionNames.join(', ')}`;
        } else if (indicator?.location === 'country') {
          const countryNames = (indicator?.countries || []).map((c: any) => c.name).sort();
          location = `Country: ${countryNames.join(', ')}`;
        }
        let targetValue: number | null = null;
        for (const target of indicator?.targets || []) {
          const val = parseFloat(target?.[activePhase?.reportingYear]);
          if (!isNaN(val)) {
            targetValue = (targetValue || 0) + val;
          }
        }
        indicators.push({ type: typeName, description, location, target_value: targetValue });
      }

      outcomeRows.push(
        this.porbOutcomeRepository.create({
          program_id: programId,
          porb_aow_id: parentAow?.id ?? null,
          toc_id: tocId,
          outcome_title: item?.title || '',
          outcome_type: item?.type_of_outcome?.name || item?.type?.name || '',
          outcome_indicators: indicators.length ? indicators : null,
          toc_is_deleted: false,
        }),
      );
    }

    const existingOutcomes = await this.porbOutcomeRepository.find({
      where: { program_id: programId },
    });
    const existingOutcomeByKey = new Map<string, PorbOutcome>();
    existingOutcomes.forEach((row) =>
      existingOutcomeByKey.set(String(row.toc_id), row),
    );
    const existingOutcomeKeys = new Set(
      existingOutcomes.map((row) => String(row.toc_id)),
    );
    const newOutcomeRows = outcomeRows.filter(
      (row) => !existingOutcomeKeys.has(String(row.toc_id)),
    );

    const outcomeUpdates: Array<{ id: number; changes: any }> = [];
    for (const row of outcomeRows) {
      const existing = existingOutcomeByKey.get(String(row.toc_id));
      if (!existing) continue;
      const changes: any = {};
      if (Number(existing.porb_aow_id || 0) !== Number(row.porb_aow_id || 0))
        changes.porb_aow_id = row.porb_aow_id;
      if ((existing.outcome_title || '') !== (row.outcome_title || ''))
        changes.outcome_title = row.outcome_title;
      if ((existing.outcome_type || '') !== (row.outcome_type || ''))
        changes.outcome_type = row.outcome_type;
      if (JSON.stringify(existing.outcome_indicators) !== JSON.stringify(row.outcome_indicators))
        changes.outcome_indicators = row.outcome_indicators;
      if (Object.keys(changes).length) {
        if (setTocTimestamps) changes.toc_updated_at = new Date();
        outcomeUpdates.push({ id: existing.id, changes });
      }
    }
    if (outcomeUpdates.length) {
      await Promise.all(
        outcomeUpdates.map((item) =>
          this.porbOutcomeRepository.update(item.id, item.changes),
        ),
      );
    }
    if (setTocTimestamps) {
      newOutcomeRows.forEach((r) => {
        r.toc_updated_at = new Date();
        r.toc_created_at = new Date();
      });
    }
    if (newOutcomeRows.length) {
      await this.porbOutcomeRepository.save(newOutcomeRows);
    }
    await this.syncTocDeletedFlags(
      this.porbOutcomeRepository,
      existingOutcomes as any,
      new Set(outcomeRows.map((row: any) => String(row.toc_id))),
    );
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): add outcomes processing to TOC import"
```

---

## Task 6: Add to clearAllPorbData and Summary Detail

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — `clearAllPorbData()` (~line 5565) and `getSummaryAowDetail()` (~line 2301)

- [ ] **Step 1: Add new tables to clearAllPorbData deletion sequence**

In `clearAllPorbData()` (~line 5590), add two entries to the `tables` array **before** `porb_aow` (which must stay last):

```typescript
      { name: 'porb_synergy', condition: aowWhere },
      { name: 'porb_outcome', condition: aowWhere },
```

Insert these before the `{ name: 'porb_aow', condition: where }` entry.

- [ ] **Step 2: Extend getSummaryAowDetail return value**

In `getSummaryAowDetail()`, after the existing `Promise.all` (line 2302), add queries for synergies and outcomes:

```typescript
    const [synergies, outcomes] = await Promise.all([
      this.porbSynergyRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
      this.porbOutcomeRepository.find({
        where: { program_id, porb_aow_id, toc_is_deleted: false },
      }),
    ]);
```

Then update the return statement (line 2448) to include the new fields:

```typescript
    return { hlos, partners, contractedPartners: contractedPartnersFormatted, melia, bilateral, cross, isAow00, subtotals, countryPercentageCount, countryPercentage, synergies, outcomes };
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): add synergies/outcomes to clearAllData and summary detail"
```

---

## Task 7: Add to Submission Snapshot

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — `buildPorbSnapshot()` (~line 6487)

- [ ] **Step 1: Query synergies and outcomes per AOW in the snapshot loop**

In `buildPorbSnapshot()`, inside the `for (const aow of aows)` loop (line 6506), add queries for synergies and outcomes. These are per-AOW (not per-center), so add them outside the center loop:

After the `const centerSnapshots = [];` line and before the `for (const center of centers)` loop, add:

```typescript
      // Synergies and outcomes are per-AOW, not per-center
      const [synergies, outcomes] = await Promise.all([
        this.porbSynergyRepository.find({
          where: { program_id: programId, porb_aow_id: aow.id, toc_is_deleted: false },
        }),
        this.porbOutcomeRepository.find({
          where: { program_id: programId, porb_aow_id: aow.id, toc_is_deleted: false },
        }),
      ]);
```

Then update the `aowSnapshots.push()` call (line 6536) to include the new fields:

```typescript
      aowSnapshots.push({
        id: aow.id,
        toc_id: aow.toc_id,
        aow_name: aow.aow_name,
        aow_acrnum: aow.aow_acrnum,
        synergies,
        outcomes,
        centers: centerSnapshots,
      });
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): include synergies/outcomes in submission snapshot"
```

---

## Task 8: Add Excel Export Sheets

**Files:**
- Modify: `back-end/src/porb/porb.service.ts` — add `generatePorbSynergySheet()` and `generatePorbOutcomeSheet()` methods, call from `buildPorbWorkbook()`

- [ ] **Step 1: Add generatePorbSynergySheet method**

Add this method near the other `generatePorb*Sheet` methods (after `generatePorbCountryPercentageSheet`, around line 6400+):

```typescript
  private generatePorbSynergySheet(
    synergies: any[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Program or Accelerator', 'High Level Output', 'Brief description', 'id']);

    let currentRow = 1;

    const synergyByAow = new Map<number, any[]>();
    for (const s of synergies) {
      const list = synergyByAow.get(s.porb_aow_id) || [];
      list.push(s);
      synergyByAow.set(s.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowSynergies = synergyByAow.get(aowId);
      if (!aowSynergies?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const s of aowSynergies) {
        wsData.push([
          aowLabel,
          s.synergy_program_name || 'N/A',
          s.synergy_hlo_title || 'N/A',
          s.synergy_description || '',
          s.id,
        ]);
        currentRow++;
      }

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      if (aowEndRow > aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 35 }, { wch: 40 }, { wch: 50 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      numberColumns: [],
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [4]);

    return ws;
  }
```

- [ ] **Step 2: Add generatePorbOutcomeSheet method**

```typescript
  private generatePorbOutcomeSheet(
    outcomes: any[],
    aowMap: Map<number, { code: string; name: string }>,
    sortedAowIds: number[],
  ) {
    const wsData: any[][] = [];
    const merges: any[] = [];

    wsData.push(['AOW', 'Outcome', 'Type of Outcome', 'Indicator Type', 'Geographic Location', 'Target Value', 'id']);

    let currentRow = 1;

    const outcomeByAow = new Map<number, any[]>();
    for (const o of outcomes) {
      const list = outcomeByAow.get(o.porb_aow_id) || [];
      list.push(o);
      outcomeByAow.set(o.porb_aow_id, list);
    }

    for (const aowId of sortedAowIds) {
      const aowOutcomes = outcomeByAow.get(aowId);
      if (!aowOutcomes?.length) continue;

      const aowLabel = this.getAowLabel(aowId, aowMap);
      const aowStartRow = currentRow;

      for (const o of aowOutcomes) {
        const indicators: any[] = Array.isArray(o.outcome_indicators) ? o.outcome_indicators : [];
        if (indicators.length === 0) {
          // Outcome with no indicators — single row
          wsData.push([
            aowLabel,
            o.outcome_title || 'N/A',
            o.outcome_type || '',
            '',
            '',
            '',
            o.id,
          ]);
          currentRow++;
        } else {
          const outcomeStartRow = currentRow;
          for (const ind of indicators) {
            wsData.push([
              aowLabel,
              o.outcome_title || 'N/A',
              o.outcome_type || '',
              ind.type || '',
              ind.location || '',
              ind.target_value != null ? Number(ind.target_value) : '',
              o.id,
            ]);
            currentRow++;
          }
          // Merge outcome title + type columns across indicator rows
          const outcomeEndRow = currentRow - 1;
          if (outcomeEndRow > outcomeStartRow) {
            merges.push({ s: { r: outcomeStartRow, c: 1 }, e: { r: outcomeEndRow, c: 1 } }); // Outcome col
            merges.push({ s: { r: outcomeStartRow, c: 2 }, e: { r: outcomeEndRow, c: 2 } }); // Type col
          }
        }
      }

      // AOW vertical merge
      const aowEndRow = currentRow - 1;
      if (aowEndRow > aowStartRow) {
        merges.push({ s: { r: aowStartRow, c: 0 }, e: { r: aowEndRow, c: 0 } });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    ws['!cols'] = [
      { wch: 8 }, { wch: 40 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
    ];

    this.applySheetStyles(ws, wsData, {
      headerRowCount: 1,
      wpColumnIndex: 0,
      numberColumns: [5],
      rowHeights: { header: 30, data: 60, subtotal: 25 },
      merges,
    });

    this.protectAndHideIds(ws, [6]);

    return ws;
  }
```

- [ ] **Step 3: Fetch data and call sheet generators in buildPorbWorkbook**

In `buildPorbWorkbook()` (line 4939), add synergy and outcome queries to the data loading. After the existing `Promise.all` (line 4940-4950), add:

```typescript
    const synergyRows = await this.porbSynergyRepository.find({
      where: { program_id: programId, toc_is_deleted: false },
    });
    const outcomeRows = await this.porbOutcomeRepository.find({
      where: { program_id: programId, toc_is_deleted: false },
    });
```

Then after the last `XLSX.utils.book_append_sheet` call (line 5055, Countries of Implementation), add:

```typescript
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbSynergySheet(synergyRows, aowMap, sortedAowIds),
      'Synergy Programs',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.generatePorbOutcomeSheet(outcomeRows, aowMap, sortedAowIds),
      'Outcomes',
    );
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -5`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add back-end/src/porb/porb.service.ts
git commit -m "feat(porb): add Synergy Programs and Outcomes Excel export sheets"
```

---

## Task 9: Frontend Summary Section Navigation

**Files:**
- Modify: `front-end/src/app/porb/porb.component.ts` — `summarySectionItems` getter, `computeSummaryDetailCache()`, `isSummarySectionEmpty()`

- [ ] **Step 1: Add cached properties declarations**

Near the other cached properties (around line 80), add:

```typescript
  cachedFormattedSynergies: any[] = [];
  cachedFormattedOutcomes: any[] = [];
```

- [ ] **Step 2: Update summarySectionItems getter**

In the `summarySectionItems` getter (line 1049), update the return to include the two new sections. Change:

```typescript
    return filtered;
```

to:

```typescript
    return [...filtered, 'Synergy Programs', 'Outcomes'];
```

And for the AOW00 branch, change:

```typescript
    return ["Cross Cutting", ...filtered.filter(i => i !== "Pool funding HLO")];
```

to:

```typescript
    return ["Cross Cutting", ...filtered.filter(i => i !== "Pool funding HLO"), 'Synergy Programs', 'Outcomes'];
```

- [ ] **Step 3: Update computeSummaryDetailCache()**

In `computeSummaryDetailCache()` (line 1274), add to the null-guard reset block:

```typescript
    this.cachedFormattedSynergies = [];
    this.cachedFormattedOutcomes = [];
```

Then, after the existing cached property computations (before `cachedSummarySectionEmpty`), add:

```typescript
    // Synergy programs (read-only, no budget filtering)
    this.cachedFormattedSynergies = d.synergies || [];

    // Outcomes with flattened indicators for display
    this.cachedFormattedOutcomes = (d.outcomes || []).map((o: any) => ({
      ...o,
      flatIndicators: Array.isArray(o.outcome_indicators) ? o.outcome_indicators : [],
    }));
```

Then update the `cachedSummarySectionEmpty` object to include:

```typescript
    'Synergy Programs': this.cachedFormattedSynergies.length === 0,
    'Outcomes': this.cachedFormattedOutcomes.length === 0,
```

- [ ] **Step 4: Update the frontend service error fallback**

In `front-end/src/app/services/porb.service.ts` (line ~112), update the `catch` fallback to include the new fields:

```typescript
  ).catch(() => ({ hlos: [], partners: [], melia: [], bilateral: [], subtotals: {}, synergies: [], outcomes: [] }));
```

- [ ] **Step 5: Verify frontend builds**

Run: `cd front-end && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add front-end/src/app/porb/porb.component.ts front-end/src/app/services/porb.service.ts
git commit -m "feat(porb): add Synergy Programs and Outcomes to summary section navigation"
```

---

## Task 10: Frontend Summary HTML Templates

**Files:**
- Modify: `front-end/src/app/porb/porb.component.html` — add templates after the last summary section (Countries of Implementation, around line 594)

- [ ] **Step 1: Add Synergy Programs section template**

After the Countries of Implementation `</ng-container>` block, add:

```html
<!-- Synergy Programs Section -->
<ng-container *ngIf="summarySelectedSection === 'Synergy Programs'">
  <div class="summary-section-block" *ngIf="cachedFormattedSynergies.length; else synergyEmpty">
    <h4 class="summary-section-title">Synergy Programs</h4>
    <div class="summary-table-wrapper">
      <table class="consolidation-table summary-detail-table">
        <thead>
          <tr>
            <th>Program or Accelerator</th>
            <th>High Level Output</th>
            <th>Brief description</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of cachedFormattedSynergies">
            <td>{{ s.synergy_program_name }}</td>
            <td>{{ s.synergy_hlo_title }}</td>
            <td>{{ s.synergy_description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <ng-template #synergyEmpty>
    <div class="summary-empty-sections">
      <div class="summary-section-empty">
        <mat-icon>info_outline</mat-icon>
        <span><strong>Synergy Programs</strong> — The data is missing in the TOC.</span>
      </div>
    </div>
  </ng-template>
</ng-container>
```

- [ ] **Step 2: Add Outcomes section template**

After the Synergy Programs block, add:

```html
<!-- Outcomes Section -->
<ng-container *ngIf="summarySelectedSection === 'Outcomes'">
  <div class="summary-section-block" *ngIf="cachedFormattedOutcomes.length; else outcomesEmpty">
    <h4 class="summary-section-title">Outcomes</h4>
    <div class="summary-table-wrapper">
      <table class="consolidation-table summary-detail-table">
        <thead>
          <tr>
            <th rowspan="2">Outcome title</th>
            <th rowspan="2" style="width: 15%;">Type of Outcome</th>
            <th colspan="3">Key Performance Indicators</th>
          </tr>
          <tr>
            <th>Type</th>
            <th>Geographic Location</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let o of cachedFormattedOutcomes">
            <ng-container *ngIf="o.flatIndicators.length > 0; else noIndicators">
              <tr *ngFor="let ind of o.flatIndicators; let i = index">
                <td *ngIf="i === 0" [attr.rowspan]="o.flatIndicators.length">{{ o.outcome_title }}</td>
                <td *ngIf="i === 0" [attr.rowspan]="o.flatIndicators.length">{{ o.outcome_type }}</td>
                <td>{{ ind.type }}</td>
                <td>{{ ind.location }}</td>
                <td class="num-cell">{{ ind.target_value }}</td>
              </tr>
            </ng-container>
            <ng-template #noIndicators>
              <tr>
                <td>{{ o.outcome_title }}</td>
                <td>{{ o.outcome_type }}</td>
                <td colspan="3" class="text-muted">No indicators</td>
              </tr>
            </ng-template>
          </ng-container>
        </tbody>
      </table>
    </div>
  </div>
  <ng-template #outcomesEmpty>
    <div class="summary-empty-sections">
      <div class="summary-section-empty">
        <mat-icon>info_outline</mat-icon>
        <span><strong>Outcomes</strong> — The data is missing in the TOC.</span>
      </div>
    </div>
  </ng-template>
</ng-container>
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd front-end && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add front-end/src/app/porb/porb.component.html
git commit -m "feat(porb): add Synergy Programs and Outcomes summary detail templates"
```

---

## Task 11: Full Verification

- [ ] **Step 1: Backend type-check**

Run: `cd back-end && npx tsc --noEmit 2>&1 | grep -v "app.controller.spec" | tail -10`
Expected: No new errors

- [ ] **Step 2: Frontend build**

Run: `cd front-end && npx ng build --configuration=development 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Verify entity files exist**

Run: `ls -la back-end/src/entities/porb-synergy.entity.ts back-end/src/entities/porb-outcome.entity.ts`
Expected: Both files exist

- [ ] **Step 4: Verify module registration**

Run: `grep -n "PorbSynergy\|PorbOutcome" back-end/src/porb/porb.module.ts back-end/src/porb/porb.service.ts | head -10`
Expected: Both entities appear in module imports and service constructor

- [ ] **Step 5: Verify clearAllData includes new tables**

Run: `grep -n "porb_synergy\|porb_outcome" back-end/src/porb/porb.service.ts | head -5`
Expected: Both table names appear in the deletion sequence

- [ ] **Step 6: Verify Excel sheet registration**

Run: `grep -n "Synergy Programs\|Outcomes" back-end/src/porb/porb.service.ts | head -5`
Expected: Both sheet names appear in `buildPorbWorkbook`

- [ ] **Step 7: Verify frontend sections**

Run: `grep -n "Synergy Programs\|Outcomes" front-end/src/app/porb/porb.component.html | head -5`
Expected: Both section templates exist
