import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { HeaderService } from 'src/app/header.service';
import { InitiativesService, MatrixResponse, BudgetMatrixCenter } from 'src/app/services/initiatives.service';
import { PhasesService } from 'src/app/services/phases.service';
import { jsPDF } from 'jspdf';
import { LoaderService } from 'src/app/services/loader.service';

@Component({
    selector: 'app-total-init-summary',
    templateUrl: './total-init-summary.component.html',
    styleUrls: ['./total-init-summary.component.scss'],
    standalone: false
})
export class TotalInitSummaryComponent implements OnInit {

  @ViewChild('tab0content', { static: false }) tab0content!: ElementRef;
  @ViewChild('tab1content', { static: false }) tab1content!: ElementRef;

  phases: any[] = [];
  initiatives: any[] = [];
  organizationFilters: any[] = [];
  activePhases: any;
  filterForm: FormGroup;
  selectedTabIndex = 0;

  matrix: MatrixResponse | null = null;
  loading = false;

  // ---- Tab 1: By Center ----
  tab1Columns: string[] = [];
  tab1ProgramTotals: Record<number, number> = {};
  tab1ColumnTotals: Record<string, number> = {};
  tab1GrandTotal = 0;

  // ---- Alliance split ----
  useAllianceSplit = false;
  bioversityCode: string | null = null;
  ciatCode: string | null = null;
  /** Centers after removing bioversity/CIAT codes (used in tab1 iteration) */
  visibleCenters: BudgetMatrixCenter[] = [];

  constructor(
    private headerService: HeaderService,
    private initiativesService: InitiativesService,
    private phaseService: PhasesService,
    private title: Title,
    private meta: Meta,
    private fb: FormBuilder,
    public loader: LoaderService,
  ) {
    this.headerService.background = "linear-gradient(to bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain = "linear-gradient(to top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton = "linear-gradient(to top, #0F212F, #09151E)";
    this.headerService.backgroundFooter = "linear-gradient(to top, #0F212F, #09151E)";
    this.filterForm = this.fb.group({
      phase_id: [null],
      partners: [null],
      initiatives: [null]
    });
  }

  async ngOnInit() {
    this.phases = await this.phaseService.getPhases();
    this.activePhases = await this.phaseService.getActivePhase();
    this.initiatives = await this.initiativesService.findAllInitiatives() || [];
    this.organizationFilters = [];

    this.setActivePhase();
    await this.loadMatrix(this.filterForm.value);

    this.filterForm.valueChanges.subscribe(() => {
      this.loadMatrix(this.filterForm.value);
    });

    this.title.setTitle("Budget Summary");
    this.meta.updateTag({ name: "description", content: "Budget Summary" });
  }

  setActivePhase() {
    if (this.activePhases?.id) {
      this.filterForm.patchValue({ phase_id: this.activePhases.id }, { emitEvent: false });
    }
  }

  async loadMatrix(filters: any = null) {
    this.loading = true;
    try {
      this.matrix = await this.initiativesService.getBudgetMatrix(filters);
      this.computeDerivedData();
    } catch {
      this.matrix = null;
    } finally {
      this.loading = false;
    }
  }

  private computeDerivedData() {
    if (!this.matrix) return;

    const { alliance, centers } = this.matrix;
    this.bioversityCode = alliance?.bioversityCode ?? null;
    this.ciatCode = alliance?.ciatCode ?? null;
    this.useAllianceSplit = !!(this.bioversityCode && this.ciatCode);

    // Centers excluding alliance codes when split mode
    this.visibleCenters = this.useAllianceSplit
      ? centers.filter(c => c.code !== this.bioversityCode && c.code !== this.ciatCode)
      : centers;

    // Build tab1 column list
    this.tab1Columns = ['official_code', 'name', 'total'];
    if (this.useAllianceSplit) {
      this.tab1Columns.push('bioversity', 'ciat', 'alliance_subtotal');
    }
    for (const c of this.visibleCenters) {
      this.tab1Columns.push(c.code);
    }

    // Compute program totals and column totals for tab1
    this.tab1ProgramTotals = {};
    this.tab1ColumnTotals = {};
    this.tab1GrandTotal = 0;

    for (const prog of this.matrix.programs) {
      const byCenter = this.matrix.byCenter[prog.id] ?? {};
      let programTotal = 0;
      for (const c of this.matrix.centers) {
        programTotal += byCenter[c.code] ?? 0;
      }
      this.tab1ProgramTotals[prog.id] = programTotal;
      this.tab1GrandTotal += programTotal;

      // column totals
      for (const c of this.matrix.centers) {
        this.tab1ColumnTotals[c.code] = (this.tab1ColumnTotals[c.code] ?? 0) + (byCenter[c.code] ?? 0);
      }
    }

    // alliance column totals
    if (this.useAllianceSplit) {
      let bvTotal = 0;
      let ciatTotal = 0;
      for (const prog of this.matrix.programs) {
        const byCenter = this.matrix.byCenter[prog.id] ?? {};
        bvTotal += byCenter[this.bioversityCode!] ?? 0;
        ciatTotal += byCenter[this.ciatCode!] ?? 0;
      }
      this.tab1ColumnTotals['_bioversity'] = bvTotal;
      this.tab1ColumnTotals['_ciat'] = ciatTotal;
      this.tab1ColumnTotals['_alliance_subtotal'] = bvTotal + ciatTotal;
    }
  }

  // ---- Tab 1 helpers ----
  getCenterCell(programId: number, code: string): number {
    return this.matrix?.byCenter[programId]?.[code] ?? 0;
  }

  getBioversityCell(programId: number): number {
    return this.bioversityCode ? (this.matrix?.byCenter[programId]?.[this.bioversityCode] ?? 0) : 0;
  }

  getCiatCell(programId: number): number {
    return this.ciatCode ? (this.matrix?.byCenter[programId]?.[this.ciatCode] ?? 0) : 0;
  }

  getAllianceSubtotal(programId: number): number {
    return this.getBioversityCell(programId) + this.getCiatCell(programId);
  }

  // ---- Tab 2/3: AoW per program ----
  getProgramTotal(programId: number): number {
    return this.tab1ProgramTotals[programId] ?? 0;
  }

  getAowRows(programId: number) {
    return this.matrix?.byAow?.[programId] ?? [];
  }

  getAowCellBioversity(row: any): number {
    return this.bioversityCode ? (row.cells?.[this.bioversityCode] ?? 0) : 0;
  }

  getAowCellCiat(row: any): number {
    return this.ciatCode ? (row.cells?.[this.ciatCode] ?? 0) : 0;
  }

  getAowCellAllianceSubtotal(row: any): number {
    return this.getAowCellBioversity(row) + this.getAowCellCiat(row);
  }

  getAowCenterCell(row: any, code: string): number {
    return row.cells?.[code] ?? 0;
  }

  getAowPct(row: any, programId: number): string {
    const total = this.getProgramTotal(programId);
    if (!total) return '0.0%';
    return ((row.subtotal / total) * 100).toFixed(1) + '%';
  }

  // ---- Formatting ----
  fmt(n: number | null | undefined): string {
    if (n == null || n === 0) return '';
    return new Intl.NumberFormat('en-US').format(n);
  }

  fmtZero(n: number | null | undefined): string {
    return new Intl.NumberFormat('en-US').format(n ?? 0);
  }

  // ---- Export ----
  async exportExcel() {
    await this.initiativesService.exportExcel(this.filterForm.value);
  }

  async exportAnaplanSummary() {
    await this.initiativesService.exportAnaplanSummary(this.filterForm.value);
  }

  get activePdfContent(): ElementRef | null {
    switch (this.selectedTabIndex) {
      case 0: return this.tab0content;
      case 1: return this.tab1content;
      default: return this.tab0content;
    }
  }

  exportPdf() {
    const el = this.activePdfContent?.nativeElement;
    if (!el) return;
    this.loader.setLoading(true, "Downloading");
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [el.scrollWidth, el.scrollHeight + 100],
    });
    setTimeout(() => {
      doc.html(el, {
        callback: (d: any) => {
          d.save("Planning-Budget Summary.pdf");
          this.loader.setLoading(false);
        },
      });
    }, 500);
  }

  resetForm() {
    this.filterForm.reset();
    this.filterForm.markAsUntouched();
    this.setActivePhase();
  }

  onTabChange(index: number) {
    this.selectedTabIndex = index;
  }

  get tab1FooterTotal(): number {
    return this.tab1GrandTotal;
  }
}
