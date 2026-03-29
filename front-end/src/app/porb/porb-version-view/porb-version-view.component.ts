import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HeaderService } from "src/app/header.service";
import { PorbService } from "src/app/services/porb.service";

// ──────────────────────────────────────────────────────────────────────────────
// Internal types used only in this component
// ──────────────────────────────────────────────────────────────────────────────

interface BudgetOverviewRow {
  aowCode: string;
  aowName: string;
  innovationTarget: number;
  innovationBudget: number;
  knowledgeTarget: number;
  knowledgeBudget: number;
  capacityTarget: number;
  capacityBudget: number;
  othersTarget: number;
  othersBudget: number;
  totalPooledFunding: number;
  anaplanBudget: number;
  partnerBudget: number;
  meliaBudget: number;
}

interface BudgetOverviewTotals {
  innovationBudgetFmt: string;
  knowledgeBudgetFmt: string;
  capacityBudgetFmt: string;
  othersBudgetFmt: string;
  totalPooledFundingFmt: string;
  anaplanBudgetFmt: string;
  partnerBudgetFmt: string;
  meliaBudgetFmt: string;
}

interface AnaplanConsolidated {
  aows: string[];
  accounts: Array<{ label: string; budgetByAow: Record<string, number>; total: number }>;
  grandTotal: number;
  grandTotalByAow: Record<string, number>;
}

@Component({
  selector: "app-porb-version-view",
  templateUrl: "./porb-version-view.component.html",
  styleUrls: ["./porb-version-view.component.scss"],
  standalone: false,
})
export class PorbVersionViewComponent implements OnInit {
  submissionId!: number;
  programId!: number;
  officalCode!: string;

  submission: any = null;
  porbData: any = null;
  loading = true;
  exportingZip = false;

  // Top-level view state
  activeView: "summary" | "center" = "summary";

  // Navigation state
  centers: any[] = [];
  selectedCenter: any = null;
  aows: any[] = [];
  selectedAow: any = null;

  // Center-level view mode (same concept as main PORB component)
  centerViewMode: "consolidated" | "budget-entry" = "budget-entry";

  // Section navigation (same order as porb.component)
  extraNavigationItems = [
    "Pool funding HLO",
    "Partners",
    "MELIA Study",
    "Anaplan",
    "Cross Cutting",
    "Countries of Implementation",
  ];
  selectedSection: string | null = null;
  isW3View = false;

  // Current section rows
  currentRows: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private porbService: PorbService,
    private headerService: HeaderService
  ) {
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
  }

  ngOnInit(): void {
    this.submissionId = +this.route.snapshot.params["submission_id"];
    this.programId = +this.route.snapshot.params["id"];
    this.officalCode = this.route.snapshot.params["code"];
    this.loadVersion();
  }

  async loadVersion(): Promise<void> {
    this.loading = true;
    try {
      this.submission = await this.porbService.getSubmissionVersion(
        this.submissionId
      );
      this.porbData = this.submission?.porb_data ?? null;
      this.buildNavigation();
    } finally {
      this.loading = false;
    }
  }

  buildNavigation(): void {
    if (!this.porbData) return;

    // Extract unique centers from all AOWs
    const centerMap = new Map<string, { code: string; name: string }>();
    for (const aow of this.porbData.aows || []) {
      for (const c of aow.centers || []) {
        if (!centerMap.has(c.center_code)) {
          centerMap.set(c.center_code, {
            code: c.center_code,
            name: c.center_name,
          });
        }
      }
    }
    this.centers = Array.from(centerMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Build the shared AOW list (used in both budget-entry and consolidated views)
    this.aows = (this.porbData.aows || []).map((a: any) => ({
      id: a.id,
      toc_id: a.toc_id,
      aow_name: a.aow_name,
      aow_acrnum: a.aow_acrnum,
    }));

    // Default to summary view (already set by property initializer)
  }

  // ── View selection ──────────────────────────────────────────────────────────

  selectSummary(): void {
    this.activeView = "summary";
    this.selectedCenter = null;
  }

  selectCenter(center: any): void {
    const sameCenter = this.selectedCenter?.code === center.code;
    this.activeView = "center";
    this.selectedCenter = center;

    if (sameCenter) return;

    this.isW3View = false;
    // Keep centerViewMode (don't reset to budget-entry)

    // If current AOW has no budget on new center, pick first AOW with budget
    if (this.selectedAow && this.aowHasBudget(this.selectedAow)) {
      if (this.selectedSection && !this.sectionHasData(this.selectedSection)) {
        this.selectedSection = this.getFirstSectionWithData() || this.extraNavigationItems[0];
      }
      this.loadSectionRows();
    } else {
      const firstAow = this.getFirstAowWithBudget();
      if (firstAow) {
        this.selectAow(firstAow);
      } else {
        this.selectedAow = null;
        this.currentRows = [];
      }
    }
  }

  selectAow(aow: any): void {
    this.selectedAow = aow;
    this.isW3View = false;
    if (!this.selectedSection || !this.sectionHasData(this.selectedSection)) {
      this.selectedSection = this.getFirstSectionWithData() || this.extraNavigationItems[0];
    }
    this.loadSectionRows();
  }

  /** Get the first AOW that has non-zero budget for the selected center. */
  getFirstAowWithBudget(): any | null {
    for (const aow of this.aows) {
      if (this.aowHasBudget(aow)) return aow;
    }
    return null;
  }

  selectW3(): void {
    if (!this.hasW3DataForCenter(this.selectedCenter)) return;
    this.isW3View = true;
    this.selectedAow = null;
    this.selectedSection = null;
    this.loadW3Rows();
  }

  selectSection(section: string): void {
    this.selectedSection = section;
    this.loadSectionRows();
  }

  loadSectionRows(): void {
    if (!this.selectedAow || !this.selectedCenter || !this.porbData) {
      this.currentRows = [];
      return;
    }

    const aow = (this.porbData.aows || []).find(
      (a: any) => a.id === this.selectedAow.id
    );
    if (!aow) {
      this.currentRows = [];
      return;
    }

    const centerData = (aow.centers || []).find(
      (c: any) => String(c.center_code) === String(this.selectedCenter.code)
    );
    if (!centerData) {
      this.currentRows = [];
      return;
    }

    switch (this.selectedSection) {
      case "Pool funding HLO":
        this.currentRows = centerData.hlos || [];
        break;
      case "Partners":
        this.currentRows = centerData.partners || [];
        break;
      case "MELIA Study":
        this.currentRows = centerData.melias || [];
        break;
      case "Anaplan":
        this.currentRows = centerData.anaplan || [];
        break;
      case "Cross Cutting":
        this.currentRows = centerData.cross_cutting || [];
        break;
      case "Countries of Implementation":
        this.currentRows = centerData.country_percentages || [];
        break;
      default:
        this.currentRows = [];
    }
  }

  loadW3Rows(): void {
    if (!this.selectedCenter || !this.porbData) {
      this.currentRows = [];
      return;
    }
    this.currentRows = (this.porbData.bilaterals || []).filter(
      (b: any) => String(b.center_id) === String(this.selectedCenter.code)
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Check if a section has non-zero budget data for the current AOW+center. */
  sectionHasData(section: string): boolean {
    if (!this.selectedAow || !this.selectedCenter || !this.porbData) return false;
    const aow = (this.porbData.aows || []).find(
      (a: any) => a.id === this.selectedAow.id
    );
    const centerData = (aow?.centers || []).find(
      (c: any) => String(c.center_code) === String(this.selectedCenter.code)
    );
    if (!centerData) return false;

    const sumField = (arr: any[], field: string) =>
      (arr || []).reduce((s: number, r: any) => s + this.n(r[field]), 0);

    switch (section) {
      case "Pool funding HLO": return sumField(centerData.hlos, "hlo_budget") > 0;
      case "Partners": return sumField(centerData.partners, "partner_budget") > 0;
      case "MELIA Study": return sumField(centerData.melias, "melia_budget") > 0;
      case "Anaplan": return sumField(centerData.anaplan, "porb_budget") > 0;
      case "Cross Cutting": return sumField(centerData.cross_cutting, "budget") > 0;
      case "Countries of Implementation": return sumField(centerData.country_percentages, "percentage") > 0;
      default: return false;
    }
  }

  /** Get the first section that has data. */
  getFirstSectionWithData(): string | null {
    for (const section of this.extraNavigationItems) {
      if (this.sectionHasData(section)) return section;
    }
    return null;
  }

  /** Check if a center has any non-zero budget across all AOWs + bilaterals. */
  centerHasBudget(center: any): boolean {
    if (!center || !this.porbData) return false;
    const code = String(center.code);

    // Check bilaterals
    const w3Total = (this.porbData.bilaterals || [])
      .filter((b: any) => String(b.center_id) === code)
      .reduce((s: number, b: any) => s + this.n(b.bilateral_budget), 0);
    if (w3Total > 0) return true;

    // Check all AOWs for this center
    for (const aow of (this.porbData.aows || [])) {
      const cd = (aow.centers || []).find((c: any) => String(c.center_code) === code);
      if (!cd) continue;
      const total =
        (cd.hlos || []).reduce((s: number, r: any) => s + this.n(r.hlo_budget), 0) +
        (cd.partners || []).reduce((s: number, r: any) => s + this.n(r.partner_budget), 0) +
        (cd.melias || []).reduce((s: number, r: any) => s + this.n(r.melia_budget), 0) +
        (cd.anaplan || []).reduce((s: number, r: any) => s + this.n(r.porb_budget), 0) +
        (cd.cross_cutting || []).reduce((s: number, r: any) => s + this.n(r.budget), 0);
      if (total > 0) return true;
    }
    return false;
  }

  /** Check if an AOW has any non-zero budget for the selected center. */
  aowHasBudget(aow: any): boolean {
    if (!aow || !this.selectedCenter || !this.porbData) return false;
    const aowData = (this.porbData.aows || []).find((a: any) => a.id === aow.id);
    if (!aowData) return false;
    const cd = (aowData.centers || []).find(
      (c: any) => String(c.center_code) === String(this.selectedCenter.code)
    );
    if (!cd) return false;
    return (
      (cd.hlos || []).reduce((s: number, r: any) => s + this.n(r.hlo_budget), 0) +
      (cd.partners || []).reduce((s: number, r: any) => s + this.n(r.partner_budget), 0) +
      (cd.melias || []).reduce((s: number, r: any) => s + this.n(r.melia_budget), 0) +
      (cd.anaplan || []).reduce((s: number, r: any) => s + this.n(r.porb_budget), 0) +
      (cd.cross_cutting || []).reduce((s: number, r: any) => s + this.n(r.budget), 0)
    ) > 0;
  }

  hasW3DataForCenter(center: any): boolean {
    if (!center) return false;
    return (this.porbData?.bilaterals || []).some(
      (b: any) => String(b.center_id) === String(center.code) && this.n(b.bilateral_budget) > 0
    );
  }

  get hasW3Data(): boolean {
    return this.hasW3DataForCenter(this.selectedCenter);
  }

  fmtCurrency(value: number | string | null | undefined): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  private n(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Classify HLO type to one of the four indicator buckets. */
  private classifyHloType(type: string): "innovation" | "knowledge" | "capacity" | "others" {
    const t = String(type || "").toLowerCase();
    if (t.includes("innovation")) return "innovation";
    if (t.includes("knowledge")) return "knowledge";
    if (t.includes("capacity")) return "capacity";
    return "others";
  }

  // ── Pooled total for country-percentage section ──────────────────────────────

  get pooledTotal(): number {
    if (!this.selectedAow || !this.selectedCenter || !this.porbData) return 0;
    const aow = (this.porbData.aows || []).find(
      (a: any) => a.id === this.selectedAow.id
    );
    const centerData = (aow?.centers || []).find(
      (c: any) => String(c.center_code) === String(this.selectedCenter.code)
    );
    if (!centerData) return 0;
    const hloTotal = (centerData.hlos || []).reduce(
      (sum: number, h: any) => sum + this.n(h.hlo_budget),
      0
    );
    const crossTotal = (centerData.cross_cutting || []).reduce(
      (sum: number, c: any) => sum + this.n(c.budget),
      0
    );
    return hloTotal + crossTotal;
  }

  // ── Summary consolidated computations ───────────────────────────────────────

  /**
   * Compute Budget Overview rows aggregated across all centers for each AOW.
   * Returns formatted rows ready for template rendering.
   */
  get summaryBudgetOverviewRows(): any[] {
    if (!this.porbData) return [];
    return this._buildBudgetOverviewRows(null);
  }

  get summaryBudgetOverviewTotals(): BudgetOverviewTotals {
    return this._buildBudgetOverviewTotals(this.summaryBudgetOverviewRows);
  }

  /**
   * Compute Anaplan (Budget for Financial Reporting) consolidated across all centers.
   */
  get summaryAnaplanConsolidated(): AnaplanConsolidated | null {
    if (!this.porbData) return null;
    return this._buildAnaplanConsolidated(null);
  }

  /**
   * Compute W3/Bilateral consolidated — per-center totals summed across all AOWs.
   */
  get summaryW3Consolidated(): Array<{ name: string; budget: number; budgetFmt: string }> {
    if (!this.porbData) return [];
    const centerBudgets = new Map<string, { name: string; budget: number }>();
    for (const b of (this.porbData.bilaterals || [])) {
      const key = String(b.center_id);
      const existing = centerBudgets.get(key);
      if (existing) {
        existing.budget += this.n(b.bilateral_budget);
      } else {
        // Find center name from centers list
        const center = this.centers.find((c) => String(c.code) === key);
        centerBudgets.set(key, {
          name: center?.name || key,
          budget: this.n(b.bilateral_budget),
        });
      }
    }
    return Array.from(centerBudgets.values())
      .filter((c) => c.budget > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ ...c, budgetFmt: this.fmtCurrency(c.budget) }));
  }

  get summaryW3GrandTotal(): string {
    const total = this.summaryW3Consolidated.reduce((sum, c) => sum + c.budget, 0);
    return this.fmtCurrency(total);
  }

  // ── Center consolidated computations ────────────────────────────────────────

  /**
   * Compute Budget Overview rows for the currently selected center.
   */
  get centerBudgetOverviewRows(): any[] {
    if (!this.porbData || !this.selectedCenter) return [];
    return this._buildBudgetOverviewRows(String(this.selectedCenter.code));
  }

  get centerBudgetOverviewTotals(): BudgetOverviewTotals {
    return this._buildBudgetOverviewTotals(this.centerBudgetOverviewRows);
  }

  /**
   * Compute Anaplan consolidated for the selected center.
   */
  get centerAnaplanConsolidated(): AnaplanConsolidated | null {
    if (!this.porbData || !this.selectedCenter) return null;
    return this._buildAnaplanConsolidated(String(this.selectedCenter.code));
  }

  /**
   * W3/Bilateral rows for the selected center (for center consolidated view).
   */
  get centerW3Rows(): any[] {
    if (!this.selectedCenter || !this.porbData) return [];
    return (this.porbData.bilaterals || []).filter(
      (b: any) => String(b.center_id) === String(this.selectedCenter.code)
    );
  }

  get centerW3Subtotal(): string {
    const total = this.centerW3Rows.reduce(
      (sum, r) => sum + this.n(r.bilateral_budget),
      0
    );
    return this.fmtCurrency(total);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Build Budget Overview rows aggregated across all centers for every AOW.
   * If centerCode is provided, only data for that center is included.
   */
  private _buildBudgetOverviewRows(
    centerCode: string | null
  ): any[] {
    if (!this.porbData?.aows) return [];

    const rows: any[] = [];

    for (const aow of this.porbData.aows as any[]) {
      const raw: BudgetOverviewRow = {
        aowCode: aow.aow_acrnum || "",
        aowName: aow.aow_name || "",
        innovationTarget: 0, innovationBudget: 0,
        knowledgeTarget: 0, knowledgeBudget: 0,
        capacityTarget: 0, capacityBudget: 0,
        othersTarget: 0, othersBudget: 0,
        totalPooledFunding: 0,
        anaplanBudget: 0,
        partnerBudget: 0,
        meliaBudget: 0,
      };

      const centersToProcess = centerCode
        ? (aow.centers || []).filter((c: any) => String(c.center_code) === centerCode)
        : (aow.centers || []);

      for (const center of centersToProcess) {
        // HLOs — classify into indicator buckets
        for (const hlo of center.hlos || []) {
          const bucket = this.classifyHloType(hlo.hlo_type);
          const target = this.n(hlo.hlo_target);
          const budget = this.n(hlo.hlo_budget);
          if (bucket === "innovation") {
            raw.innovationTarget += target;
            raw.innovationBudget += budget;
          } else if (bucket === "knowledge") {
            raw.knowledgeTarget += target;
            raw.knowledgeBudget += budget;
          } else if (bucket === "capacity") {
            raw.capacityTarget += target;
            raw.capacityBudget += budget;
          } else {
            raw.othersTarget += target;
            raw.othersBudget += budget;
          }
        }

        // Cross-cutting contributes to pooled total
        const crossTotal = (center.cross_cutting || []).reduce(
          (sum: number, c: any) => sum + this.n(c.budget),
          0
        );

        // HLO subtotal for this center (sum of all indicator budgets for this center)
        const centerHloTotal = (center.hlos || []).reduce(
          (sum: number, h: any) => sum + this.n(h.hlo_budget),
          0
        );

        // Total pooled = HLOs + cross-cutting
        raw.totalPooledFunding += centerHloTotal + crossTotal;

        // Partners
        raw.partnerBudget += (center.partners || []).reduce(
          (sum: number, p: any) => sum + this.n(p.partner_budget),
          0
        );

        // MELIA
        raw.meliaBudget += (center.melias || []).reduce(
          (sum: number, m: any) => sum + this.n(m.melia_budget),
          0
        );

        // Anaplan
        raw.anaplanBudget += (center.anaplan || []).reduce(
          (sum: number, a: any) => sum + this.n(a.porb_budget),
          0
        );
      }

      // Skip rows with zero budget
      const grandTotal =
        raw.totalPooledFunding +
        raw.anaplanBudget +
        raw.partnerBudget +
        raw.meliaBudget;
      if (grandTotal === 0) continue;

      rows.push({
        ...raw,
        innovationTargetFmt: this.fmtCurrency(raw.innovationTarget),
        innovationBudgetFmt: this.fmtCurrency(raw.innovationBudget),
        knowledgeTargetFmt: this.fmtCurrency(raw.knowledgeTarget),
        knowledgeBudgetFmt: this.fmtCurrency(raw.knowledgeBudget),
        capacityTargetFmt: this.fmtCurrency(raw.capacityTarget),
        capacityBudgetFmt: this.fmtCurrency(raw.capacityBudget),
        othersTargetFmt: this.fmtCurrency(raw.othersTarget),
        othersBudgetFmt: this.fmtCurrency(raw.othersBudget),
        totalPooledFundingFmt: this.fmtCurrency(raw.totalPooledFunding),
        anaplanBudgetFmt: this.fmtCurrency(raw.anaplanBudget),
        partnerBudgetFmt: this.fmtCurrency(raw.partnerBudget),
        meliaBudgetFmt: this.fmtCurrency(raw.meliaBudget),
      });
    }

    return rows;
  }

  private _buildBudgetOverviewTotals(rows: any[]): BudgetOverviewTotals {
    const t = rows.reduce(
      (acc, row) => ({
        innovationBudget: acc.innovationBudget + row.innovationBudget,
        knowledgeBudget: acc.knowledgeBudget + row.knowledgeBudget,
        capacityBudget: acc.capacityBudget + row.capacityBudget,
        othersBudget: acc.othersBudget + row.othersBudget,
        totalPooledFunding: acc.totalPooledFunding + row.totalPooledFunding,
        anaplanBudget: acc.anaplanBudget + row.anaplanBudget,
        partnerBudget: acc.partnerBudget + row.partnerBudget,
        meliaBudget: acc.meliaBudget + row.meliaBudget,
      }),
      {
        innovationBudget: 0, knowledgeBudget: 0,
        capacityBudget: 0, othersBudget: 0,
        totalPooledFunding: 0, anaplanBudget: 0,
        partnerBudget: 0, meliaBudget: 0,
      }
    );
    return {
      innovationBudgetFmt: this.fmtCurrency(t.innovationBudget),
      knowledgeBudgetFmt: this.fmtCurrency(t.knowledgeBudget),
      capacityBudgetFmt: this.fmtCurrency(t.capacityBudget),
      othersBudgetFmt: this.fmtCurrency(t.othersBudget),
      totalPooledFundingFmt: this.fmtCurrency(t.totalPooledFunding),
      anaplanBudgetFmt: this.fmtCurrency(t.anaplanBudget),
      partnerBudgetFmt: this.fmtCurrency(t.partnerBudget),
      meliaBudgetFmt: this.fmtCurrency(t.meliaBudget),
    };
  }

  /**
   * Build Anaplan (Budget for Financial Reporting) consolidated data.
   * Groups anaplan rows by account label, columns are AOW acronyms.
   * If centerCode is provided, only data for that center is included.
   */
  private _buildAnaplanConsolidated(centerCode: string | null): AnaplanConsolidated | null {
    if (!this.porbData?.aows) return null;

    // Determine column headers (AOW acronyms in snapshot order)
    const aowCodes: string[] = (this.porbData.aows as any[]).map(
      (a) => a.aow_acrnum || a.aow_name
    );

    // account label → { budgetByAow, total }
    const accountMap = new Map<string, { budgetByAow: Record<string, number>; total: number }>();
    const grandTotalByAow: Record<string, number> = {};
    let grandTotal = 0;

    for (const aow of this.porbData.aows as any[]) {
      const aowKey = aow.aow_acrnum || aow.aow_name;
      grandTotalByAow[aowKey] = grandTotalByAow[aowKey] || 0;

      const centersToProcess = centerCode
        ? (aow.centers || []).filter((c: any) => String(c.center_code) === centerCode)
        : (aow.centers || []);

      for (const center of centersToProcess) {
        for (const row of (center.anaplan || []) as any[]) {
          const budget = this.n(row.porb_budget);
          if (!budget) continue;
          const label = row.account || `Account ${row.anaplan_id}`;

          if (!accountMap.has(label)) {
            const budgetByAow: Record<string, number> = {};
            aowCodes.forEach((k) => (budgetByAow[k] = 0));
            accountMap.set(label, { budgetByAow, total: 0 });
          }
          const entry = accountMap.get(label)!;
          entry.budgetByAow[aowKey] = (entry.budgetByAow[aowKey] || 0) + budget;
          entry.total += budget;
          grandTotalByAow[aowKey] += budget;
          grandTotal += budget;
        }
      }
    }

    if (accountMap.size === 0) return null;

    const accounts = Array.from(accountMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, data]) => ({ label, ...data }));

    return { aows: aowCodes, accounts, grandTotal, grandTotalByAow };
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  async exportZip(): Promise<void> {
    if (this.exportingZip) return;
    this.exportingZip = true;
    try {
      const response: any = await this.porbService.exportVersionZip(
        this.submissionId
      );
      if (!response) return;
      const blob = response.body as Blob;
      const contentDisposition = response.headers?.get("Content-Disposition");
      let filename = `PORB_${this.submission?.initiative?.official_code || this.programId}_v${this.submissionId}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      this.exportingZip = false;
    }
  }
}
