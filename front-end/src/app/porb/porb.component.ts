import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom, Subscription } from "rxjs";
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
import { ValidationErrorsDialogComponent } from "./components/validation-errors-dialog.component";

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
    "Countries of Implementation",
    "Location of Benefit",
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
  countryPercentageRows: any[] = [];
  locationBenefitRows: any[] = [];
  sectionValidation: Record<string, { hasError: boolean; message: string; partnerMismatch?: boolean; pooledMismatch?: boolean }> = {};
  centerErrorCodes: string[] = [];
  w3CenterErrorCodes: string[] = [];
  aowErrorIds: number[] = [];
  consolidationIndicatorsData: Array<{ title: string; target: number; budget: number }> = [];
  consolidationBudgetSummaryData: any = null;
  consolidationRowCounts: any = null;

  summaryConsolidationRows: any[] = [];
  summaryConsolidationTotals: any = {};
  summaryLoading = false;
  summaryViewMode: 'consolidated' | 'detailed' = 'consolidated';

  centerViewMode: 'consolidated' | 'budget-entry' = 'budget-entry';
  centerConsolidationData: any = null;
  centerAnaplanConsolidatedData: any = null;
  centerW3Data: any[] = [];
  centerConsolidationLoading = false;

  anaplanConsolidatedData: any = null;
  w3ConsolidatedData: any = null;
  countryConsolidatedData: any = null;
  centerCountryConsolidatedData: any = null;
  locationBenefitConsolidatedData: any = null;
  centerLocationBenefitConsolidatedData: any = null;

  summarySelectedAow: any = null;
  summaryAowDetail: any = null;
  summaryAowDetailLoading = false;
  summarySelectedSection: string | null = null;
  summaryW3View = false;
  summaryW3Rows: any[] = [];
  summaryW3Loading = false;

  // Cached computed summary detail data (avoids getter re-creation on every CD cycle)
  cachedGroupedHlos: any[] = [];
  cachedFormattedMelia: any[] = [];
  cachedFormattedPartners: any[] = [];
  cachedFormattedCross: any[] = [];
  cachedFormattedCountryPercentage: any[] = [];
  cachedFormattedLocationBenefit: any[] = [];
  cachedFormattedSynergies: any[] = [];
  cachedFormattedOutcomes: any[] = [];
  cachedSummarySubtotals: any = {};
  cachedSummarySectionEmpty: Record<string, boolean> = {};

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
  exportingZip = false;
  exportingSummary = false;
  exportingAnaplan = false;
  exportingCenter = false;
  exportingCenterAnaplan = false;

  showTour = false;
  private readonly porbTourStorageKey = "porb_tour_seen_v3";
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
        "Select the center you are contributing to. The Summary tab provides an overall consolidated view. Error and check icons indicate the status of entries.",
    },
    {
      anchorId: "porb-center-view-mode",
      title: "Center View Mode",
      description:
        "Toggle between Consolidated (read-only overview of all AOWs for this center) and Budget Entry (edit budgets per AOW and section).",
    },
    {
      anchorId: "porb-aow-tabs",
      title: "AOW Navigation",
      description:
        "Select an AOW to view its budget sections. W3/Bilateral is a separate center-level view. Error icons indicate budget/assumption issues.",
    },
    {
      anchorId: "porb-section-tabs",
      title: "Budget Sections",
      description:
        'Select a section (Pooled Funding HLO, Partners, MELIA Study, Anaplan, or Cross-Cutting) to open the editable budget table. For "Country of Implementation" and "Location of Benefit," only percentage inputs are required. Disabled sections indicate that no data is available.',
    },
    {
      anchorId: "porb-consolidation",
      title: "Consolidation",
      description:
        "This table summarizes all pooled funding totals for the selected center and AoW, including Anaplan, partner allocations, and MELIA data.",
    },
    {
      anchorId: "porb-section-btn-pool-funding-hlo",
      title: "Pool Funding HLO",
      description:
        "Budget table for Pool Funding HLOs. Each row is a high-level output from TOC. Enter budget per HLO and add assumptions where required.",
    },
    {
      anchorId: "porb-section-btn-partners",
      title: "Partners",
      description:
        "This is the budget table for Partners. It includes a list of all partners, from which users can select contracted partners for each center to input budget allocations. Unknown partners can be added manually and later resolved to CLARISA institutions.",
    },
    {
      anchorId: "porb-section-btn-melia-study",
      title: "MELIA Study",
      description:
        "Budget table for MELIA studies. Each row is a study linked to outcomes from TOC. Use the Outcomes filter to narrow down by outcome.",
    },
    {
      anchorId: "porb-section-btn-anaplan",
      title: "Anaplan",
      description:
        "This is the budget table for Anaplan main accounts. Entries in this table are validated against the totals from Pooled Funding HLO, Cross-Cutting allocations, and Partner allocations.",
    },
    {
      anchorId: "porb-section-btn-cross-cutting",
      title: "Cross Cutting",
      description:
        "The budget table includes seven standard cross-cutting items. These are fixed, and no additional items can be added.",
    },
    {
      anchorId: "porb-section-btn-countries-of-implementation",
      title: "Countries of Implementation",
      description:
        "Displays the countries extracted from the KPI geographic data as defined in the ToC. Contributors are required to enter the percentage allocation per country (with a total capped at 100%). The budget is then automatically calculated based on the total pooled funding.",
    },
    {
      anchorId: "porb-section-btn-location-of-benefit",
      title: "Location of Benefit",
      description:
        "Displays locations (countries, regions, or global) extracted from the outcome-level geographic data. Contributors are required to enter the percentage allocation per location (with a total capped at 100%).",
    },
    {
      anchorId: "porb-section-btn-w3",
      title: "W3/Bilateral",
      description:
        "Budget table for W3 and Bilateral projects. This is a center-level section (not per-AOW). Access it via the W3/Bilateral button in the AOW navigation.",
    },
    {
      anchorId: "porb-section-tools",
      title: "Search Filters",
      description:
        'Use the search and filter options to locate specific rows and select "Export Excel" to download the currently visible table.',
    },
    {
      anchorId: "porb-budget-input",
      title: "Budget Input",
      description:
        "Enter the budget directly into the table cells. Values will be automatically formatted with commas when not being edited. You can also paste values from a spreadsheet for faster data entry.",
    },
    {
      anchorId: "porb-assumption-icon",
      title: "Assumption Requirement",
      description:
        "Use the assumption icon next to each budget entry to add budget notes/assumptions. Where a budget is entered, an assumption is required. If missing, an error icon will appear at the row level.",
    },
  ];

  tocHarvesting = false;
  private onlineUsersSub?: Subscription;
  private socketConnectSub?: Subscription;
  private tocHarvestStartSub?: Subscription;
  private tocHarvestCompleteSub?: Subscription;
  private porbBudgetChangedSub?: Subscription;

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

    // Guest users (no role on this initiative and not admin) cannot access PORB
    if (!this.permissionService.isAdmin()) {
      const userRole = this.permissionService.getUserInitiativeRole(this.initiative);
      if (!userRole) {
        this.router.navigateByUrl("/");
        return;
      }
    }

    // Run independent calls in parallel
    const [activePhase] = await Promise.all([
      this.phasesService.getActivePhase(),
      this.loadSubmissionStatus(initiativeId),
      this.loadAowsFromDatabase(initiativeId),
    ]);
    this.activePhaseId = Number(activePhase?.id) || null;

    // getAssignedOrgs depends on activePhase
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

    this.buildCanEditMap();
    await this.applySelectionFromUrl();

    this.setupOnlineUsersStream();
    this.loading = false;
    this.openTourIfFirstVisit();
  }

  ngOnDestroy(): void {
    this.onlineUsersSub?.unsubscribe();
    this.socketConnectSub?.unsubscribe();
    this.tocHarvestStartSub?.unsubscribe();
    this.tocHarvestCompleteSub?.unsubscribe();
    this.porbBudgetChangedSub?.unsubscribe();
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
      this.socket.emit("userOnline", {
        initiative_id: this.initiativeId,
        sp: this.initiative?.official_code,
      });
      this.socket.emit("getOnlineUsers");
    });

    this.socket.connect();
    this.socket.emit("userOnline", {
      initiative_id: this.initiativeId,
      sp: this.initiative?.official_code,
    });
    this.socket.emit("getOnlineUsers");

    this.tocHarvestStartSub = this.socket.fromEvent<any>("tocHarvestStarted").subscribe((data) => {
      if (data?.program_id === this.initiativeId) {
        this.tocHarvesting = true;
      }
    });

    this.tocHarvestCompleteSub = this.socket.fromEvent<any>("tocHarvestCompleted").subscribe(async (data) => {
      if (data?.program_id === this.initiativeId) {
        this.tocHarvesting = false;
        await this.refreshCurrentView();
      }
    });

    this.porbBudgetChangedSub = this.socket.fromEvent<any>('porbBudgetChanged').subscribe(async (data) => {
      const mySocketId = (this.socket as any).ioSocket?.id;
      if (mySocketId && data?.emitter_socket_id === mySocketId) return;
      if (data?.program_id !== this.initiativeId) return;
      await this.handleRemoteBudgetChange(data);
    });
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

  /** Whether the current user is a non-lead (not admin, not lead role) */
  get isNonLeadUser(): boolean {
    if (this.permissionService.isAdmin()) return false;
    const userRole = this.permissionService.getUserInitiativeRole(this.initiative);
    if (!userRole) return true;
    return !this.permissionService.isLeadRole(userRole.role);
  }

  /** Whether the current user has a lead-level role to submit */
  get canSubmit(): boolean {
    return this.permissionService.canSubmit(this.initiative, this.submissionStatus);
  }

  async onSubmitClicked() {
    // Block submission if validation errors exist (Rules 12, 13)
    if (this.centerErrorCodes.length > 0 || this.aowErrorIds.length > 0) {
      this.dialog.open(ValidationErrorsDialogComponent, {
        data: {
          title: 'Cannot Submit',
          message: 'There are validation errors that must be resolved before submitting.',
          centerErrorCodes: this.centerErrorCodes,
          centers: this.centers,
          aowErrorIds: this.aowErrorIds,
          aows: this.aows,
        },
        width: '600px',
        autoFocus: false,
      });
      return;
    }

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
    // Completed centers are not editable — user must mark incomplete first
    for (const code of this.completedCenterCodes) {
      this.canEditMap[code] = false;
    }
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
    this.countryPercentageRows = [];
    this.locationBenefitRows = [];
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
      this.w3CenterErrorCodes = [];
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
    this.w3CenterErrorCodes = Array.isArray(summary?.w3_center_error_codes)
      ? summary.w3_center_error_codes.map((item: any) => String(item))
      : [];
  }

  private clearConsolidation() {
    this.consolidationIndicatorsData = [];
    this.consolidationBudgetSummaryData = null;
    this.consolidationRowCounts = null;
  }

  getSectionSlug(value: string): string {
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

    // Always preload W3 rows so we know if the W3/Bilateral button should be enabled
    this.preloadW3CenterCount();

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
      await Promise.all([
        this.refreshSectionValidation(),
        this.refreshValidationSummary(),
        this.loadConsolidation(programId, porbAowId, centerId),
        this.loadCurrentSectionData(programId, porbAowId, centerId),
      ]);
    } finally {
      this.sectionLoading = false;
    }
  }

  private async loadCurrentSectionData(programId: number, porbAowId: number | undefined, centerId: number | undefined) {
    if (this.selectedExtraNavigation === "Pool funding HLO") {
      const hlos = await this.porbService.getHlos(programId, porbAowId, centerId);
      this.poolFundingRows = Array.isArray(hlos) ? hlos : [];
    } else if (this.selectedExtraNavigation === "Partners") {
      const partners = await this.porbService.getPartners(programId, porbAowId, centerId);
      this.partnersRows = Array.isArray(partners) ? partners : [];
    } else if (this.selectedExtraNavigation === "MELIA Study") {
      const melia = await this.porbService.getMelia(programId, porbAowId, centerId);
      this.meliaRows = Array.isArray(melia) ? melia : [];
    } else if (this.selectedExtraNavigation === "Anaplan") {
      const anaplan = await this.porbService.getAnaplan(programId, porbAowId, centerId);
      this.anaplanRows = Array.isArray(anaplan) ? anaplan : [];
    } else if (this.selectedExtraNavigation === "Cross Cutting") {
      const cross = await this.porbService.getCross(programId, porbAowId, centerId);
      this.crossRows = Array.isArray(cross) ? cross : [];
    } else if (this.selectedExtraNavigation === "Countries of Implementation") {
      const data = await this.porbService.getCountryPercentage(programId, porbAowId, centerId);
      this.countryPercentageRows = Array.isArray(data) ? data : [];
    } else if (this.selectedExtraNavigation === "Location of Benefit") {
      const data = await this.porbService.getLocationBenefit(programId, porbAowId, centerId);
      this.locationBenefitRows = Array.isArray(data) ? data : [];
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
    this.consolidationRowCounts = consolidated?.rowCounts || null;
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
    return this.summaryConsolidationRows.filter((row) => {
      const total = this.toNumber(row.totalPooledFunding)
        + this.toNumber(row.anaplanBudget)
        + this.toNumber(row.partnerBudget)
        + this.toNumber(row.meliaBudget);
      return total > 0;
    }).map((row) => ({
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

  get formattedCenterConsolidationRows() {
    const rows: any[] = this.centerConsolidationData?.rows || [];
    return rows.filter((row) => {
      const total = this.toNumber(row.totalPooledFunding)
        + this.toNumber(row.anaplanBudget)
        + this.toNumber(row.partnerBudget)
        + this.toNumber(row.meliaBudget);
      return total > 0;
    }).map((row) => ({
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

  get formattedCenterConsolidationTotals() {
    const t = this.centerConsolidationData?.totals || {};
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

  get centerW3Subtotal(): string {
    const total = (this.centerW3Data || []).reduce(
      (sum, r) => sum + (Number(r.bilateral_budget) || 0),
      0
    );
    return this.formatCurrency(total);
  }

  onCenterViewModeChange(mode: 'consolidated' | 'budget-entry') {
    this.centerViewMode = mode;
    if (mode === 'consolidated') {
      this.loadCenterConsolidation();
    }
  }

  async loadCenterConsolidation() {
    if (!this.initiativeId || !this.selectedCenter) return;
    const centerId = Number(this.selectedCenter.code);
    this.centerConsolidationLoading = true;
    try {
      const [consolidation, anaplan, w3] = await Promise.all([
        this.porbService.getSummaryConsolidation(this.initiativeId, centerId),
        firstValueFrom(this.porbService.getAnaplanConsolidated(this.initiativeId, centerId)),
        this.porbService.getBilaterals(this.initiativeId, centerId, true),
        this.loadCountryConsolidated(this.initiativeId, centerId),
        this.loadLocationBenefitConsolidated(this.initiativeId, centerId),
      ]);
      this.centerConsolidationData = consolidation;
      this.centerAnaplanConsolidatedData = anaplan;
      this.centerW3Data = (w3 as any[]) || [];
    } catch (e) {
      console.error('Failed to load center consolidation', e);
    }
    this.centerConsolidationLoading = false;
  }

  get isUnknownCenter(): boolean {
    const key = this.getCenterKey(this.selectedCenter);
    return key === this.UNKNOWN_CENTER_CODE;
  }

  get visibleAows(): any[] {
    return this.aows;
  }

  get isPorbSelectionComplete(): boolean {
    return !!(this.selectedCenter && this.selectedAow && this.selectedExtraNavigation);
  }

  get isSelectedAowCrossCutting(): boolean {
    const code = String(this.selectedAow?.code || this.selectedAow?.aow_acrnum || '').toUpperCase();
    return code === 'AOW00';
  }

  get extraNavigationItems(): string[] {
    if (this.showTour) {
      // Show all section buttons during tour so every step has a visible anchor.
      const all = [...this.baseExtraNavigationItems];
      if (!all.includes("Cross Cutting")) {
        all.splice(4, 0, "Cross Cutting"); // After Anaplan, matching tour step order
      }
      return all;
    }
    const selectedAowCode = String(
      this.selectedAow?.code || this.selectedAow?.aow_acrnum || ""
    ).toUpperCase();
    if (selectedAowCode === "AOW00") {
      return ["Cross Cutting", ...this.baseExtraNavigationItems.filter(i => i !== "Pool funding HLO")];
    }
    return this.baseExtraNavigationItems;
  }

  /** Check if a center-level section has no items at all */
  isCenterSectionEmpty(section: string): boolean {
    if (this.showTour) return false;
    const counts = this.consolidationRowCounts;
    if (!counts) return false;
    switch (section) {
      case 'Pool funding HLO': return (counts.hlo || 0) === 0;
      case 'Partners': return (counts.partners || 0) === 0;
      case 'MELIA Study': return (counts.melia || 0) === 0;
      case 'Anaplan': return false;
      case 'Cross Cutting': return false;
      case 'Countries of Implementation': {
        const selectedAowCode = String(this.selectedAow?.code || this.selectedAow?.aow_acrnum || '').toUpperCase();
        if (selectedAowCode === 'AOW00') return false;
        return (counts.countryPercentage || 0) === 0;
      }
      case 'Location of Benefit': {
        const selectedAowCode = String(this.selectedAow?.code || this.selectedAow?.aow_acrnum || '').toUpperCase();
        if (selectedAowCode === 'AOW00') return false;
        return (counts.locationBenefit || 0) === 0;
      }
      default: return false;
    }
  }

  /** Check if a summary-level section has data based on cached computation */
  isSummarySectionEmpty(section: string): boolean {
    return this.cachedSummarySectionEmpty[section] ?? false;
  }

  /** Section list for the summary AOW detail nav — excludes Anaplan (has its own consolidated table). */
  get summarySectionItems(): string[] {
    const aowCode = String(
      this.summarySelectedAow?.code || this.summarySelectedAow?.aow_acrnum || ""
    ).toUpperCase();
    const filtered = this.baseExtraNavigationItems.filter(i => i !== "Anaplan");
    if (aowCode === "AOW00") {
      return ["Cross Cutting", ...filtered.filter(i => i !== "Pool funding HLO"), 'Synergy Programs', 'Outcomes'];
    }
    return [...filtered, 'Synergy Programs', 'Outcomes'];
  }
  // Note: "Location of Benefit" is included in baseExtraNavigationItems and thus in summarySectionItems via the filtered array above.

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

  /** Can the user toggle Mark Complete/Incomplete? Based on role permission, ignoring completion status. */
  get canToggleCenterCompletion(): boolean {
    if (this.isSubmissionLocked) return false;
    const key = this.getCenterKey(this.selectedCenter);
    if (key == null) return false;
    // Check base role permission (not gated by completion status)
    return this.permissionService.canEditCenter(
      this.initiative,
      key,
      this.submissionStatus
    );
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

  hasW3Error(): boolean {
    const key = this.getCenterKey(this.selectedCenter);
    return !!key && this.w3CenterErrorCodes.includes(key);
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
        this.loadCountryConsolidated(this.initiativeId),
        this.loadLocationBenefitConsolidated(this.initiativeId),
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

  private loadCountryConsolidated(programId: number, centerId?: number): Promise<void> {
    return new Promise((resolve) => {
      this.porbService.getCountryPercentageConsolidated(programId, centerId).subscribe({
        next: (data) => {
          if (centerId != null) {
            this.centerCountryConsolidatedData = data;
          } else {
            this.countryConsolidatedData = data;
          }
          resolve();
        },
        error: () => {
          if (centerId != null) {
            this.centerCountryConsolidatedData = null;
          } else {
            this.countryConsolidatedData = null;
          }
          resolve();
        },
      });
    });
  }

  private loadLocationBenefitConsolidated(programId: number, centerId?: number): Promise<void> {
    return new Promise((resolve) => {
      this.porbService.getLocationBenefitConsolidated(programId, centerId).subscribe({
        next: (data) => {
          if (centerId != null) {
            this.centerLocationBenefitConsolidatedData = data;
          } else {
            this.locationBenefitConsolidatedData = data;
          }
          resolve();
        },
        error: () => {
          if (centerId != null) {
            this.centerLocationBenefitConsolidatedData = null;
          } else {
            this.locationBenefitConsolidatedData = null;
          }
          resolve();
        },
      });
    });
  }

  async selectSummaryAow(aow: any) {
    if (this.summarySelectedAow?.id === aow?.id && !this.summaryW3View) return;
    this.summaryW3View = false;
    this.summarySelectedAow = aow;
    // Preserve current section if it exists in the new AOW's list, otherwise pick first
    const sections = this.summarySectionItems;
    if (!this.summarySelectedSection || !sections.includes(this.summarySelectedSection)) {
      this.summarySelectedSection = sections[0] || null;
    }
    if (!this.initiativeId || !aow?.id) return;
    this.summaryAowDetailLoading = true;
    try {
      this.summaryAowDetail = await this.porbService.getSummaryAowDetail(
        this.initiativeId,
        aow.id
      );
      this.computeSummaryDetailCache();
    } finally {
      this.summaryAowDetailLoading = false;
    }
  }

  private computeSummaryDetailCache() {
    const d = this.summaryAowDetail;
    if (!d) {
      this.cachedGroupedHlos = [];
      this.cachedFormattedMelia = [];
      this.cachedFormattedPartners = [];
      this.cachedFormattedCross = [];
      this.cachedFormattedCountryPercentage = [];
      this.cachedFormattedLocationBenefit = [];
      this.cachedFormattedSynergies = [];
      this.cachedFormattedOutcomes = [];
      this.cachedSummarySubtotals = {};
      this.cachedSummarySectionEmpty = {};
      return;
    }

    // Grouped HLOs
    const hlos: any[] = d.hlos || [];
    const withBudget = hlos.filter((h: any) => (Number(h?.hlo_budget) || 0) > 0);
    const hloMap = new Map<string, any[]>();
    for (const hlo of withBudget) {
      const key = hlo.hlo_name || '';
      const list = hloMap.get(key) || [];
      list.push(hlo);
      hloMap.set(key, list);
    }
    this.cachedGroupedHlos = [];
    for (const [name, rows] of hloMap) {
      const totalBudget = rows.reduce((sum: number, r: any) => sum + (Number(r?.hlo_budget) || 0), 0);
      this.cachedGroupedHlos.push({
        name,
        rows: rows.map((hlo: any) => ({
          ...hlo,
          hlo_target_fmt: this.formatCurrency(this.toNumber(hlo.hlo_target)),
          hlo_budget_fmt: this.formatCurrency(this.toNumber(hlo.hlo_budget)),
        })),
        totalBudgetFmt: this.formatCurrency(totalBudget),
        assumptionEntries: rows
          .filter((h: any) => h.hlo_assumption?.trim())
          .map((h: any) => ({ center: h.center_name || `Center ${h.center_id}`, assumption: h.hlo_assumption })),
      });
    }

    // Filtered + formatted MELIA
    this.cachedFormattedMelia = (d.melia || [])
      .filter((m: any) => (Number(m?.melia_budget) || 0) > 0)
      .map((m: any) => ({ ...m, melia_budget_fmt: this.formatCurrency(this.toNumber(m.melia_budget)) }));

    // Filtered + formatted Partners
    this.cachedFormattedPartners = (d.contractedPartners || [])
      .filter((p: any) => (Number(p?.budget) || 0) > 0)
      .map((p: any) => ({ ...p, budget_fmt: this.formatCurrency(this.toNumber(p.budget)) }));

    // Filtered + formatted Cross
    this.cachedFormattedCross = (d.cross || [])
      .filter((c: any) => (Number(c?.budget) || 0) > 0)
      .map((c: any) => ({ ...c, budget_fmt: this.formatCurrency(this.toNumber(c.budget)) }));

    // Filtered + formatted Country Percentage
    this.cachedFormattedCountryPercentage = (d.countryPercentage || [])
      .filter((c: any) => (Number(c?.percentage) || 0) > 0)
      .map((c: any) => ({ ...c, budget_fmt: this.formatCurrency(this.toNumber(c.budget)) }));

    // Filtered + formatted Location of Benefit
    this.cachedFormattedLocationBenefit = (d.locationBenefit || [])
      .filter((l: any) => (Number(l?.percentage) || 0) > 0)
      .map((l: any) => ({ ...l, budget_fmt: this.formatCurrency(this.toNumber(l.budget)) }));

    // Synergy programs (read-only, no budget filtering)
    this.cachedFormattedSynergies = d.synergies || [];

    // Outcomes with flattened indicators for display
    this.cachedFormattedOutcomes = (d.outcomes || []).map((o: any) => ({
      ...o,
      flatIndicators: Array.isArray(o.outcome_indicators) ? o.outcome_indicators : [],
    }));

    // Subtotals
    const s = d.subtotals || {};
    this.cachedSummarySubtotals = {
      hlo: this.formatCurrency(this.toNumber(s.hlo)),
      partners: this.formatCurrency(this.toNumber(s.partners)),
      melia: this.formatCurrency(this.toNumber(s.melia)),
      bilateral: this.formatCurrency(this.toNumber(s.bilateral)),
      cross: this.formatCurrency(this.toNumber(s.cross)),
    };

    // Section empty state
    this.cachedSummarySectionEmpty = {
      'Pool funding HLO': this.cachedGroupedHlos.length === 0,
      'Partners': this.cachedFormattedPartners.length === 0,
      'MELIA Study': this.cachedFormattedMelia.length === 0,
      'Anaplan': !(d.anaplan || []).some((a: any) => this.toNumber(a.anaplan_budget) > 0),
      'Cross Cutting': this.cachedFormattedCross.length === 0,
      'Countries of Implementation': (d.countryPercentageCount || 0) === 0,
      'Location of Benefit': (d.locationBenefitCount || 0) === 0,
      'Synergy Programs': this.cachedFormattedSynergies.length === 0,
      'Outcomes': this.cachedFormattedOutcomes.length === 0,
    };
  }

  async selectSummaryW3View() {
    if (this.summaryW3View) return;
    this.summaryW3View = true;
    this.summarySelectedAow = null;
    this.summarySelectedSection = null;
    if (!this.initiativeId) return;
    this.summaryW3Loading = true;
    try {
      const raw = await this.porbService.getBilaterals(this.initiativeId, undefined, true);
      // Consolidate duplicate projects by toc_id (or name fallback), summing budgets
      const map = new Map<string, any>();
      for (const row of (raw || [])) {
        const key = row.toc_id || row.bilateral_name || '';
        if (map.has(key)) {
          const existing = map.get(key);
          existing.bilateral_budget = (Number(existing.bilateral_budget) || 0) + (Number(row.bilateral_budget) || 0);
          if (row.bilateral_assumption) {
            const center = row.center_name || '';
            existing._assumptions.push({ center, assumption: row.bilateral_assumption });
          }
        } else {
          const assumptions: any[] = [];
          if (row.bilateral_assumption) {
            assumptions.push({ center: row.center_name || '', assumption: row.bilateral_assumption });
          }
          map.set(key, { ...row, _assumptions: assumptions });
        }
      }
      this.summaryW3Rows = [...map.values()];
    } catch {
      this.summaryW3Rows = [];
    } finally {
      this.summaryW3Loading = false;
    }
  }

  // All summary detail getters removed — use cached* properties instead (computed in computeSummaryDetailCache)

  async selectCenter(center: any) {
    if (this.isCenterSelected(center) && this.activeView === "center") {
      return;
    }
    this.centerConsolidationData = null;
    this.selectedCenter = center;
    this.activeView = "center";

    if (this.centerViewMode === 'consolidated') {
      this.loadCenterConsolidation();
      return;
    }

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

  get isW3Empty(): boolean {
    return this.w3CenterRows.length === 0;
  }

  private preloadW3CenterCount() {
    if (!this.initiativeId || !this.selectedCenter) {
      this.w3CenterRows = [];
      return;
    }
    const centerId = this.getSelectedCenterId();
    this.porbService.getBilaterals(this.initiativeId, centerId).then(
      (bilaterals) => { this.w3CenterRows = Array.isArray(bilaterals) ? bilaterals : []; },
      () => { this.w3CenterRows = []; }
    );
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

  private async refreshCurrentView() {
    if (!this.initiativeId) return;
    await this.loadAowsFromDatabase(this.initiativeId);
    await this.loadBudgetRows();
  }

  async onToggleSelectedCenterCompletion() {
    if (this.isSubmissionLocked) return;
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
        this.dialog.open(ValidationErrorsDialogComponent, {
          data: {
            title: 'Cannot Mark as Complete',
            message: `${this.selectedCenter?.acronym || this.selectedCenter?.name} has validation errors that must be resolved first.`,
            aowErrorIds: this.aowErrorIds,
            aows: this.aows,
          },
          width: '600px',
          autoFocus: false,
        });
        this.centerStatusUpdating = false;
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
        // Rebuild edit permissions so completed centers become read-only
        this.buildCanEditMap();
      }
    } finally {
      this.centerStatusUpdating = false;
    }
  }

  async exportOverviewExcel() {
    if (!this.initiativeId || this.exportingSummary) {
      return;
    }
    this.exportingSummary = true;
    try {
      await this.porbService.exportExcel(this.initiativeId);
    } finally {
      this.exportingSummary = false;
    }
  }

  async exportAllZip() {
    if (!this.initiativeId || this.exportingZip) {
      return;
    }
    this.exportingZip = true;
    try {
      await this.porbService.exportZip(this.initiativeId);
    } finally {
      this.exportingZip = false;
    }
  }

  async exportCenterExcel() {
    if (!this.initiativeId || !this.selectedCenter || this.exportingCenter) {
      return;
    }
    const centerId = this.getSelectedCenterId();
    if (centerId == null) {
      return;
    }
    this.exportingCenter = true;
    try {
      await this.porbService.exportExcelForCenter(this.initiativeId, centerId);
    } finally {
      this.exportingCenter = false;
    }
  }

  async exportAnaplanConsolidatedExcel() {
    if (!this.initiativeId || this.exportingAnaplan) {
      return;
    }
    this.exportingAnaplan = true;
    try {
      await this.porbService.exportAnaplanExcel(this.initiativeId);
    } finally {
      this.exportingAnaplan = false;
    }
  }

  async exportCenterAnaplan() {
    if (!this.initiativeId || !this.selectedCenter || this.exportingCenterAnaplan) {
      return;
    }
    const centerKey = this.getCenterKey(this.selectedCenter);
    if (centerKey == null) {
      return;
    }
    this.exportingCenterAnaplan = true;
    try {
      await this.porbService.exportAnaplanExcelForCenter(this.initiativeId, centerKey);
    } finally {
      this.exportingCenterAnaplan = false;
    }
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

  replayTour() {
    this.showTour = true;
  }

  onTourClosed() {
    this.showTour = false;
    try {
      localStorage.setItem(this.porbTourStorageKey, "1");
    } catch {
      // ignore localStorage access issues
    }
  }

  /** Maps backend section keys to the frontend navigation label strings. */
  private sectionKeyFor(backendSection: string): string | null {
    switch (backendSection) {
      case 'hlo': return 'Pool funding HLO';
      case 'partner': return 'Partners';
      case 'melia': return 'MELIA Study';
      case 'anaplan': return 'Anaplan';
      case 'cross': return 'Cross Cutting';
      case 'country-percentage': return 'Countries of Implementation';
      case 'location-benefit': return 'Location of Benefit';
      case 'bilateral': return null; // W3/Bilateral is handled separately via isW3View
      default: return null;
    }
  }

  /**
   * Re-fetch the currently visible section's rows without calling clearBudgetRows().
   * Used for 'update' events to avoid DOM destruction and preserve focus/scroll.
   */
  private async softReloadCurrentSection(): Promise<void> {
    if (!this.initiativeId || !this.selectedCenter || !this.selectedAow || !this.selectedExtraNavigation) {
      return;
    }
    const programId = this.initiativeId;
    const porbAowId = this.getSelectedPorbAowId();
    const centerId = this.getSelectedCenterId();

    if (this.selectedExtraNavigation === 'Pool funding HLO') {
      const hlos = await this.porbService.getHlos(programId, porbAowId, centerId);
      if (Array.isArray(hlos)) this.poolFundingRows = hlos;
      return;
    }
    if (this.selectedExtraNavigation === 'Partners') {
      const partners = await this.porbService.getPartners(programId, porbAowId, centerId);
      if (Array.isArray(partners)) this.partnersRows = partners;
      return;
    }
    if (this.selectedExtraNavigation === 'MELIA Study') {
      const melia = await this.porbService.getMelia(programId, porbAowId, centerId);
      if (Array.isArray(melia)) this.meliaRows = melia;
      return;
    }
    if (this.selectedExtraNavigation === 'Anaplan') {
      const anaplan = await this.porbService.getAnaplan(programId, porbAowId, centerId);
      if (Array.isArray(anaplan)) this.anaplanRows = anaplan;
      return;
    }
    if (this.selectedExtraNavigation === 'Cross Cutting') {
      const cross = await this.porbService.getCross(programId, porbAowId, centerId);
      if (Array.isArray(cross)) this.crossRows = cross;
      return;
    }
    if (this.selectedExtraNavigation === 'Countries of Implementation') {
      const data = await this.porbService.getCountryPercentage(programId, porbAowId, centerId);
      if (Array.isArray(data)) this.countryPercentageRows = data;
      return;
    }
    if (this.selectedExtraNavigation === 'Location of Benefit') {
      const data = await this.porbService.getLocationBenefit(programId, porbAowId, centerId);
      if (Array.isArray(data)) this.locationBenefitRows = data;
      return;
    }
  }

  /**
   * Silently refresh the relevant part of the UI when another user edits a budget.
   * Called only for events that passed the self-filter and program-filter checks.
   */
  private async handleRemoteBudgetChange(data: {
    program_id: number;
    center_id?: any;
    aow_id?: number | null;
    section: string;
    type: 'update' | 'delete' | 'add';
  }): Promise<void> {
    if (!this.initiativeId) return;

    // If another user changed center status, reload the initiative to get updated center_status
    if (data.section === 'center-status') {
      try {
        const init = await this.submissionService.getInitiative(this.initiativeId);
        if (init?.center_status) {
          this.initiative.center_status = init.center_status;
          this.buildCanEditMap();
        }
      } catch { /* silent */ }
      return;
    }

    const eventCenterKey = data.center_id != null ? String(data.center_id) : null;
    const eventAowId = data.aow_id != null ? Number(data.aow_id) : null;
    const frontendSection = this.sectionKeyFor(data.section);

    // Always refresh the validation summary (error badges on AOW/center tabs)
    await this.refreshValidationSummary();

    if (this.activeView === 'summary') {
      // Reload summary consolidation overview table
      const summaryData = await this.porbService.getSummaryConsolidation(this.initiativeId);
      this.summaryConsolidationRows = Array.isArray(summaryData?.rows) ? summaryData.rows : [];
      this.summaryConsolidationTotals = summaryData?.totals || {};

      // Reload Budget for Financial Reporting (Anaplan consolidated)
      if (this.anaplanConsolidatedData != null) {
        await this.loadAnaplanConsolidated(this.initiativeId);
      }

      // Reload Location of Benefit consolidated if relevant event arrived
      if (data.section === 'location-benefit' && this.locationBenefitConsolidatedData != null) {
        await this.loadLocationBenefitConsolidated(this.initiativeId);
      }

      // Reload W3 consolidated if a bilateral event arrived
      if (data.section === 'bilateral') {
        await this.loadW3Consolidated(this.initiativeId);
        // If the user is currently on the summary W3 view, reload those rows directly
        if (this.summaryW3View) {
          this.summaryW3Loading = true;
          try {
            const raw = await this.porbService.getBilaterals(this.initiativeId, undefined, true);
            const map = new Map<string, any>();
            for (const row of (raw || [])) {
              const key = row.toc_id || row.bilateral_name || '';
              if (map.has(key)) {
                const existing = map.get(key);
                existing.bilateral_budget = (Number(existing.bilateral_budget) || 0) + (Number(row.bilateral_budget) || 0);
                if (row.bilateral_assumption) {
                  existing._assumptions.push({ center: row.center_name || '', assumption: row.bilateral_assumption });
                }
              } else {
                const assumptions: any[] = [];
                if (row.bilateral_assumption) {
                  assumptions.push({ center: row.center_name || '', assumption: row.bilateral_assumption });
                }
                map.set(key, { ...row, _assumptions: assumptions });
              }
            }
            this.summaryW3Rows = [...map.values()];
          } catch {
            // silent — stale data is acceptable here
          } finally {
            this.summaryW3Loading = false;
          }
        }
      }

      // If in detailed view and the changed AOW matches the currently selected one, reload detail
      if (
        this.summaryViewMode === 'detailed' &&
        !this.summaryW3View &&
        this.summarySelectedAow != null &&
        eventAowId != null &&
        this.summarySelectedAow.id === eventAowId
      ) {
        this.summaryAowDetail = await this.porbService.getSummaryAowDetail(
          this.initiativeId,
          this.summarySelectedAow.id
        );
        this.computeSummaryDetailCache();
      }
      return;
    }

    // ── CENTER VIEW ───────────────────────────────────────────────────────────
    const currentCenterKey = this.getCenterKey(this.selectedCenter);
    const sameCenter = eventCenterKey != null && currentCenterKey === eventCenterKey;

    if (this.centerViewMode === 'consolidated') {
      // In consolidated center view: just reload center consolidation data
      if (sameCenter) {
        await this.loadCenterConsolidation();
      }
      return;
    }

    // Budget-entry mode
    if (!sameCenter) return;

    // Always refresh the consolidation sidebar for same-center events
    await Promise.all([
      this.loadConsolidation(this.initiativeId, this.getSelectedPorbAowId(), this.getSelectedCenterId()),
      this.refreshSectionValidation(),
    ]);

    // W3/Bilateral event while user is in W3 view
    if (data.section === 'bilateral' && this.isW3View) {
      await this.loadW3CenterRows();
      return;
    }

    // Section-level refresh: only when same AOW and same frontend section
    if (
      frontendSection != null &&
      !this.isW3View &&
      this.selectedAow != null &&
      eventAowId != null &&
      this.selectedAow.id === eventAowId &&
      this.selectedExtraNavigation === frontendSection
    ) {
      if (data.type === 'update') {
        // Soft reload: update rows in-place without clearing the DOM
        await this.softReloadCurrentSection();
      } else {
        // add / delete: full reload (row count has changed)
        await this.loadBudgetRows();
      }
    }
  }
}
