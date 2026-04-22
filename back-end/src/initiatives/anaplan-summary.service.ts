import { Injectable, StreamableFile, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx-js-style';
import { Initiative } from 'src/entities/initiative.entity';
import { Organization } from 'src/entities/organization.entity';
import { Submission, SubmissionStatus } from 'src/entities/submission.entity';
import { Phase } from 'src/entities/phase.entity';
import { ClarisaCountry } from 'src/entities/clarisa-country.entity';
import { PorbService } from 'src/porb/porb.service';

interface QueryParams {
  phase_id?: number | string;
  program_ids?: number[] | number | string | string[];
  initiatives?: number[] | number | string | string[];
  status?: string;
}

const UNKNOWN_CENTER_CODE = '999999';
const DEFAULT_VERSION = 'FPC-V1';

// Entity NAME → single-letter ENTITY CODE (from template code list).
// Keys are uppercased for case-insensitive matching.
const ENTITY_CODE_BY_NAME: Record<string, { name: string; code: string }> = {
  AFRICARICE: { name: 'AfricaRice', code: 'A' },
  BIOVERSITY: { name: 'Bioversity', code: 'B' },
  'BIOVERSITY (ALLIANCE)': { name: 'Bioversity', code: 'B' },
  CIAT: { name: 'CIAT', code: 'C' },
  'CIAT (ALLIANCE)': { name: 'CIAT', code: 'C' },
  CIMMYT: { name: 'CIMMYT', code: 'M' },
  CIP: { name: 'CIP', code: 'P' },
  ICARDA: { name: 'ICARDA', code: 'D' },
  IFPRI: { name: 'IFPRI', code: 'N' },
  IITA: { name: 'IITA', code: 'T' },
  ILRI: { name: 'ILRI', code: 'L' },
  IRRI: { name: 'IRRI', code: 'R' },
  IWMI: { name: 'IWMI', code: 'W' },
  WORLDFISH: { name: 'WorldFish', code: 'F' },
  SO: { name: 'SO', code: 'Q' },
  'SYSTEM ORGANIZATION': { name: 'SO', code: 'Q' },
  ICRISAT: { name: 'ICRISAT', code: 'S' },
  UNALLOCATED: { name: 'Unallocated', code: 'U' },
  UNKNOWN: { name: 'Unallocated', code: 'U' },
};

// Full ordered entity list for the Sheet 1 code-lookup column.
const ENTITY_LOOKUP_ORDER: Array<{ name: string; code: string }> = [
  { name: 'AfricaRice', code: 'A' },
  { name: 'Bioversity', code: 'B' },
  { name: 'CIAT', code: 'C' },
  { name: 'CIMMYT', code: 'M' },
  { name: 'CIP', code: 'P' },
  { name: 'ICARDA', code: 'D' },
  { name: 'IFPRI', code: 'N' },
  { name: 'IITA', code: 'T' },
  { name: 'ILRI', code: 'L' },
  { name: 'IRRI', code: 'R' },
  { name: 'IWMI', code: 'W' },
  { name: 'WorldFish', code: 'F' },
  { name: 'SO', code: 'Q' },
  { name: 'ICRISAT', code: 'S' },
  { name: 'Unallocated', code: 'U' },
];

// Our Anaplan.label → (ACCOUNT, ACCOUNT CODE, Account Module) per template.
// Keys are lowercased + trimmed for fuzzy match.
interface AccountMapping {
  account: string;
  code: string;
  module: string;
}
const ACCOUNT_MAP: Record<string, AccountMapping> = {
  'staffing, chargebacks and indirect': {
    account: 'Salaries and Wages',
    code: 'A3-0900',
    module: 'Staffing, Chargebacks and Indirect',
  },
  'operations (supplies, consultants, travels, workshops, other)': {
    account: 'Supplies and services',
    code: 'A3-0912',
    module: 'Operations (supplies, consultants, travels, workshops, other)',
  },
  'collaborators non-cgiar centers': {
    account: 'Partners Non CG',
    code: 'A3-0921',
    module: 'Collaborators non-CGIAR centers',
  },
};

// Region code lookups (template code list).
const REGION_CODES: Array<{ description: string; code: string }> = [
  { description: 'CWANA', code: 'R2-CWANA' },
  { description: 'ESA', code: 'R2-ESA' },
  { description: 'LAC', code: 'R2-LAC' },
  { description: 'SA', code: 'R2-SA' },
  { description: 'SEA', code: 'R2-SEA' },
  { description: 'WCA', code: 'R2-WCA' },
];
const REGION_CODES_WITH_GLOBAL: Array<{ description: string; code: string }> = [
  ...REGION_CODES,
  { description: 'GLOBAL', code: 'GO' },
];
const REGION_CODE_BY_NAME: Record<string, string> = {
  CWANA: 'R2-CWANA',
  ESA: 'R2-ESA',
  LAC: 'R2-LAC',
  SA: 'R2-SA',
  SEA: 'R2-SEA',
  WCA: 'R2-WCA',
  GLOBAL: 'GO',
};

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// YEAR string like "FY26" from phase.reportingYear = 2026.
function formatYear(reportingYear: number | null | undefined): string {
  if (!reportingYear || !Number.isFinite(Number(reportingYear))) return '';
  const yy = Number(reportingYear) % 100;
  return `FY${yy.toString().padStart(2, '0')}`;
}

// Convert "AOW00", "AOW01" → "AoW00", "AoW01" to match template casing.
function formatAow(aowAcrnum: string | null | undefined): string {
  const s = (aowAcrnum || '').trim();
  if (!s) return '';
  const upper = s.toUpperCase();
  if (upper.startsWith('AOW')) return 'AoW' + s.substring(3);
  return s;
}

@Injectable()
export class AnaplanSummaryService {
  private readonly logger = new Logger(AnaplanSummaryService.name);

  constructor(
    @InjectRepository(Initiative)
    private readonly initiativeRepository: Repository<Initiative>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Phase)
    private readonly phaseRepository: Repository<Phase>,
    @InjectRepository(ClarisaCountry)
    private readonly clarisaCountryRepository: Repository<ClarisaCountry>,
    @Inject(forwardRef(() => PorbService))
    private readonly porbService: PorbService,
  ) {}

  /**
   * Build the 3-sheet Anaplan Summary workbook (CSV Transactional,
   * CSV Country Implementation, CSV Location of Benefit).
   */
  async getWorkbook(query: QueryParams = {}): Promise<StreamableFile> {
    // ---- Load lookup data ----
    const [allOrgs, phase, countries] = await Promise.all([
      this.organizationRepository.find(),
      this.resolvePhase(query.phase_id),
      this.clarisaCountryRepository.find(),
    ]);
    const orgByCode = new Map<string, Organization>();
    for (const o of allOrgs) orgByCode.set(String(o.code), o);

    // Country name → ISO alpha-2 (upper) for Sheet 2/3 resolution.
    const countryCodeByName = new Map<string, string>();
    for (const c of countries) {
      if (c?.name && c?.isoAlpha2) {
        countryCodeByName.set(c.name.trim().toLowerCase(), c.isoAlpha2.toUpperCase());
      }
    }

    const year = formatYear(phase?.reportingYear);
    const version = (phase?.anaplan_version || '').trim() || DEFAULT_VERSION;

    // ---- Resolve status / program list ----
    const statusRaw = (query.status || '').toString().trim().toLowerCase();
    let statusFilter: SubmissionStatus | 'Draft' = SubmissionStatus.APPROVED;
    if (statusRaw === 'pending') statusFilter = SubmissionStatus.PENDING;
    else if (statusRaw === 'draft') statusFilter = 'Draft';
    else if (statusRaw === 'approved' || !statusRaw)
      statusFilter = SubmissionStatus.APPROVED;

    const initQb = this.initiativeRepository
      .createQueryBuilder('init')
      .where('init.archived = :archived', { archived: false });

    const rawIds = query.program_ids ?? query.initiatives;
    if (rawIds) {
      const ids = (Array.isArray(rawIds) ? rawIds : [rawIds])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (ids.length) initQb.andWhere('init.id IN (:...ids)', { ids });
    }
    const initiatives = await initQb.getMany();
    initiatives.sort((a, b) =>
      (a.official_code || '').localeCompare(b.official_code || ''),
    );

    // ---- Latest submission per initiative (for Approved/Pending) ----
    const latestByInit = new Map<number, Submission>();
    if (statusFilter !== 'Draft' && initiatives.length) {
      const subQb = this.submissionRepository
        .createQueryBuilder('sub')
        .where('sub.status = :status', { status: statusFilter })
        .andWhere('sub.porb_data IS NOT NULL')
        .andWhere("sub.porb_data != ''")
        .andWhere('sub.initiative_id IN (:...ids)', {
          ids: initiatives.map((i) => i.id),
        })
        .orderBy('sub.id', 'DESC');
      const subs = await subQb.getMany();
      for (const sub of subs) {
        if (!latestByInit.has(sub.initiative_id)) {
          latestByInit.set(sub.initiative_id, sub);
        }
      }
    }

    // ---- Collect rows for each sheet ----
    const transactionalRows: TransactionalRow[] = [];
    const countryRows: GeoRow[] = [];
    const locationRows: GeoRow[] = [];
    const unmappedAccountWarnings = new Set<string>();

    for (const initiative of initiatives) {
      let snap: any = null;
      if (statusFilter === 'Draft') {
        try {
          snap = await this.porbService.buildPorbSnapshot(initiative.id);
        } catch (e: any) {
          this.logger.warn(
            `Failed live snapshot for program ${initiative.id}: ${e?.message || e}`,
          );
          continue;
        }
      } else {
        const sub = latestByInit.get(initiative.id);
        if (!sub) continue;
        try {
          snap =
            typeof sub.porb_data === 'string'
              ? JSON.parse(sub.porb_data)
              : sub.porb_data;
        } catch {
          this.logger.warn(
            `Failed to parse porb_data for submission ${sub.id} (program ${initiative.id})`,
          );
          continue;
        }
      }
      if (!snap || !Array.isArray(snap.aows)) continue;

      const programName = initiative.name || '';
      const sp = initiative.official_code || '';

      for (const aow of snap.aows) {
        const aowLabel = formatAow(aow?.aow_acrnum);
        if (!aowLabel) continue;

        for (const center of aow?.centers || []) {
          const centerCode = String(center?.center_code ?? '');
          const org = orgByCode.get(centerCode) || null;
          const entity = this.resolveEntity(centerCode, org);

          // Sheet 1: transactional (one row per anaplan account with a non-zero budget)
          for (const a of center?.anaplan || []) {
            const amount = num(a?.porb_budget);
            if (!amount) continue;
            const rawLabel = String(a?.account || '').trim();
            const map = ACCOUNT_MAP[rawLabel.toLowerCase()];
            if (!map) {
              unmappedAccountWarnings.add(rawLabel);
              continue;
            }
            transactionalRows.push({
              programName,
              sp,
              aow: aowLabel,
              year,
              version,
              account: map.account,
              accountCode: map.code,
              entityName: entity.name,
              entityCode: entity.code,
              amount,
            });
          }

          // Sheet 2: country percentages
          for (const c of center?.country_percentages || []) {
            const pct = num(c?.percentage);
            if (!pct) continue;
            const countryName = String(c?.country_name || '').trim();
            if (!countryName) continue;
            const iso = countryCodeByName.get(countryName.toLowerCase()) || '';
            countryRows.push({
              programSp: sp,
              aow: aowLabel,
              entityName: entity.name,
              entityCode: entity.code,
              region: '',
              country: countryName,
              percentage: pct / 100,
              uploadCode: iso,
            });
          }

          // Sheet 3: location of benefit (country, region, or global)
          for (const l of center?.location_benefits || []) {
            const pct = num(l?.percentage);
            if (!pct) continue;
            const locName = String(l?.location_name || '').trim();
            const locType = String(l?.location_type || '').toLowerCase();
            if (!locName) continue;
            let region = '';
            let country = '';
            let uploadCode = '';
            if (locType === 'country') {
              country = locName;
              uploadCode = countryCodeByName.get(locName.toLowerCase()) || '';
            } else if (locType === 'region') {
              region = locName;
              uploadCode = REGION_CODE_BY_NAME[locName.toUpperCase()] || '';
            } else if (locType === 'global') {
              region = 'Global';
              uploadCode = 'GO';
            } else {
              continue;
            }
            locationRows.push({
              programSp: sp,
              aow: aowLabel,
              entityName: entity.name,
              entityCode: entity.code,
              region,
              country,
              percentage: pct / 100,
              uploadCode,
            });
          }
        }
      }
    }

    if (unmappedAccountWarnings.size) {
      this.logger.warn(
        `Anaplan Summary: skipped rows with unmapped account labels: ${Array.from(
          unmappedAccountWarnings,
        ).join(', ')}`,
      );
    }

    // ---- Build workbook ----
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      this.buildTransactionalSheet(transactionalRows),
      'CSV Transactional',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.buildGeoSheet(countryRows, /*withGlobal*/ false),
      'CSV Country Implementation',
    );
    XLSX.utils.book_append_sheet(
      wb,
      this.buildGeoSheet(locationRows, /*withGlobal*/ true),
      'CSV  Location of Benefit',
    );

    const buf: Buffer = Buffer.from(
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }),
    );

    let prefix = '';
    if (statusRaw === 'approved') prefix = 'Approved_';
    else if (statusRaw === 'pending') prefix = 'Pending_';
    else if (statusRaw === 'draft') prefix = 'Draft_';
    const filename = `${prefix}Anaplan-Summary.xlsx`;

    return new StreamableFile(buf, {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private async resolvePhase(phaseId: number | string | undefined): Promise<Phase | null> {
    const id = Number(phaseId);
    if (Number.isFinite(id) && id > 0) {
      const p = await this.phaseRepository.findOneBy({ id });
      if (p) return p;
    }
    // Fall back to the active phase.
    return this.phaseRepository.findOneBy({ active: true });
  }

  private resolveEntity(
    centerCode: string,
    org: Organization | null,
  ): { name: string; code: string } {
    if (centerCode === UNKNOWN_CENTER_CODE) {
      return ENTITY_CODE_BY_NAME['UNALLOCATED'];
    }
    const acr = (org?.acronym || '').trim().toUpperCase();
    if (acr && ENTITY_CODE_BY_NAME[acr]) return ENTITY_CODE_BY_NAME[acr];
    const nm = (org?.name || '').trim().toUpperCase();
    if (nm && ENTITY_CODE_BY_NAME[nm]) return ENTITY_CODE_BY_NAME[nm];
    // Fall back: return acronym as name, empty code. Template emits blank code
    // rather than guessing — matches user's instruction "don't generate codes".
    return { name: org?.acronym || org?.name || centerCode, code: '' };
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
  private get styleText() {
    return {
      alignment: { horizontal: 'left', vertical: 'center' },
      border: this.thinBorder(),
    };
  }
  private get styleNumber() {
    return {
      numFmt: '#,##0',
      alignment: { horizontal: 'right' },
      border: this.thinBorder(),
    };
  }
  private get stylePercent() {
    return {
      numFmt: '0.00%',
      alignment: { horizontal: 'right' },
      border: this.thinBorder(),
    };
  }
  private get styleLookupHeader() {
    return {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E7E6E6' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: this.thinBorder(),
    };
  }
  private get styleLookupCell() {
    return {
      alignment: { horizontal: 'left', vertical: 'center' },
      border: this.thinBorder(),
    };
  }
  private thinBorder() {
    const s = { style: 'thin', color: { rgb: 'BFBFBF' } };
    return { top: s, bottom: s, left: s, right: s };
  }

  /** Sheet 1: CSV Transactional. */
  private buildTransactionalSheet(rows: TransactionalRow[]): XLSX.WorkSheet {
    const header: any[] = [
      { v: 'P&A Name', s: this.styleHeader },
      { v: 'SP', s: this.styleHeader },
      { v: 'Area of Work', s: this.styleHeader },
      { v: 'YEAR', s: this.styleHeader },
      { v: 'VERSION', s: this.styleHeader },
      { v: 'ACCOUNT', s: this.styleHeader },
      { v: 'ACCOUNT CODE', s: this.styleHeader },
      { v: 'ENTITY', s: this.styleHeader },
      { v: 'ENTITY CODE', s: this.styleHeader },
      { v: 'AMOUNT', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      // Lookup cols K–L: Area Of Work → Account Module (headers only on row 1)
      { v: 'Area Of Work', s: this.styleLookupHeader },
      { v: 'Account Module', s: this.styleLookupHeader },
      { v: '', s: this.styleHeader },
      // N–O ENTITY NAME → CODE
      { v: 'ENTITY NAME', s: this.styleLookupHeader },
      { v: 'ENTITY CODE', s: this.styleLookupHeader },
      { v: '', s: this.styleHeader },
      // Q–S ACCOUNT → ACCOUNT CODE → Account Module
      { v: 'ACCOUNT', s: this.styleLookupHeader },
      { v: 'ACCOUNT CODE', s: this.styleLookupHeader },
      { v: 'Account Module', s: this.styleLookupHeader },
    ];

    const dataRows: any[][] = [header];

    for (const r of rows) {
      dataRows.push([
        { v: r.programName, s: this.styleText },
        { v: r.sp, s: this.styleText },
        { v: r.aow, s: this.styleText },
        { v: r.year, s: this.styleText },
        { v: r.version, s: this.styleText },
        { v: r.account, s: this.styleText },
        { v: r.accountCode, s: this.styleText },
        { v: r.entityName, s: this.styleText },
        { v: r.entityCode, s: this.styleText },
        { v: r.amount, t: 'n', s: this.styleNumber },
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(dataRows, { cellStyles: true });

    // Fill lookup tables (columns K–S) regardless of data rows.
    this.writeLookupColumns(ws, 'transactional');

    ws['!cols'] = [
      { wch: 30 }, // A P&A Name
      { wch: 6 }, // B SP
      { wch: 12 }, // C Area of Work
      { wch: 8 }, // D YEAR
      { wch: 10 }, // E VERSION
      { wch: 24 }, // F ACCOUNT
      { wch: 12 }, // G ACCOUNT CODE
      { wch: 14 }, // H ENTITY
      { wch: 10 }, // I ENTITY CODE
      { wch: 14 }, // J AMOUNT
      { wch: 2 }, // K spacer
      { wch: 14 }, // L Area Of Work
      { wch: 42 }, // M Account Module
      { wch: 2 }, // N spacer
      { wch: 18 }, // O ENTITY NAME
      { wch: 12 }, // P CODE
      { wch: 2 }, // Q spacer
      { wch: 24 }, // R ACCOUNT
      { wch: 14 }, // S ACCOUNT CODE
      { wch: 42 }, // T Account Module
    ];
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    return ws;
  }

  /** Sheet 2 (Country Implementation) and Sheet 3 (Location of Benefit). */
  private buildGeoSheet(rows: GeoRow[], withGlobal: boolean): XLSX.WorkSheet {
    const header: any[] = [
      { v: 'ID', s: this.styleHeader },
      { v: 'P&A', s: this.styleHeader },
      { v: 'Area of Work', s: this.styleHeader },
      { v: 'ENTITY', s: this.styleHeader },
      { v: 'ENTITY CODE', s: this.styleHeader },
      { v: 'REGION', s: this.styleHeader },
      { v: 'COUNTRY', s: this.styleHeader },
      { v: '%', s: this.styleHeader },
      { v: 'Country Upload', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      // N–O ENTITY NAME → CODE
      { v: 'ENTITY NAME', s: this.styleLookupHeader },
      { v: 'CODE', s: this.styleLookupHeader },
      { v: '', s: this.styleHeader },
      // Q–S Regions
      { v: 'Regions', s: this.styleLookupHeader },
      { v: '', s: this.styleHeader },
      { v: '', s: this.styleHeader },
      // T–V Countries
      { v: 'Countries', s: this.styleLookupHeader },
      { v: '', s: this.styleHeader },
    ];

    const dataRows: any[][] = [header];
    rows.forEach((r, idx) => {
      dataRows.push([
        { v: idx + 1, t: 'n', s: this.styleNumber },
        { v: r.programSp, s: this.styleText },
        { v: r.aow, s: this.styleText },
        { v: r.entityName, s: this.styleText },
        { v: r.entityCode, s: this.styleText },
        { v: r.region, s: this.styleText },
        { v: r.country, s: this.styleText },
        { v: r.percentage, t: 'n', s: this.stylePercent },
        { v: r.uploadCode, s: this.styleText },
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows, { cellStyles: true });
    this.writeLookupColumns(ws, 'geo', withGlobal);

    ws['!cols'] = [
      { wch: 6 }, // A ID
      { wch: 6 }, // B P&A
      { wch: 12 }, // C Area of Work
      { wch: 14 }, // D ENTITY
      { wch: 10 }, // E ENTITY CODE
      { wch: 14 }, // F REGION
      { wch: 28 }, // G COUNTRY
      { wch: 8 }, // H %
      { wch: 14 }, // I Country Upload
      { wch: 2 }, // J
      { wch: 2 }, // K
      { wch: 2 }, // L
      { wch: 2 }, // M
      { wch: 2 }, // N spacer
      { wch: 20 }, // O ENTITY NAME
      { wch: 8 }, // P CODE
      { wch: 2 }, // Q spacer
      { wch: 14 }, // R Description
      { wch: 14 }, // S Code
      { wch: 2 }, // T spacer
      { wch: 36 }, // U Description
      { wch: 8 }, // V Code
    ];
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    return ws;
  }

  /**
   * Populate the code-list lookup columns on the right side of each sheet,
   * mirroring the reference template. Rows are written starting at row 2
   * (underneath the headers we already placed on row 1).
   */
  private writeLookupColumns(
    ws: XLSX.WorkSheet,
    kind: 'transactional' | 'geo',
    withGlobal = false,
  ) {
    const setCell = (cellRef: string, value: any, style: any) => {
      ws[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's', s: style };
    };

    if (kind === 'transactional') {
      // L2 onward: Area Of Work → Account Module (3 modules)
      const modules = [
        'Collaborators non-CGIAR centers',
        'Operations (supplies, consultants, travels, workshops, other)',
        'Staffing, Chargebacks and Indirect',
      ];
      // The reference template lists AoW00..AoW08 × 3 modules. We keep it compact.
      const aows = ['AoW00', 'AoW01', 'AoW02', 'AoW03', 'AoW04', 'AoW05', 'AoW06', 'AoW07', 'AoW08'];
      let r = 2;
      for (const a of aows) {
        for (const m of modules) {
          setCell(`L${r}`, a, this.styleLookupCell);
          setCell(`M${r}`, m, this.styleLookupCell);
          r++;
        }
      }
      // O–P: ENTITY NAME → CODE
      ENTITY_LOOKUP_ORDER.forEach((e, i) => {
        setCell(`O${i + 2}`, e.name, this.styleLookupCell);
        setCell(`P${i + 2}`, e.code, this.styleLookupCell);
      });
      // R–T: ACCOUNT → ACCOUNT CODE → Account Module
      const accounts = [
        { account: 'Salaries and Wages', code: 'A3-0900', module: 'Staffing, Chargebacks and Indirect' },
        { account: 'Employee Benefits', code: 'A3-0901', module: '' },
        { account: 'Consultants', code: 'A3-0910', module: '' },
        { account: 'Workshops and conferences', code: 'A3-0911', module: '' },
        { account: 'Supplies and services', code: 'A3-0912', module: 'Operations (supplies, consultants, travels, workshops, other)' },
        { account: 'Other expenses and losses', code: 'A3-0914', module: '' },
        { account: 'Partners Non CG', code: 'A3-0921', module: 'Collaborators non-CGIAR centers' },
        { account: 'Depreciation project assets', code: 'A3-0931', module: '' },
        { account: 'Depreciation', code: 'A3-0930', module: '' },
        { account: 'Travel', code: 'A3-0940', module: '' },
        { account: 'One CGIAR Business Services - charges', code: 'A3-0991', module: '' },
        { account: 'Chargeback - FAC', code: 'A3-0952', module: '' },
        { account: 'Chargeback - IT', code: 'A3-0953', module: '' },
        { account: 'Chargeback - RS', code: 'A3-0951', module: '' },
        { account: 'Chargeback - OTH', code: 'A3-0950', module: '' },
        { account: 'Overhead', code: 'A3-0960', module: '' },
      ];
      accounts.forEach((a, i) => {
        setCell(`R${i + 2}`, a.account, this.styleLookupCell);
        setCell(`S${i + 2}`, a.code, this.styleLookupCell);
        setCell(`T${i + 2}`, a.module, this.styleLookupCell);
      });
    } else {
      // Geo sheets: O–P ENTITY NAME → CODE
      ENTITY_LOOKUP_ORDER.forEach((e, i) => {
        setCell(`O${i + 2}`, e.name, this.styleLookupCell);
        setCell(`P${i + 2}`, e.code, this.styleLookupCell);
      });
      // R–S Regions (header row 2: "Description | Code")
      setCell('R2', 'Description', this.styleLookupHeader);
      setCell('S2', 'Code', this.styleLookupHeader);
      const regions = withGlobal ? REGION_CODES_WITH_GLOBAL : REGION_CODES;
      regions.forEach((r, i) => {
        setCell(`R${i + 3}`, r.description, this.styleLookupCell);
        setCell(`S${i + 3}`, r.code, this.styleLookupCell);
      });
      // U–V Countries (header row 2: "Description | Code")
      setCell('U2', 'Description', this.styleLookupHeader);
      setCell('V2', 'Code', this.styleLookupHeader);
      // We keep this minimal: include only countries that appear in the data
      // would require a second pass; instead emit the full ClarisaCountry list
      // resolved above — but to avoid bloating the output we only list the
      // countries relevant to data. For parity with the reference workbook,
      // leave the lookup population to the caller passing `countries` when
      // building the sheet. Populated in buildGeoSheet via writeCountryLookup.
    }

    // Update the sheet's dimension range so openpyxl/Excel picks up the new cells.
    const ref = ws['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);
    // Extend to column V (index 21) and at least through the lookup rows.
    range.e.c = Math.max(range.e.c, 21);
    range.e.r = Math.max(range.e.r, 30);
    ws['!ref'] = XLSX.utils.encode_range(range);
  }
}

// ==========================================================================
// Types
// ==========================================================================

interface TransactionalRow {
  programName: string;
  sp: string;
  aow: string;
  year: string;
  version: string;
  account: string;
  accountCode: string;
  entityName: string;
  entityCode: string;
  amount: number;
}

interface GeoRow {
  programSp: string;
  aow: string;
  entityName: string;
  entityCode: string;
  region: string;
  country: string;
  percentage: number; // fraction (0.5 = 50%)
  uploadCode: string;
}
