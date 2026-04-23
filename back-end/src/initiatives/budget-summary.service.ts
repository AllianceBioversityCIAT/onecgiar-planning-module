import { Injectable, StreamableFile, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx-js-style';
import { Initiative } from 'src/entities/initiative.entity';
import { Organization } from 'src/entities/organization.entity';
import { Submission } from 'src/entities/submission.entity';
import { SubmissionStatus } from 'src/entities/submission.entity';
import { PorbService } from 'src/porb/porb.service';

type CenterKind = 'center' | 'so' | 'unknown';

interface CenterInfo {
  code: string;
  acronym: string;
  name: string;
  kind: CenterKind;
}

interface ProgramInfo {
  id: number;
  official_code: string;
  name: string;
}

interface AowRow {
  aow_id: number;
  aow_name: string;
  aow_acrnum: string;
  cells: Record<string, number>;
  subtotal: number;
}

interface BilateralRow {
  aow_id: number | null;
  aow_name: string;
  aow_acrnum: string;
  cells: Record<string, number>;
  subtotal: number;
}

interface UnknownBreakdown {
  aowLeads: number;
  pmuCosts: number;
  consultants: number;
  discretionary: number;
  research: number;
  travel: number;
  total: number;
}

export interface BudgetSummaryMatrix {
  centers: CenterInfo[];
  alliance: { bioversityCode: string | null; ciatCode: string | null };
  programs: ProgramInfo[];
  byCenter: Record<number, Record<string, number>>;
  byAow: Record<number, AowRow[]>;
  bilateral: Record<number, BilateralRow[]>;
  unknownBreakdown: Record<number, UnknownBreakdown>;
  warnings?: string[];
}

interface QueryParams {
  phase_id?: number | string;
  initiatives?: number[] | number | string | string[];
  program_ids?: number[] | number | string | string[];
  partners?: string[] | string;
  status?: string;
}

const UNKNOWN_CENTER_CODE = '999999';

// Classify anaplan account labels into the Unknown-center categories (Sheet 3).
const ACCOUNT_CATEGORY_MAP: [
  RegExp,
  'aowLeads' | 'pmuCosts' | 'consultants' | 'discretionary' | 'travel' | 'research',
][] = [
  [/aow.*lead|area of work.*lead/i, 'aowLeads'],
  [/pmu|program management|finance support/i, 'pmuCosts'],
  [/consultant/i, 'consultants'],
  [/discretion/i, 'discretionary'],
  [/travel|meeting|workshop/i, 'travel'],
  [/research/i, 'research'],
];

function classifyAccount(
  label: string,
): 'aowLeads' | 'pmuCosts' | 'consultants' | 'discretionary' | 'travel' | 'research' {
  for (const [re, cat] of ACCOUNT_CATEGORY_MAP) {
    if (re.test(label)) return cat;
  }
  return 'research';
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class BudgetSummaryService {
  private readonly logger = new Logger(BudgetSummaryService.name);

  constructor(
    @InjectRepository(Initiative)
    private readonly initiativeRepository: Repository<Initiative>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @Inject(forwardRef(() => PorbService))
    private readonly porbService: PorbService,
  ) {}

  /**
   * Build the matrix aggregation used by the admin Budget Summary page and
   * the multi-sheet Excel export. Aggregates the latest approved submission's
   * porb_data per initiative.
   */
  async getMatrix(query: QueryParams = {}): Promise<BudgetSummaryMatrix> {
    const warnings: string[] = [];

    // ---- Load organizations ----
    const allOrgs = await this.organizationRepository.find();
    const orgByCode = new Map<string, Organization>();
    const orgByAcronym = new Map<string, Organization>();
    for (const o of allOrgs) {
      orgByCode.set(String(o.code), o);
      if (o.acronym) orgByAcronym.set(o.acronym.trim().toUpperCase(), o);
    }

    const soOrg = orgByAcronym.get('SO') || null;
    if (!soOrg) warnings.push('SO organization not found — SO column will be 0.');

    const bioversityOrg =
      orgByCode.get('49') ||
      orgByAcronym.get('BIOVERSITY (ALLIANCE)') ||
      orgByAcronym.get('BIOVERSITY') ||
      null;
    const ciatOrg =
      orgByCode.get('46') ||
      orgByAcronym.get('CIAT (ALLIANCE)') ||
      orgByAcronym.get('CIAT') ||
      null;

    // ---- Initiatives ----
    const initQb = this.initiativeRepository
      .createQueryBuilder('init')
      .where('init.archived = :archived', { archived: false });

    const rawInitiatives = query.initiatives ?? query.program_ids;
    if (rawInitiatives) {
      const ids = (Array.isArray(rawInitiatives)
        ? rawInitiatives
        : [rawInitiatives]
      )
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (ids.length) initQb.andWhere('init.id IN (:...ids)', { ids });
    }

    const initiatives = await initQb.getMany();
    initiatives.sort((a, b) =>
      (a.official_code || '').localeCompare(b.official_code || ''),
    );
    const programs: ProgramInfo[] = initiatives.map((i) => ({
      id: i.id,
      official_code: i.official_code,
      name: i.name,
    }));

    // ---- Resolve status (default Approved) ----
    const statusRaw = (query.status || '').toString().trim().toLowerCase();
    let statusFilter: SubmissionStatus | 'Draft' = SubmissionStatus.APPROVED;
    if (statusRaw === 'pending') statusFilter = SubmissionStatus.PENDING;
    else if (statusRaw === 'draft') statusFilter = 'Draft';
    else if (statusRaw === 'approved' || !statusRaw)
      statusFilter = SubmissionStatus.APPROVED;

    // ---- Latest submission per initiative (for Approved/Pending) ----
    const latestByInit = new Map<number, Submission>();
    if (statusFilter !== 'Draft' && programs.length) {
      const subQb = this.submissionRepository
        .createQueryBuilder('sub')
        .where('sub.status = :status', { status: statusFilter })
        .andWhere('sub.porb_data IS NOT NULL')
        .andWhere("sub.porb_data != ''")
        .andWhere('sub.initiative_id IN (:...ids)', {
          ids: programs.map((p) => p.id),
        })
        .orderBy('sub.id', 'DESC');

      const subs = await subQb.getMany();
      for (const sub of subs) {
        if (!latestByInit.has(sub.initiative_id)) {
          latestByInit.set(sub.initiative_id, sub);
        }
      }
    }

    // ---- Aggregation state ----
    const byCenter: Record<number, Record<string, number>> = {};
    const byAow: Record<number, AowRow[]> = {};
    const bilateral: Record<number, BilateralRow[]> = {};
    const unknownBreakdown: Record<number, UnknownBreakdown> = {};
    const seenCenterCodes = new Set<string>();

    const partnerFilter = query.partners
      ? new Set(
          (Array.isArray(query.partners) ? query.partners : [query.partners]).map(
            String,
          ),
        )
      : null;

    for (const program of programs) {
      byCenter[program.id] = {};
      byAow[program.id] = [];
      bilateral[program.id] = [];
      unknownBreakdown[program.id] = {
        aowLeads: 0,
        pmuCosts: 0,
        consultants: 0,
        discretionary: 0,
        research: 0,
        travel: 0,
        total: 0,
      };

      let snap: any = null;
      if (statusFilter === 'Draft') {
        try {
          snap = await this.porbService.buildPorbSnapshot(program.id);
        } catch (e) {
          this.logger.warn(
            `Failed to build live PORB snapshot for program ${program.id}: ${e?.message || e}`,
          );
          continue;
        }
      } else {
        const sub = latestByInit.get(program.id);
        if (!sub) continue;
        try {
          snap =
            typeof sub.porb_data === 'string'
              ? JSON.parse(sub.porb_data)
              : sub.porb_data;
        } catch {
          this.logger.warn(
            `Failed to parse porb_data for submission ${sub.id} (program ${program.id})`,
          );
          continue;
        }
      }
      if (!snap) continue;

      // ---- Per-AOW × center aggregation (excludes bilateral) ----
      for (const aow of snap.aows || []) {
        const aowCells: Record<string, number> = {};
        let aowSubtotal = 0;

        for (const center of aow.centers || []) {
          const code = String(center.center_code);
          if (partnerFilter && !partnerFilter.has(code)) continue;
          seenCenterCodes.add(code);

          // Pooled budget = HLO + Cross-Cutting only.
          // Partners, MELIA, and Anaplan are breakdowns/views of the same pooled
          // money (per PORB validation rules 12-13) — summing them would
          // double-count. Bilaterals are separate (project funding) and are
          // reported in their own table.
          let centerBudget = 0;
          for (const h of center.hlos || []) centerBudget += num(h.hlo_budget);
          for (const c of center.cross_cutting || []) centerBudget += num(c.budget);

          if (centerBudget !== 0) {
            aowCells[code] = (aowCells[code] || 0) + centerBudget;
            aowSubtotal += centerBudget;
            byCenter[program.id][code] =
              (byCenter[program.id][code] || 0) + centerBudget;
          }

          // Unknown-center anaplan breakdown (Sheet 3)
          if (code === UNKNOWN_CENTER_CODE) {
            for (const a of center.anaplan || []) {
              const v = num(a.porb_budget);
              if (!v) continue;
              const label = String(a.account || a.anaplan_account_name || '');
              const cat = classifyAccount(label);
              unknownBreakdown[program.id][cat] += v;
              unknownBreakdown[program.id].total += v;
            }
          }
        }

        if (aowSubtotal !== 0 || Object.keys(aowCells).length) {
          byAow[program.id].push({
            aow_id: aow.id,
            aow_name: aow.aow_name,
            aow_acrnum: aow.aow_acrnum,
            cells: aowCells,
            subtotal: aowSubtotal,
          });
        }
      }

      // ---- Bilateral aggregation (Sheet 4) ----
      // Group by porb_aow_id (null → AOW00). Collect acrnum/name from snapshot.aows lookup.
      const aowMetaById = new Map<
        number,
        { aow_name: string; aow_acrnum: string }
      >();
      for (const aow of snap.aows || []) {
        aowMetaById.set(aow.id, {
          aow_name: aow.aow_name,
          aow_acrnum: aow.aow_acrnum,
        });
      }

      const bilByAow = new Map<string, BilateralRow>();
      for (const b of snap.bilaterals || []) {
        const code = String(b.center_id);
        if (partnerFilter && !partnerFilter.has(code)) continue;
        seenCenterCodes.add(code);

        const amount = num(b.bilateral_budget);
        if (!amount) continue;

        const aowId: number | null = b.porb_aow_id ?? null;
        const key = aowId == null ? 'null' : String(aowId);

        let row = bilByAow.get(key);
        if (!row) {
          const meta = aowId != null ? aowMetaById.get(aowId) : null;
          row = {
            aow_id: aowId,
            aow_name: meta?.aow_name || 'Cross-Cutting',
            aow_acrnum: meta?.aow_acrnum || 'AOW00',
            cells: {},
            subtotal: 0,
          };
          bilByAow.set(key, row);
        }
        row.cells[code] = (row.cells[code] || 0) + amount;
        row.subtotal += amount;
      }

      // Sort bilateral rows by aow_acrnum
      bilateral[program.id] = Array.from(bilByAow.values()).sort((a, b) =>
        (a.aow_acrnum || '').localeCompare(b.aow_acrnum || ''),
      );

      // Sort byAow rows by aow_acrnum
      byAow[program.id].sort((a, b) =>
        (a.aow_acrnum || '').localeCompare(b.aow_acrnum || ''),
      );
    }

    // ---- Build center list ----
    // Collect every org that appears in any aggregation, plus every non-SO/non-Unknown org
    // actually assigned budget. Use seenCenterCodes to include only centers that have data or are canonical.
    const centerInfos: CenterInfo[] = [];
    const pushedCodes = new Set<string>();

    const classify = (code: string, org: Organization | null): CenterKind => {
      if (code === UNKNOWN_CENTER_CODE) return 'unknown';
      if (org && org.acronym && org.acronym.trim().toUpperCase() === 'SO') return 'so';
      return 'center';
    };

    // Seed with orgs that appear in data.
    for (const code of Array.from(seenCenterCodes)) {
      if (pushedCodes.has(code)) continue;
      const org = orgByCode.get(code) || null;
      const kind = classify(code, org);
      centerInfos.push({
        code,
        acronym: org?.acronym || (code === UNKNOWN_CENTER_CODE ? 'Unknown' : code),
        name:
          org?.name ||
          (code === UNKNOWN_CENTER_CODE ? 'Unknown Center' : String(code)),
        kind,
      });
      pushedCodes.add(code);
    }

    // Ensure SO is included even if no data (so the column is present).
    if (soOrg && !pushedCodes.has(String(soOrg.code))) {
      centerInfos.push({
        code: String(soOrg.code),
        acronym: soOrg.acronym,
        name: soOrg.name,
        kind: 'so',
      });
      pushedCodes.add(String(soOrg.code));
    }

    // Ensure Unknown column exists.
    if (!pushedCodes.has(UNKNOWN_CENTER_CODE)) {
      const org = orgByCode.get(UNKNOWN_CENTER_CODE) || null;
      centerInfos.push({
        code: UNKNOWN_CENTER_CODE,
        acronym: org?.acronym || 'Unknown',
        name: org?.name || 'Unknown Center',
        kind: 'unknown',
      });
      pushedCodes.add(UNKNOWN_CENTER_CODE);
    }

    // Order: non-SO non-Unknown first (alphabetical by acronym), then SO, then Unknown.
    centerInfos.sort((a, b) => {
      const kindOrder: Record<CenterKind, number> = {
        center: 0,
        so: 1,
        unknown: 2,
      };
      if (kindOrder[a.kind] !== kindOrder[b.kind]) {
        return kindOrder[a.kind] - kindOrder[b.kind];
      }
      return (a.acronym || '').localeCompare(b.acronym || '');
    });

    return {
      centers: centerInfos,
      alliance: {
        bioversityCode: bioversityOrg ? String(bioversityOrg.code) : null,
        ciatCode: ciatOrg ? String(ciatOrg.code) : null,
      },
      programs,
      byCenter,
      byAow,
      bilateral,
      unknownBreakdown,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  /**
   * Build the 2-sheet workbook backing the Budget Summary export.
   */
  async getWorkbook(query: QueryParams = {}): Promise<StreamableFile> {
    const matrix = await this.getMatrix(query);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      this.buildProgAccelByCenterSheet(matrix),
      'Prog-Accel by Center',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.buildAowByCenterSheet(matrix),
      'AoW by Center',
    );

    const buf: Buffer = Buffer.from(
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }),
    );

    const statusRaw = (query.status || '').toString().trim().toLowerCase();
    let prefix = '';
    if (statusRaw === 'approved') prefix = 'Approved_';
    else if (statusRaw === 'pending') prefix = 'Pending_';
    else if (statusRaw === 'draft') prefix = 'Draft_';
    const filename = `${prefix}Budget-Summary.xlsx`;

    return new StreamableFile(buf, {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ========================================================================
  // Sheet builders
  // ========================================================================

  private get styleHeader() {
    return {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '305496' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: this.thinBorder(),
    };
  }
  private get styleTotalRow() {
    return {
      font: { bold: true },
      fill: { fgColor: { rgb: 'D9E1F2' } },
      alignment: { horizontal: 'right' },
      numFmt: '#,##0',
      border: this.thinBorder(),
    };
  }
  private get styleSubtotalRow() {
    return {
      font: { bold: true },
      fill: { fgColor: { rgb: 'FFF2CC' } },
      alignment: { horizontal: 'right' },
      numFmt: '#,##0',
      border: this.thinBorder(),
    };
  }
  private get styleNumber() {
    return { numFmt: '#,##0', alignment: { horizontal: 'right' }, border: this.thinBorder() };
  }
  private get styleText() {
    return { alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: this.thinBorder() };
  }
  private thinBorder() {
    const s = { style: 'thin', color: { rgb: 'BFBFBF' } };
    return { top: s, bottom: s, left: s, right: s };
  }

  /** Sheet 1: Prog-Accel by Center. */
  private buildProgAccelByCenterSheet(m: BudgetSummaryMatrix): XLSX.WorkSheet {
    const regularCenters = m.centers.filter((c) => c.kind === 'center');
    const soCenter = m.centers.find((c) => c.kind === 'so') || null;
    const unknownCenter = m.centers.find((c) => c.kind === 'unknown') || null;

    const headerRow: any[] = [{ v: '', s: this.styleHeader }];
    for (const c of regularCenters)
      headerRow.push({ v: c.acronym, s: this.styleHeader });
    headerRow.push({ v: 'Sub-Total to Centers', s: this.styleHeader });
    headerRow.push({ v: 'SO', s: this.styleHeader });
    headerRow.push({ v: 'Unknown', s: this.styleHeader });
    headerRow.push({ v: 'Total', s: this.styleHeader });

    const rows: any[][] = [headerRow];

    // Column totals
    const colTotals: Record<string, number> = {};
    let grandSubCenters = 0;
    let grandSo = 0;
    let grandUnknown = 0;
    let grandTotal = 0;

    for (const program of m.programs) {
      const centerTotals = m.byCenter[program.id] || {};
      const row: any[] = [{ v: program.name, s: this.styleText }];

      let subCenters = 0;
      for (const c of regularCenters) {
        const v = centerTotals[c.code] || 0;
        row.push({ v, t: 'n', s: this.styleNumber });
        subCenters += v;
        colTotals[c.code] = (colTotals[c.code] || 0) + v;
      }
      const soVal = soCenter ? centerTotals[soCenter.code] || 0 : 0;
      const unknownVal = unknownCenter ? centerTotals[unknownCenter.code] || 0 : 0;
      const total = subCenters + soVal + unknownVal;

      row.push({ v: subCenters, t: 'n', s: this.styleNumber });
      row.push({ v: soVal, t: 'n', s: this.styleNumber });
      row.push({ v: unknownVal, t: 'n', s: this.styleNumber });
      row.push({ v: total, t: 'n', s: this.styleNumber });

      grandSubCenters += subCenters;
      grandSo += soVal;
      grandUnknown += unknownVal;
      grandTotal += total;

      rows.push(row);
    }

    // Total row
    const totalRow: any[] = [{ v: 'Total', s: this.styleTotalRow }];
    for (const c of regularCenters)
      totalRow.push({ v: colTotals[c.code] || 0, t: 'n', s: this.styleTotalRow });
    totalRow.push({ v: grandSubCenters, t: 'n', s: this.styleTotalRow });
    totalRow.push({ v: grandSo, t: 'n', s: this.styleTotalRow });
    totalRow.push({ v: grandUnknown, t: 'n', s: this.styleTotalRow });
    totalRow.push({ v: grandTotal, t: 'n', s: this.styleTotalRow });
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(rows, { cellStyles: true });
    ws['!cols'] = [
      { wch: 45 },
      ...regularCenters.map(() => ({ wch: 14 })),
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
    ];
    ws['!freeze'] = { xSplit: 1, ySplit: 1 };
    return ws;
  }

  /** Sheet 2: AoW by Center. */
  private buildAowByCenterSheet(m: BudgetSummaryMatrix): XLSX.WorkSheet {
    const regularCenters = m.centers.filter((c) => c.kind === 'center');
    const bioCode = m.alliance.bioversityCode;
    const ciatCode = m.alliance.ciatCode;
    const bioCenter = bioCode ? regularCenters.find((c) => c.code === bioCode) : null;
    const ciatCenter = ciatCode ? regularCenters.find((c) => c.code === ciatCode) : null;

    // Remaining centers = regular minus Bioversity/CIAT
    const otherCenters = regularCenters.filter(
      (c) => c.code !== bioCode && c.code !== ciatCode,
    );
    const soCenter = m.centers.find((c) => c.kind === 'so') || null;
    const unknownCenter = m.centers.find((c) => c.kind === 'unknown') || null;

    const header: any[] = [
      { v: 'Program/Accelerator', s: this.styleHeader },
      { v: 'Area of Work', s: this.styleHeader },
      { v: bioCenter?.acronym || 'Bioversity', s: this.styleHeader },
      { v: ciatCenter?.acronym || 'CIAT', s: this.styleHeader },
      { v: 'Sub-Total Alliance of Bioversity and CIAT', s: this.styleHeader },
      ...otherCenters.map((c) => ({ v: c.acronym, s: this.styleHeader })),
      { v: 'Sub-Total to Centers', s: this.styleHeader },
      { v: 'SO', s: this.styleHeader },
      { v: 'Unknown', s: this.styleHeader },
      { v: 'SO + Unknown', s: this.styleHeader },
      { v: 'Total', s: this.styleHeader },
      { v: '% of Program/Accelerator', s: this.styleHeader },
    ];

    const rows: any[][] = [header];

    // Pre-compute program totals for % column
    const programTotals = new Map<number, number>();
    for (const p of m.programs) {
      const src = m.byAow[p.id];
      let sum = 0;
      for (const r of src || []) sum += r.subtotal;
      programTotals.set(p.id, sum);
    }

    for (const program of m.programs) {
      const src = m.byAow[program.id];
      if (!src || !src.length) continue;

      let pSubAlliance = 0;
      let pSubOthers = 0;
      let pSo = 0;
      let pUnknown = 0;
      let pTotal = 0;
      const othersSubtotals: Record<string, number> = {};
      const bioSubtotal = { v: 0 };
      const ciatSubtotal = { v: 0 };

      for (const aowRow of src) {
        const cells = aowRow.cells;
        const bioV = bioCenter ? cells[bioCenter.code] || 0 : 0;
        const ciatV = ciatCenter ? cells[ciatCenter.code] || 0 : 0;
        const allianceSub = bioV + ciatV;

        const row: any[] = [
          { v: program.name, s: this.styleText },
          { v: aowRow.aow_acrnum || aowRow.aow_name, s: this.styleText },
          { v: bioV, t: 'n', s: this.styleNumber },
          { v: ciatV, t: 'n', s: this.styleNumber },
          { v: allianceSub, t: 'n', s: this.styleNumber },
        ];
        let subCenters = allianceSub;
        for (const c of otherCenters) {
          const v = cells[c.code] || 0;
          row.push({ v, t: 'n', s: this.styleNumber });
          subCenters += v;
          othersSubtotals[c.code] = (othersSubtotals[c.code] || 0) + v;
        }
        const soV = soCenter ? cells[soCenter.code] || 0 : 0;
        const unknownV = unknownCenter ? cells[unknownCenter.code] || 0 : 0;
        const total = subCenters + soV + unknownV;
        const pct =
          (programTotals.get(program.id) || 0) > 0
            ? total / (programTotals.get(program.id) as number)
            : 0;

        row.push({ v: subCenters, t: 'n', s: this.styleNumber });
        row.push({ v: soV, t: 'n', s: this.styleNumber });
        row.push({ v: unknownV, t: 'n', s: this.styleNumber });
        row.push({ v: soV + unknownV, t: 'n', s: this.styleNumber });
        row.push({ v: total, t: 'n', s: this.styleNumber });
        row.push({
          v: pct,
          t: 'n',
          s: { ...this.styleNumber, numFmt: '0.00%' },
        });
        rows.push(row);

        bioSubtotal.v += bioV;
        ciatSubtotal.v += ciatV;
        pSubAlliance += allianceSub;
        pSubOthers += subCenters - allianceSub;
        pSo += soV;
        pUnknown += unknownV;
        pTotal += total;
      }

      // Sub-Total <program name> row
      const subRow: any[] = [
        { v: `Sub-Total ${program.name}`, s: this.styleSubtotalRow },
        { v: '', s: this.styleSubtotalRow },
        { v: bioSubtotal.v, t: 'n', s: this.styleSubtotalRow },
        { v: ciatSubtotal.v, t: 'n', s: this.styleSubtotalRow },
        { v: pSubAlliance, t: 'n', s: this.styleSubtotalRow },
      ];
      for (const c of otherCenters) {
        subRow.push({
          v: othersSubtotals[c.code] || 0,
          t: 'n',
          s: this.styleSubtotalRow,
        });
      }
      subRow.push({ v: pSubAlliance + pSubOthers, t: 'n', s: this.styleSubtotalRow });
      subRow.push({ v: pSo, t: 'n', s: this.styleSubtotalRow });
      subRow.push({ v: pUnknown, t: 'n', s: this.styleSubtotalRow });
      subRow.push({ v: pSo + pUnknown, t: 'n', s: this.styleSubtotalRow });
      subRow.push({ v: pTotal, t: 'n', s: this.styleSubtotalRow });
      subRow.push({ v: 1, t: 'n', s: { ...this.styleSubtotalRow, numFmt: '0.00%' } });
      rows.push(subRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows, { cellStyles: true });
    ws['!cols'] = [
      { wch: 36 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      ...otherCenters.map(() => ({ wch: 14 })),
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
    ];
    ws['!freeze'] = { xSplit: 2, ySplit: 1 };
    return ws;
  }

}
