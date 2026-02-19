import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { PhasesService } from "../services/phases.service";
import { SubmissionService } from "../services/submission.service";
import { AppSocket } from "../socket.service";
import { UserService } from "../services/user.service";
import { PorbService } from "../services/porb.service";
import { PorbTourStep } from "./components/porb-tour/porb-tour.component";

@Component({
  selector: "app-porb",
  templateUrl: "./porb.component.html",
  styleUrls: ["./porb.component.scss"],
})
export class PorbComponent implements OnInit, OnDestroy {
  loading = true;
  initiative: any = null;
  initiativeId: number | null = null;
  activePhaseId: number | null = null;

  centers: any[] = [];
  aows: any[] = [];
  baseExtraNavigationItems: string[] = [
    "Pool funding HLO",
    "Partners",
    "W3/Bilatral",
    "MELIA Study",
    "Anaplan",
  ];

  selectedCenter: any = null;
  selectedAow: any = null;
  selectedExtraNavigation: string | null = null;

  centersCollapsed = false;
  aowsCollapsed = false;

  poolFundingRows: any[] = [];
  partnersRows: any[] = [];
  w3Rows: any[] = [];
  meliaRows: any[] = [];
  anaplanRows: any[] = [];
  crossRows: any[] = [];
  sectionValidation: Record<string, { hasError: boolean; message: string }> = {};
  centerErrorCodes: string[] = [];
  aowErrorIds: number[] = [];
  consolidationIndicatorsData: Array<{ title: string; target: number; budget: number }> = [];
  consolidationBudgetSummaryData: any = null;

  onlineProgramUsers: Array<{
    userId: number;
    name: string;
    email: string;
    initials: string;
    connectedAt?: string;
  }> = [];

  currentUserId: number | null = null;
  currentUserName = "";
  currentUserEmail = "";
  centerStatusUpdating = false;
  showTour = false;
  private readonly porbTourStorageKey = "porb_tour_seen_v1";
  tourSteps: PorbTourStep[] = [
    {
      anchorId: "porb-overview",
      title: "PORB Overview",
      description:
        "This area shows the selected program context and quick summary information for PORB.",
    },
    {
      anchorId: "porb-online-users",
      title: "Online Collaborators",
      description:
        "These user initials show who is currently online and working in this program.",
    },
    {
      anchorId: "porb-overview-actions",
      title: "Quick Actions",
      description:
        "Use these icon buttons to open summary, team versions, export, and submission pages quickly.",
    },
    {
      anchorId: "porb-centers-nav",
      title: "Center Navigation",
      description:
        "Select the center you are budgeting for. You can also mark center completion from this panel.",
    },
    {
      anchorId: "porb-aow-nav",
      title: "AOW Navigation",
      description:
        "Select an AOW. Errors on AOW rows indicate budget/assumption issues that need review.",
    },
    {
      anchorId: "porb-sections-nav",
      title: "Budget Sections",
      description:
        "Pick a section (HLO, Partners, W3, MELIA, Anaplan, Cross Cutting) to open the editable budget table.",
    },
    {
      anchorId: "porb-consolidation",
      title: "Consolidation",
      description:
        "This table summarizes totals and indicator-level budgets for the selected center and AOW.",
    },
    {
      anchorId: "porb-section-tools",
      title: "Table Tools",
      description:
        "Use search and filters to find rows, and Export Excel to download the currently visible table.",
    },
    {
      anchorId: "porb-budget-input",
      title: "Budget Input",
      description:
        "Enter budget directly in table cells. You can also paste values from spreadsheet for faster entry.",
    },
    {
      anchorId: "porb-assumption-icon",
      title: "Assumption Requirement",
      description:
        "Use the assumption icon beside budget to add assumptions. If budget exists, assumption is required and row error icons will appear when missing.",
    },
  ];

  private onlineUsersSub?: Subscription;
  private socketConnectSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private submissionService: SubmissionService,
    private phasesService: PhasesService,
    private socket: AppSocket,
    private userService: UserService,
    private porbService: PorbService
  ) {}

  async ngOnInit() {
    const params = this.route.snapshot.params;
    const initiativeId = Number(params["id"]);
    this.initiativeId = initiativeId;
    const codeFromUrl = params["code"];

    const currentUser = this.userService.getLogedInUser();
    this.currentUserId = currentUser?.id ?? null;
    this.currentUserName = currentUser?.full_name || "You";
    this.currentUserEmail = currentUser?.email || "";

    this.initiative = await this.submissionService.getInitiative(initiativeId);
    if (!this.initiative || this.initiative.official_code !== codeFromUrl) {
      this.router.navigateByUrl("/");
      return;
    }

    const activePhase = await this.phasesService.getActivePhase();
    this.activePhaseId = Number(activePhase?.id) || null;
    let centers = await this.phasesService.getAssignedOrgs(
      activePhase?.id,
      initiativeId
    );
    if (!centers?.length) {
      centers = await this.submissionService.getOrganizations();
    }
    this.centers = Array.isArray(centers) ? centers : [];

    await this.loadAowsFromDatabase(initiativeId);
    await this.applySelectionFromUrl();

    this.setupOnlineUsersStream();
    this.loading = false;
    this.openTourIfFirstVisit();
  }

  ngOnDestroy(): void {
    this.onlineUsersSub?.unsubscribe();
    this.socketConnectSub?.unsubscribe();
  }

  private async loadAowsFromDatabase(programId: number) {
    const dbAows = await this.porbService.getAows(programId);
    this.aows = Array.isArray(dbAows)
      ? dbAows.map((item: any) => ({
          id: item.id,
          code: item.aow_acrnum || "",
          title: item.aow_name || "AOW",
          toc_id: item.toc_id || "",
        }))
      : [];
  }

  private setupOnlineUsersStream() {
    this.onlineUsersSub = this.socket.fromEvent<any[]>("onlineUsers").subscribe((users) => {
      const list = Array.isArray(users) ? users : [];
      const filtered = list
        .filter(
          (user) =>
            user?.initiative_id === this.initiativeId || user?.userId === this.currentUserId
        )
        .map((user) => ({
          userId: user?.userId,
          name: user?.fullName || user?.email || "Unknown user",
          email: user?.email || "N/A",
          initials: this.getInitials(user?.fullName || user?.email || "U"),
          connectedAt: user?.connectedAt,
        }));

      const hasCurrentUser =
        this.currentUserId != null &&
        filtered.some((user) => user.userId === this.currentUserId);

      if (!hasCurrentUser && this.currentUserId != null) {
        filtered.unshift({
          userId: this.currentUserId,
          name: this.currentUserName,
          email: this.currentUserEmail || "N/A",
          initials: this.getInitials(this.currentUserName || this.currentUserEmail || "U"),
          connectedAt: undefined,
        });
      }

      this.onlineProgramUsers = filtered;
    });

    this.socketConnectSub = this.socket.fromEvent("connect").subscribe(() => {
      this.socket.emit("getOnlineUsers");
    });

    this.socket.connect();
    this.socket.emit("getOnlineUsers");
  }

  private toNumber(value: string | number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  private getSelectedCenterId(): number | undefined {
    const code = this.getCenterKey(this.selectedCenter);
    const parsed = Number(code);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getCenterKey(center: any): string | null {
    if (!center) {
      return null;
    }
    const raw = center?.code ?? center?.id ?? center?.organization_code;
    if (raw == null) {
      return null;
    }
    if (typeof raw === "object") {
      const nested = raw?.code ?? raw?.id ?? raw?.organization_code;
      return nested != null ? String(nested) : null;
    }
    return String(raw);
  }

  private getSelectedPorbAowId(): number | undefined {
    const parsed = Number(this.selectedAow?.id);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private clearBudgetRows() {
    this.poolFundingRows = [];
    this.partnersRows = [];
    this.w3Rows = [];
    this.meliaRows = [];
    this.anaplanRows = [];
    this.crossRows = [];
  }

  private resetSectionValidation() {
    this.sectionValidation = {};
    this.baseExtraNavigationItems.forEach((item) => {
      this.sectionValidation[item] = { hasError: false, message: "" };
    });
    this.sectionValidation["Cross Cutting"] = { hasError: false, message: "" };
  }

  private async refreshSectionValidation() {
    if (!this.initiativeId || !this.selectedCenter || !this.selectedAow) {
      this.resetSectionValidation();
      return;
    }
    const validation = await this.porbService.getValidation(
      this.initiativeId,
      this.getSelectedPorbAowId(),
      this.getSelectedCenterId()
    );
    if (!validation || typeof validation !== "object") {
      this.resetSectionValidation();
      return;
    }
    this.sectionValidation = {
      ...this.sectionValidation,
      ...validation,
    };
  }

  private async refreshValidationSummary() {
    if (!this.initiativeId) {
      this.centerErrorCodes = [];
      this.aowErrorIds = [];
      return;
    }
    const summary = await this.porbService.getValidationSummary(
      this.initiativeId,
      this.getSelectedCenterId()
    );
    this.centerErrorCodes = Array.isArray(summary?.center_error_codes)
      ? summary.center_error_codes.map((item: any) => String(item))
      : [];
    this.aowErrorIds = Array.isArray(summary?.aow_error_ids)
      ? summary.aow_error_ids
          .map((item: any) => Number(item))
          .filter((item: number) => Number.isFinite(item))
      : [];
  }

  private clearConsolidation() {
    this.consolidationIndicatorsData = [];
    this.consolidationBudgetSummaryData = null;
  }

  private getSectionSlug(value: string): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private getAowUrlValue(aow: any): string | null {
    if (aow?.id != null) {
      return String(aow.id);
    }
    if (aow?.code) {
      return String(aow.code);
    }
    return null;
  }

  private async applySelectionFromUrl() {
    const query = this.route.snapshot.queryParamMap;
    const centerParam = query.get("center");
    const aowParam = query.get("aow");
    const sectionParam = query.get("section");

    if (centerParam) {
      const center = this.centers.find(
        (item: any) =>
          String(item?.code) === centerParam ||
          String(item?.id) === centerParam ||
          String(item?.acronym) === centerParam
      );
      if (center) {
        this.selectedCenter = center;
        this.centersCollapsed = true;
      }
    }

    if (aowParam) {
      const aow = this.aows.find(
        (item: any) => String(item?.id) === aowParam || String(item?.code) === aowParam
      );
      if (aow) {
        this.selectedAow = aow;
        this.aowsCollapsed = true;
      }
    }

    if (sectionParam) {
      const selectedSection = this.extraNavigationItems.find(
        (item) => this.getSectionSlug(item) === sectionParam || item === sectionParam
      );
      if (selectedSection) {
        this.selectedExtraNavigation = selectedSection;
      }
    }

    if (!this.selectedCenter && this.centers.length) {
      this.selectedCenter = this.centers[0];
      this.centersCollapsed = true;
    }

    if (!this.selectedAow && this.aows.length) {
      this.selectedAow = this.aows[0];
      this.aowsCollapsed = true;
    }

    if (!this.selectedExtraNavigation && this.extraNavigationItems.length) {
      this.selectedExtraNavigation = this.extraNavigationItems[0];
    }

    if (
      this.selectedExtraNavigation &&
      !this.extraNavigationItems.includes(this.selectedExtraNavigation)
    ) {
      this.selectedExtraNavigation = this.extraNavigationItems[0] || null;
    }

    if (this.selectedCenter && this.selectedAow && this.selectedExtraNavigation) {
      this.resetSectionValidation();
      await this.loadBudgetRows();
    }

    this.syncSelectionToUrl();
  }

  private syncSelectionToUrl() {
    const centerValue = this.getCenterKey(this.selectedCenter);
    const aowValue = this.getAowUrlValue(this.selectedAow);
    const sectionValue = this.selectedExtraNavigation
      ? this.getSectionSlug(this.selectedExtraNavigation)
      : null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        center: centerValue,
        aow: aowValue,
        section: sectionValue,
      },
      replaceUrl: true,
    });
  }

  private async loadBudgetRows() {
    if (
      !this.selectedCenter ||
      !this.selectedAow ||
      !this.initiativeId ||
      !this.selectedExtraNavigation
    ) {
      this.clearBudgetRows();
      this.clearConsolidation();
      return;
    }

    const programId = this.initiativeId;
    const porbAowId = this.getSelectedPorbAowId();
    const centerId = this.getSelectedCenterId();
    this.clearBudgetRows();
    await this.refreshSectionValidation();
    await this.refreshValidationSummary();
    await this.loadConsolidation(programId, porbAowId, centerId);

    if (this.selectedExtraNavigation === "Pool funding HLO") {
      const hlos = await this.porbService.getHlos(programId, porbAowId, centerId);
      this.poolFundingRows = Array.isArray(hlos) ? hlos : [];
      return;
    }

    if (this.selectedExtraNavigation === "Partners") {
      const partners = await this.porbService.getPartners(programId, porbAowId, centerId);
      this.partnersRows = Array.isArray(partners) ? partners : [];
      return;
    }

    if (this.selectedExtraNavigation === "W3/Bilatral") {
      const bilaterals = await this.porbService.getBilaterals(programId, porbAowId, centerId);
      this.w3Rows = Array.isArray(bilaterals) ? bilaterals : [];
      return;
    }

    if (this.selectedExtraNavigation === "MELIA Study") {
      const melia = await this.porbService.getMelia(programId, porbAowId, centerId);
      this.meliaRows = Array.isArray(melia) ? melia : [];
      return;
    }

    if (this.selectedExtraNavigation === "Anaplan") {
      const anaplan = await this.porbService.getAnaplan(programId, porbAowId, centerId);
      this.anaplanRows = Array.isArray(anaplan) ? anaplan : [];
      return;
    }

    if (this.selectedExtraNavigation === "Cross Cutting") {
      const cross = await this.porbService.getCross(programId, porbAowId, centerId);
      this.crossRows = Array.isArray(cross) ? cross : [];
      return;
    }
  }

  private async loadConsolidation(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    const consolidated = await this.porbService.getConsolidation(
      programId,
      porbAowId,
      centerId
    );
    this.consolidationIndicatorsData = Array.isArray(consolidated?.indicators)
      ? consolidated.indicators
      : [];
    this.consolidationBudgetSummaryData = consolidated?.summary || null;
  }

  get consolidationIndicators() {
    return this.consolidationIndicatorsData.map((item) => ({
      title: item.title,
      target: this.toNumber(item.target),
      budget: this.formatCurrency(this.toNumber(item.budget)),
    }));
  }

  get consolidationBudgetSummary() {
    const raw = this.consolidationBudgetSummaryData || {};
    return {
      poolHlo: this.formatCurrency(this.toNumber(raw.poolHlo)),
      partners: this.formatCurrency(this.toNumber(raw.partners)),
      melia: this.formatCurrency(this.toNumber(raw.melia)),
      pooledTotal: this.formatCurrency(this.toNumber(raw.pooledTotal)),
      w3: this.formatCurrency(this.toNumber(raw.w3)),
      consolidatedTotal: this.formatCurrency(this.toNumber(raw.consolidatedTotal)),
      anaplan: this.formatCurrency(this.toNumber(raw.anaplan)),
    };
  }

  get isPorbSelectionComplete(): boolean {
    return !!(this.selectedCenter && this.selectedAow && this.selectedExtraNavigation);
  }

  get displayedCenters(): any[] {
    return this.centers;
  }

  get extraNavigationItems(): string[] {
    const selectedAowCode = String(
      this.selectedAow?.code || this.selectedAow?.aow_acrnum || ""
    ).toUpperCase();
    if (selectedAowCode === "AOW00") {
      return [...this.baseExtraNavigationItems, "Cross Cutting"];
    }
    return this.baseExtraNavigationItems;
  }

  get displayedAows(): any[] {
    return this.aows;
  }

  get selectedCenterIdForSections(): number | undefined {
    return this.getSelectedCenterId();
  }

  get selectedPorbAowIdForSections(): number | undefined {
    return this.getSelectedPorbAowId();
  }

  get selectedCenterKey(): string | null {
    return this.getCenterKey(this.selectedCenter);
  }

  get completedCenterCodes(): string[] {
    const statuses = Array.isArray(this.initiative?.center_status)
      ? this.initiative.center_status
      : [];
    if (!this.activePhaseId) {
      return [];
    }
    return statuses
      .filter(
        (row: any) =>
          Number(row?.phase_id) === Number(this.activePhaseId) &&
          (row?.status === false || row?.status === 0 || row?.status === "0")
      )
      .map((row: any) => this.getCenterKey({ code: row?.organization_code }))
      .filter(Boolean);
  }

  get isSelectedCenterCompleted(): boolean {
    const centerCode = this.getCenterKey(this.selectedCenter);
    if (centerCode == null) {
      return false;
    }
    return this.completedCenterCodes.includes(centerCode);
  }

  get hasSelectedCenterErrors(): boolean {
    const centerCode = this.getCenterKey(this.selectedCenter);
    if (centerCode == null) {
      return false;
    }
    return this.centerErrorCodes.includes(centerCode);
  }

  getInitials(fullName: string): string {
    const parts = (fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return "U";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  async onSelectCenter(center: any) {
    this.selectedCenter = center;
    this.centersCollapsed = true;
    this.resetSectionValidation();
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async onSelectAow(aow: any) {
    this.selectedAow = aow;
    this.aowsCollapsed = true;
    if (!this.extraNavigationItems.includes(this.selectedExtraNavigation || "")) {
      this.selectedExtraNavigation = this.extraNavigationItems[0] || null;
    }
    this.resetSectionValidation();
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async onSelectExtraNavigation(item: string) {
    this.selectedExtraNavigation = item;
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async onBudgetUpdated() {
    if (!this.initiativeId || !this.selectedCenter || !this.selectedAow) {
      return;
    }
    await this.loadConsolidation(
      this.initiativeId,
      this.getSelectedPorbAowId(),
      this.getSelectedCenterId()
    );
    await this.refreshSectionValidation();
    await this.refreshValidationSummary();
  }

  async onToggleSelectedCenterCompletion() {
    if (!this.selectedCenter || !this.initiativeId || !this.activePhaseId) {
      return;
    }
    const centerCode = this.getCenterKey(this.selectedCenter);
    if (centerCode == null) {
      return;
    }

    this.centerStatusUpdating = true;
    try {
      const nextStatus = this.isSelectedCenterCompleted ? true : false;
      if (!this.isSelectedCenterCompleted && this.hasSelectedCenterErrors) {
        return;
      }
      const result = await this.submissionService.markStatus(
        centerCode,
        this.initiativeId,
        this.activePhaseId,
        nextStatus,
        this.selectedCenter
      );
      if (result) {
        if (!Array.isArray(this.initiative.center_status)) {
          this.initiative.center_status = [];
        }
        const index = this.initiative.center_status.findIndex(
          (row: any) =>
            String(row?.organization_code) === String(centerCode) &&
            Number(row?.phase_id) === Number(this.activePhaseId)
        );
        if (index >= 0) {
          this.initiative.center_status[index] = {
            ...this.initiative.center_status[index],
            status: nextStatus,
          };
        } else {
          this.initiative.center_status.push({
            organization_code: String(centerCode),
            phase_id: this.activePhaseId,
            status: nextStatus,
          });
        }
      }
    } finally {
      this.centerStatusUpdating = false;
    }
  }

  toggleCentersCollapsed() {
    if (!this.selectedCenter) {
      return;
    }
    this.centersCollapsed = !this.centersCollapsed;
  }

  toggleAowsCollapsed() {
    if (!this.selectedCenter || !this.selectedAow) {
      return;
    }
    this.aowsCollapsed = !this.aowsCollapsed;
  }

  async exportOverviewExcel() {
    if (!this.initiative?.id) {
      return;
    }
    await this.submissionService.excelCurrent(this.initiative.id);
  }

  private openTourIfFirstVisit() {
    try {
      const seen = localStorage.getItem(this.porbTourStorageKey);
      if (seen === "1") {
        return;
      }
      setTimeout(() => {
        this.showTour = true;
      }, 250);
    } catch {
      // ignore localStorage access issues
    }
  }

  onTourClosed() {
    this.showTour = false;
    try {
      localStorage.setItem(this.porbTourStorageKey, "1");
    } catch {
      // ignore localStorage access issues
    }
  }
}
