import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { HeaderService } from "src/app/header.service";
import { PorbService } from "src/app/services/porb.service";

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

  // Navigation state
  centers: any[] = [];
  selectedCenter: any = null;
  aows: any[] = [];
  selectedAow: any = null;

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

    // Auto-select first center
    if (this.centers.length) {
      this.selectCenter(this.centers[0]);
    }
  }

  selectCenter(center: any): void {
    this.selectedCenter = center;
    this.isW3View = false;

    // Build AOWs list from snapshot
    this.aows = (this.porbData.aows || []).map((a: any) => ({
      id: a.id,
      toc_id: a.toc_id,
      aow_name: a.aow_name,
      aow_acrnum: a.aow_acrnum,
    }));

    if (this.aows.length) {
      this.selectAow(this.aows[0]);
    } else {
      this.selectedAow = null;
      this.currentRows = [];
    }
  }

  selectAow(aow: any): void {
    this.selectedAow = aow;
    this.isW3View = false;
    this.selectedSection = this.extraNavigationItems[0];
    this.loadSectionRows();
  }

  selectW3(): void {
    if (!this.hasW3Data) return;
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
      (c: any) => c.center_code === this.selectedCenter.code
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
      (b: any) => b.center_id === this.selectedCenter.code
    );
  }

  get hasW3Data(): boolean {
    return (this.porbData?.bilaterals || []).some(
      (b: any) => b.center_id === this.selectedCenter?.code
    );
  }

  /** Pooled total for country-percentage section: HLO budgets + cross-cutting budgets */
  get pooledTotal(): number {
    if (!this.selectedAow || !this.selectedCenter || !this.porbData) return 0;
    const aow = (this.porbData.aows || []).find(
      (a: any) => a.id === this.selectedAow.id
    );
    const centerData = (aow?.centers || []).find(
      (c: any) => c.center_code === this.selectedCenter.code
    );
    if (!centerData) return 0;
    const hloTotal = (centerData.hlos || []).reduce(
      (sum: number, h: any) => sum + (Number(h.hlo_budget) || 0),
      0
    );
    const crossTotal = (centerData.cross_cutting || []).reduce(
      (sum: number, c: any) => sum + (Number(c.budget) || 0),
      0
    );
    return hloTotal + crossTotal;
  }

  async exportZip(): Promise<void> {
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
    }
  }
}
