import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { PhasesService } from "../services/phases.service";
import { SubmissionService } from "../services/submission.service";
import { AppSocket } from "../socket.service";
import { UserService } from "../services/user.service";
import { PorbService } from "../services/porb.service";
import { PorbTourStep } from "./components/porb-tour/porb-tour.component";
import { PermissionService } from "../shared/permission.service";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmComponent, ConfirmDialogModel } from "../confirm/confirm.component";
import { HistoryOfChangeComponent } from "../submission/history-of-change/history-of-change.component";
import { ToastrService } from "ngx-toastr";

@Component({
    selector: "app-porb",
    templateUrl: "./porb.component.html",
    styleUrls: ["./porb.component.scss"],
    standalone: false
})
export class PorbComponent implements OnInit, OnDestroy {
  private readonly UNKNOWN_CENTER_CODE = "999999";
  loading = true;
  initiative: any = null;
  initiativeId: number | null = null;
  activePhaseId: number | null = null;

  centers: any[] = [];
  aows: any[] = [];
  baseExtraNavigationItems: string[] = [
    "Pool funding HLO",
    "Partners",
    "MELIA Study",
    "Anaplan",
  ];

  selectedCenter: any = null;
  selectedAow: any = null;
  selectedExtraNavigation: string | null = null;
  isW3View = false;
  w3CenterRows: any[] = [];

  // "summary" when Summary view is active, otherwise the selected center
  activeView: "summary" | "center" = "center";

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

  summaryConsolidationRows: any[] = [];
  summaryConsolidationTotals: any = {};
  summaryLoading = false;
  summaryViewMode: 'consolidated' | 'detailed' = 'consolidated';

  anaplanConsolidatedData: any = null;
  w3ConsolidatedData: any = null;

  summarySelectedAow: any = null;
  summaryAowDetail: any = null;
  summaryAowDetailLoading = false;
  summarySelectedSection: string | null = null;
  summaryW3View = false;
  summaryW3Rows: any[] = [];
  summaryW3Loading = false;

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
  // canEditMap: keyed by center code string, value = true if user can edit that center
  canEditMap: Record<string, boolean> = {};

  submissionStatus: string = "Draft";
  submissionId: number | null = null;
  submitting = false;
  cancellingSubmission = false;
  sectionLoading = false;

  showTour = false;
  private readonly porbTourStorageKey = "porb_tour_seen_v2";
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
      anchorId: "porb-action-team",
      title: "Team Members",
      description:
        "Opens the Team Members page where you can view and manage who has access to this program.",
    },
    {
      anchorId: "porb-action-history",
      title: "History of Change",
      description:
        "View the full change log of edits made to this PORB, including who changed what and when.",
    },
    {
      anchorId: "porb-action-versions",
      title: "Submitted Versions",
      description:
        "Browse previously submitted versions of this PORB to compare or review past submissions.",
    },
    {
      anchorId: "porb-action-export",
      title: "Export All (ZIP)",
      description:
        "Download a ZIP file containing the Summary spreadsheet and individual Excel files for each center.",
    },
    {
      anchorId: "porb-action-submit",
      title: "Submit PORB",
      description:
        "When all sections are complete, click Submit to send this PORB for review. This button only appears when the status is Draft.",
    },
    {
      anchorId: "porb-center-tabs",
      title: "Center Navigation",
      description:
        "Select the center you are budgeting for. The Summary tab shows overall consolidation.",
    },
    {
      anchorId: "porb-aow-tabs",
      title: "AOW Navigation",
      description:
        "Select an AOW. Errors on AOW items indicate budget/assumption issues that need review.",
    },
    {
      anchorId: "porb-section-tabs",
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
    private porbService: PorbService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private permissionService: PermissionService
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
    this.centers = Array.isArray(centers)
      ? centers.sort((a, b) => (a.acronym || a.name || '').localeCompare(b.acronym || b.name || ''))
      : [];

    await this.loadSubmissionStatus(initiativeId);
    this.buildCanEditMap();

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

  private async loadSubmissionStatus(programId: number) {
    const submission = await this.porbService.getSubmissionStatus(programId);
    if (submission && typeof submission === "object") {
      this.submissionStatus = submission.status || "Draft";
      this.submissionId = submission.id ?? null;
    } else {
      this.submissionStatus = "Draft";
      this.submissionId = null;
    }
  }

  /** Whether submission is locked (Pending or Approved → no editing) */
  get isSubmissionLocked(): boolean {
    return this.submissionStatus === "Pending" || this.submissionStatus === "Approved";
  }

  /** Whether the current user has a lead-level role to submit */
  get canSubmit(): boolean {
    return this.permissionService.canSubmit(this.initiative, this.submissionStatus);
  }

  async onSubmitClicked() {
    const incompleteCenters = this.centers
      .filter((c: any) => !this.isCenterCompleted(c))
      .map((c: any) => c?.acronym || c?.name || "Unknown");

    const message =
      incompleteCenters.length > 0
        ? `The following centers are not yet marked complete: ${incompleteCenters.join(", ")}. Are you sure you want to submit?`
        : "Are you sure you want to submit the PORB data?";

    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: new ConfirmDialogModel("Submit PORB", message),
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed || !this.initiativeId) {
        return;
      }
      this.submitting = true;
      try {
        const result = await this.porbService.submitPorb(this.initiativeId);
        if (result && typeof result === "object") {
          this.submissionStatus = result.status || "Pending";
          this.submissionId = result.id ?? null;
          this.buildCanEditMap();
          this.toastr.success("PORB submitted successfully");
        } else {
          this.toastr.error("Failed to submit PORB. Please try again.");
        }
      } finally {
        this.submitting = false;
      }
    });
  }

  async onCancelSubmissionClicked() {
    if (!this.submissionId) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: new ConfirmDialogModel(
        "Cancel PORB",
        "Are you sure you want to cancel this PORB submission? It will revert to Draft status."
      ),
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed || !this.submissionId) {
        return;
      }
      this.cancellingSubmission = true;
      try {
        const result = await this.porbService.cancelSubmission(this.submissionId);
        if (result != null) {
          this.submissionStatus = "Draft";
          this.submissionId = null;
          this.buildCanEditMap();
          this.toastr.success("Submission cancelled");
        } else {
          this.toastr.error("Failed to cancel submission. Please try again.");
        }
      } finally {
        this.cancellingSubmission = false;
      }
    });
  }

  openHistoryDialog() {
    if (!this.initiativeId) {
      return;
    }
    this.dialog.open(HistoryOfChangeComponent, {
      width: "750px",
      maxWidth: "90vw",
      height: "80vh",
      maxHeight: "85vh",
      data: {
        initiative_id: this.initiativeId,
      },
    });
  }

  private buildCanEditMap() {
    this.canEditMap = this.permissionService.buildCanEditMap(
      this.initiative,
      this.centers,
      this.submissionStatus
    );
  }

  get canEditForSelectedCenter(): boolean {
    const key = this.getCenterKey(this.selectedCenter);
    if (key == null) {
      return false;
    }
    // Default to true if map has no entry (e.g. admin case where map wasn't built yet)
    return this.canEditMap[key] !== false;
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
        this.activeView = "center";
      }
    }

    if (aowParam === 'w3') {
      this.isW3View = true;
    } else if (aowParam) {
      const aow = this.aows.find(
        (item: any) => String(item?.id) === aowParam || String(item?.code) === aowParam
      );
      if (aow) {
        this.selectedAow = aow;
      }
    }

    if (sectionParam) {
      const section = this.extraNavigationItems.find(
        (item) => this.getSectionSlug(item) === sectionParam || item === sectionParam
      );
      if (section) {
        this.selectedExtraNavigation = section;
      }
    }

    if (!this.selectedCenter && this.centers.length) {
      // For contributors: default to their first accessible center
      const accessibleCenter = this.centers.find((c: any) => {
        const key = this.getCenterKey(c);
        return key != null && this.canEditMap[key] === true;
      });
      this.selectedCenter = accessibleCenter || this.centers[0];
      this.activeView = "center";
    }

    const visible = this.visibleAows;
    if (
      this.selectedAow &&
      !visible.some((a: any) => a.id === this.selectedAow?.id)
    ) {
      this.selectedAow = visible[0] || null;
    }
    if (!this.selectedAow && visible.length) {
      this.selectedAow = visible[0];
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

    if (this.isW3View && this.selectedCenter) {
      await this.loadW3CenterRows();
    } else if (this.selectedCenter && this.selectedAow && this.selectedExtraNavigation) {
      this.resetSectionValidation();
      await this.loadBudgetRows();
    }

    this.syncSelectionToUrl();
  }

  private syncSelectionToUrl() {
    const centerValue = this.getCenterKey(this.selectedCenter);
    const aowValue = this.isW3View ? 'w3' : this.getAowUrlValue(this.selectedAow);
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
    this.sectionLoading = true;
    try {
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
    } finally {
      this.sectionLoading = false;
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
      target: this.formatCurrency(this.toNumber(item.target)),
      budget: this.formatCurrency(this.toNumber(item.budget)),
    }));
  }

  private static readonly INDICATOR_ORDER = [
    'Innovation Development',
    'Knowledge Product',
    'Capacity Sharing',
    'Others Outputs',
  ];

  get orderedConsolidationIndicators() {
    const zero = { target: '$0', budget: '$0' };
    const map = new Map(
      this.consolidationIndicators.map((i) => [i.title, i])
    );
    return PorbComponent.INDICATOR_ORDER.map(
      (title) => map.get(title) || { ...zero, title }
    );
  }

  get consolidationBudgetSummary() {
    const raw = this.consolidationBudgetSummaryData || {};
    return {
      poolHlo: this.formatCurrency(this.toNumber(raw.poolHlo)),
      crossCutting: this.formatCurrency(this.toNumber(raw.crossCutting)),
      partners: this.formatCurrency(this.toNumber(raw.partners)),
      melia: this.formatCurrency(this.toNumber(raw.melia)),
      pooledTotal: this.formatCurrency(this.toNumber(raw.pooledTotal)),
      consolidatedTotal: this.formatCurrency(this.toNumber(raw.consolidatedTotal)),
      anaplan: this.formatCurrency(this.toNumber(raw.anaplan)),
    };
  }

  get formattedSummaryRows() {
    return this.summaryConsolidationRows.map((row) => ({
      ...row,
      innovationTargetFmt: this.formatCurrency(this.toNumber(row.innovationTarget)),
      innovationBudgetFmt: this.formatCurrency(this.toNumber(row.innovationBudget)),
      knowledgeTargetFmt: this.formatCurrency(this.toNumber(row.knowledgeTarget)),
      knowledgeBudgetFmt: this.formatCurrency(this.toNumber(row.knowledgeBudget)),
      capacityTargetFmt: this.formatCurrency(this.toNumber(row.capacityTarget)),
      capacityBudgetFmt: this.formatCurrency(this.toNumber(row.capacityBudget)),
      othersTargetFmt: this.formatCurrency(this.toNumber(row.othersTarget)),
      othersBudgetFmt: this.formatCurrency(this.toNumber(row.othersBudget)),
      partnerBudgetFmt: this.formatCurrency(this.toNumber(row.partnerBudget)),
      meliaBudgetFmt: this.formatCurrency(this.toNumber(row.meliaBudget)),
      crossBudgetFmt: this.formatCurrency(this.toNumber(row.crossBudget)),
      totalPooledFundingFmt: this.formatCurrency(this.toNumber(row.totalPooledFunding)),
      anaplanBudgetFmt: this.formatCurrency(this.toNumber(row.anaplanBudget)),
      poolHloFmt: this.formatCurrency(
        this.toNumber(row.innovationBudget) +
        this.toNumber(row.knowledgeBudget) +
        this.toNumber(row.capacityBudget) +
        this.toNumber(row.othersBudget)
      ),
    }));
  }

  get formattedSummaryTotals() {
    const t = this.summaryConsolidationTotals || {};
    return {
      innovationTarget: this.formatCurrency(this.toNumber(t.innovationTarget)),
      innovationBudgetFmt: this.formatCurrency(this.toNumber(t.innovationBudget)),
      knowledgeTarget: this.formatCurrency(this.toNumber(t.knowledgeTarget)),
      knowledgeBudgetFmt: this.formatCurrency(this.toNumber(t.knowledgeBudget)),
      capacityTarget: this.formatCurrency(this.toNumber(t.capacityTarget)),
      capacityBudgetFmt: this.formatCurrency(this.toNumber(t.capacityBudget)),
      othersTarget: this.formatCurrency(this.toNumber(t.othersTarget)),
      othersBudgetFmt: this.formatCurrency(this.toNumber(t.othersBudget)),
      partnerBudgetFmt: this.formatCurrency(this.toNumber(t.partnerBudget)),
      meliaBudgetFmt: this.formatCurrency(this.toNumber(t.meliaBudget)),
      crossBudgetFmt: this.formatCurrency(this.toNumber(t.crossBudget)),
      totalPooledFundingFmt: this.formatCurrency(this.toNumber(t.totalPooledFunding)),
      anaplanBudgetFmt: this.formatCurrency(this.toNumber(t.anaplanBudget)),
    };
  }

  formatAnaplanCurrency(value: any): string {
    return this.formatCurrency(this.toNumber(value));
  }

  get isUnknownCenter(): boolean {
    const key = this.getCenterKey(this.selectedCenter);
    return key === this.UNKNOWN_CENTER_CODE;
  }

  get visibleAows(): any[] {
    if (this.isUnknownCenter) {
      return this.aows.filter(
        (aow: any) => String(aow?.code || aow?.aow_acrnum || "").toUpperCase() === "AOW00"
      );
    }
    return this.aows;
  }

  get isPorbSelectionComplete(): boolean {
    return !!(this.selectedCenter && this.selectedAow && this.selectedExtraNavigation);
  }

  get extraNavigationItems(): string[] {
    const selectedAowCode = String(
      this.selectedAow?.code || this.selectedAow?.aow_acrnum || ""
    ).toUpperCase();
    if (selectedAowCode === "AOW00") {
      return ["Cross Cutting", ...this.baseExtraNavigationItems.filter(i => i !== "Pool funding HLO")];
    }
    return this.baseExtraNavigationItems;
  }

  /** Section list for the summary AOW detail nav — mirrors extraNavigationItems but based on the summary AOW. */
  get summarySectionItems(): string[] {
    const aowCode = String(
      this.summarySelectedAow?.code || this.summarySelectedAow?.aow_acrnum || ""
    ).toUpperCase();
    if (aowCode === "AOW00") {
      return ["Cross Cutting", ...this.baseExtraNavigationItems.filter(i => i !== "Pool funding HLO")];
    }
    return this.baseExtraNavigationItems;
  }

  selectSummarySection(section: string) {
    this.summarySelectedSection = section;
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

  canEditCenter(center: any): boolean {
    const key = this.getCenterKey(center);
    if (key == null) return false;
    return this.canEditMap[key] !== false;
  }

  isCenterCompleted(center: any): boolean {
    const key = this.getCenterKey(center);
    if (!key) {
      return false;
    }
    return this.completedCenterCodes.includes(key);
  }

  isCenterSelected(center: any): boolean {
    const key = this.getCenterKey(center);
    return !!key && key === this.selectedCenterKey;
  }

  hasCenterError(center: any): boolean {
    const key = this.getCenterKey(center);
    return !!key && this.centerErrorCodes.includes(key);
  }

  hasAowError(aow: any): boolean {
    const aowId = Number(aow?.id);
    return Number.isFinite(aowId) && this.aowErrorIds.includes(aowId);
  }

  isAowSelected(aow: any): boolean {
    return this.selectedAow?.id != null && this.selectedAow.id === aow?.id;
  }

  hasSectionError(section: string): boolean {
    return !!this.sectionValidation?.[section]?.hasError;
  }

  getSectionError(section: string): string {
    return this.sectionValidation?.[section]?.message || "";
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

  async selectSummary() {
    this.activeView = "summary";
    if (!this.initiativeId) return;
    this.summaryLoading = true;
    try {
      const [data] = await Promise.all([
        this.porbService.getSummaryConsolidation(this.initiativeId),
        this.loadAnaplanConsolidated(this.initiativeId),
        this.loadW3Consolidated(this.initiativeId),
      ]);
      this.summaryConsolidationRows = Array.isArray(data?.rows) ? data.rows : [];
      this.summaryConsolidationTotals = data?.totals || {};
      // Auto-select first AOW for detail view
      if (this.aows.length && !this.summarySelectedAow) {
        this.selectSummaryAow(this.aows[0]);
      }
    } finally {
      this.summaryLoading = false;
    }
  }

  private loadAnaplanConsolidated(programId: number): Promise<void> {
    return new Promise((resolve) => {
      this.porbService.getAnaplanConsolidated(programId).subscribe({
        next: (data) => {
          this.anaplanConsolidatedData = data;
          resolve();
        },
        error: () => {
          this.anaplanConsolidatedData = null;
          resolve();
        },
      });
    });
  }

  private loadW3Consolidated(programId: number): Promise<void> {
    return new Promise((resolve) => {
      this.porbService.getW3Consolidated(programId).subscribe({
        next: (data) => {
          this.w3ConsolidatedData = data;
          resolve();
        },
        error: () => {
          this.w3ConsolidatedData = null;
          resolve();
        },
      });
    });
  }

  async selectSummaryAow(aow: any) {
    if (this.summarySelectedAow?.id === aow?.id && !this.summaryW3View) return;
    this.summaryW3View = false;
    this.summarySelectedAow = aow;
    // Auto-select first section whenever the AOW changes
    this.summarySelectedSection = this.summarySectionItems[0] || null;
    if (!this.initiativeId || !aow?.id) return;
    this.summaryAowDetailLoading = true;
    try {
      this.summaryAowDetail = await this.porbService.getSummaryAowDetail(
        this.initiativeId,
        aow.id
      );
    } finally {
      this.summaryAowDetailLoading = false;
    }
  }

  async selectSummaryW3View() {
    if (this.summaryW3View) return;
    this.summaryW3View = true;
    this.summarySelectedAow = null;
    this.summarySelectedSection = null;
    if (!this.initiativeId) return;
    this.summaryW3Loading = true;
    try {
      this.summaryW3Rows = await this.porbService.getBilaterals(this.initiativeId);
    } catch {
      this.summaryW3Rows = [];
    } finally {
      this.summaryW3Loading = false;
    }
  }

  get groupedHlos(): Array<{ name: string; rows: any[]; totalBudget: number }> {
    const hlos: any[] = this.summaryAowDetail?.hlos || [];
    const withBudget = hlos.filter((h) => (Number(h?.hlo_budget) || 0) > 0);
    const map = new Map<string, any[]>();
    for (const hlo of withBudget) {
      const key = hlo.hlo_name || "";
      const list = map.get(key) || [];
      list.push(hlo);
      map.set(key, list);
    }
    const groups: Array<{ name: string; rows: any[]; totalBudget: number }> = [];
    for (const [name, rows] of map) {
      const totalBudget = rows.reduce(
        (sum, r) => sum + (Number(r?.hlo_budget) || 0),
        0
      );
      groups.push({ name, rows, totalBudget });
    }
    return groups;
  }

  get filteredMelia(): any[] {
    return (this.summaryAowDetail?.melia || []).filter(
      (m: any) => (Number(m?.melia_budget) || 0) > 0
    );
  }

  get filteredBilateral(): any[] {
    return (this.summaryAowDetail?.bilateral || []).filter(
      (b: any) => (Number(b?.bilateral_budget) || 0) > 0
    );
  }

  get filteredPartners(): any[] {
    return (this.summaryAowDetail?.contractedPartners || []).filter(
      (p: any) => (Number(p?.budget) || 0) > 0
    );
  }

  get filteredCross(): any[] {
    return (this.summaryAowDetail?.cross || []).filter(
      (c: any) => (Number(c?.budget) || 0) > 0
    );
  }

  get summaryAowSubtotals() {
    const s = this.summaryAowDetail?.subtotals || {};
    return {
      hlo: this.formatCurrency(this.toNumber(s.hlo)),
      partners: this.formatCurrency(this.toNumber(s.partners)),
      melia: this.formatCurrency(this.toNumber(s.melia)),
      bilateral: this.formatCurrency(this.toNumber(s.bilateral)),
      cross: this.formatCurrency(this.toNumber(s.cross)),
    };
  }

  /** Pre-formatted HLO rows for the AOW detail table (no decimals, comma-separated). */
  get formattedGroupedHlos(): Array<{ name: string; rows: any[]; totalBudgetFmt: string }> {
    return this.groupedHlos.map((group) => ({
      name: group.name,
      rows: group.rows.map((hlo) => ({
        ...hlo,
        hlo_target_fmt: this.formatCurrency(this.toNumber(hlo.hlo_target)),
        hlo_budget_fmt: this.formatCurrency(this.toNumber(hlo.hlo_budget)),
      })),
      totalBudgetFmt: this.formatCurrency(group.totalBudget),
    }));
  }

  /** Pre-formatted MELIA rows for the AOW detail table. */
  get formattedMelia(): any[] {
    return this.filteredMelia.map((m) => ({
      ...m,
      melia_budget_fmt: this.formatCurrency(this.toNumber(m.melia_budget)),
    }));
  }

  /** Pre-formatted bilateral rows for the AOW detail table. */
  get formattedBilateral(): any[] {
    return this.filteredBilateral.map((b) => ({
      ...b,
      bilateral_budget_fmt: this.formatCurrency(this.toNumber(b.bilateral_budget)),
    }));
  }

  /** Pre-formatted partners rows for the AOW detail table. */
  get formattedPartners(): any[] {
    return this.filteredPartners.map((p) => ({
      ...p,
      budget_fmt: this.formatCurrency(this.toNumber(p.budget)),
    }));
  }

  get filteredSummaryW3Rows(): any[] {
    return (this.summaryW3Rows || []).filter(
      (r: any) => (Number(r?.bilateral_budget) || 0) > 0
    );
  }

  /** Pre-formatted cross-cutting rows for the AOW detail table. */
  get formattedCross(): any[] {
    return this.filteredCross.map((c) => ({
      ...c,
      budget_fmt: this.formatCurrency(this.toNumber(c.budget)),
    }));
  }

  async selectCenter(center: any) {
    if (this.isCenterSelected(center) && this.activeView === "center") {
      return;
    }
    this.selectedCenter = center;
    this.activeView = "center";

    if (this.isW3View) {
      this.syncSelectionToUrl();
      await this.loadW3CenterRows();
      return;
    }

    const visible = this.visibleAows;
    if (
      this.selectedAow &&
      !visible.some((a: any) => a.id === this.selectedAow?.id)
    ) {
      this.selectedAow = visible[0] || null;
    }
    if (visible.length && !this.selectedAow) {
      this.selectedAow = visible[0];
    }
    if (this.extraNavigationItems.length && !this.selectedExtraNavigation) {
      this.selectedExtraNavigation = this.extraNavigationItems[0];
    }

    this.resetSectionValidation();
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async selectAow(aow: any) {
    if (this.isAowSelected(aow) && !this.isW3View) {
      return;
    }
    this.isW3View = false;
    this.selectedAow = aow;

    if (!this.extraNavigationItems.includes(this.selectedExtraNavigation || "")) {
      this.selectedExtraNavigation = this.extraNavigationItems[0] || null;
    }

    this.resetSectionValidation();
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async selectSection(section: string) {
    if (this.selectedExtraNavigation === section) {
      return;
    }
    this.selectedExtraNavigation = section;
    this.syncSelectionToUrl();
    await this.loadBudgetRows();
  }

  async selectW3View() {
    if (this.isW3View) return;
    this.isW3View = true;
    this.selectedAow = null;
    this.selectedExtraNavigation = null;
    this.syncSelectionToUrl();
    await this.loadW3CenterRows();
  }

  private async loadW3CenterRows() {
    if (!this.initiativeId || !this.selectedCenter) {
      this.w3CenterRows = [];
      return;
    }
    this.sectionLoading = true;
    try {
      const centerId = this.getSelectedCenterId();
      const bilaterals = await this.porbService.getBilaterals(this.initiativeId, centerId);
      this.w3CenterRows = Array.isArray(bilaterals) ? bilaterals : [];
    } finally {
      this.sectionLoading = false;
    }
  }

  async onBudgetUpdated() {
    if (!this.initiativeId || !this.selectedCenter) {
      return;
    }
    // In W3 view there is no consolidation sidebar — only refresh validation
    if (this.isW3View) {
      await this.refreshValidationSummary();
      return;
    }
    if (!this.selectedAow) {
      return;
    }
    // Refresh consolidation sidebar + validation silently — do NOT reload table rows
    await Promise.all([
      this.loadConsolidation(this.initiativeId, this.getSelectedPorbAowId(), this.getSelectedCenterId()),
      this.refreshSectionValidation(),
      this.refreshValidationSummary(),
    ]);
  }

  async onRowAdded() {
    await this.loadBudgetRows();
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
      const result = await this.porbService.markStatus(
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

  async exportOverviewExcel() {
    if (!this.initiativeId) {
      return;
    }
    await this.porbService.exportExcel(this.initiativeId);
  }

  async exportAllZip() {
    if (!this.initiativeId) {
      return;
    }
    await this.porbService.exportZip(this.initiativeId);
  }

  async exportCenterExcel() {
    if (!this.initiativeId || !this.selectedCenter) {
      return;
    }
    const centerId = this.getSelectedCenterId();
    if (centerId == null) {
      return;
    }
    await this.porbService.exportExcelForCenter(this.initiativeId, centerId);
  }

  async exportAnaplanConsolidatedExcel() {
    if (!this.initiativeId) {
      return;
    }
    await this.porbService.exportAnaplanExcel(this.initiativeId);
  }

  async exportCenterAnaplan() {
    if (!this.initiativeId || !this.selectedCenter) {
      return;
    }
    const centerKey = this.getCenterKey(this.selectedCenter);
    if (centerKey == null) {
      return;
    }
    await this.porbService.exportAnaplanExcelForCenter(this.initiativeId, centerKey);
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
