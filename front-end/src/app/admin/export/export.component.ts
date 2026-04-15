import { Component } from "@angular/core";
import { PageEvent } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { HeaderService } from "src/app/header.service";
import { InitiativesService } from "src/app/services/initiatives.service";
import { PhasesService } from "src/app/services/phases.service";
import { PorbService } from "src/app/services/porb.service";
import { AppSocket } from "src/app/socket.service";

@Component({
    selector: "app-export",
    templateUrl: "./export.component.html",
    styleUrls: ["./export.component.scss"],
    standalone: false
})
export class ExportComponent {
  constructor(
    private headerService: HeaderService,
    private initiativesService: InitiativesService,
    private phasesService: PhasesService,
    private porbService: PorbService,
    public socket: AppSocket,
    private title: Title,
    private meta: Meta
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundFooter =
      "linear-gradient(to  top, #0F212F, #09151E)";
  }

  length!: number;
  pageSize: number = 100;
  pageIndex: number = 1;

  phases: any;
  initiatives: any = [];
  progressValue = 0;
  isExporting = false;
  isExportingBudget = false;
  downloadReady = false;
  downloadUrl: string | null | undefined = null;
  downloadFilename: string | null | undefined = null;

  columnsToDisplay: string[] = ["official_code", "title", "status"];
  dataSource: MatTableDataSource<any>;
  selectedPhase: any;
  statusOptions: string[] = ["Approved", "Pending", "Draft"];
  selectedStatus: string = "Approved";

  async ngOnInit() {
    await this.getPhases();
    this.selectedPhase = this.phases.filter((phase: any) => phase.active)[0];
    await this.getInitiatives();
    this.title.setTitle("Export");
    this.meta.updateTag({ name: "description", content: "Export" });

    this.socket.connect();
    this.socket.on("isExporting", (data: any) => {
      this.isExporting = data.isExporting;
      this.progressValue = data.progressValue;
    });
    this.socket.on("downloadReady", (data: any) => {
      this.downloadReady = data.downloadReady;
      this.downloadUrl = data.downloadUrl;
      this.downloadFilename = data.downloadFilename;
    });
  }

  async getPhases() {
    this.phases = await this.phasesService.getPhases();
  }

  async onPhaseChange(_selectedValue: any) {
    await this.getInitiatives();
  }

  async onStatusChange(_status: string) {
    await this.getInitiatives();
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  async getInitiatives() {
    this.initiatives = await this.porbService.getExportList(
      this.selectedPhase?.id,
      this.selectedStatus
    );
    this.dataSource = new MatTableDataSource(this.initiatives);
    this.length = this.initiatives?.length || 0;
  }

  async exportData() {
    this.isExporting = true;
    this.downloadReady = false;
    this.progressValue = 0;

    const interval = setInterval(() => {
      if (this.progressValue < 90) {
        this.progressValue += 5;
        this.socket.emit("isExporting", {
          isExporting: this.isExporting,
          progressValue: this.progressValue,
        });
      }
    }, 300);

    const programIds = this.initiatives.map((item: any) => item.id);

    try {
      const response: any = await this.porbService.exportBulkZip(programIds);

      clearInterval(interval);
      this.progressValue = 100;

      if (response?.body) {
        const blob = response.body as Blob;
        const contentDisposition = response.headers?.get("Content-Disposition");
        let filename = "PORB_Export.zip";
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }
        const url = window.URL.createObjectURL(blob);
        this.downloadUrl = url;
        this.downloadFilename = filename;
        this.downloadReady = true;
        this.socket.emit("downloadReady", {
          downloadReady: true,
          downloadUrl: url,
          downloadFilename: filename,
        });
      }
    } catch (e) {
      clearInterval(interval);
      console.error("Export failed:", e);
    }

    setTimeout(() => {
      this.isExporting = false;
      this.progressValue = 0;
      this.socket.emit("isExporting", {
        isExporting: false,
        progressValue: 0,
      });
    }, 500);
  }

  async exportBudgetSummary() {
    this.isExportingBudget = true;
    const programIds = this.initiatives.map((item: any) => item.id);
    try {
      const response: any = await this.initiativesService.exportBudgetSummaryBulk(
        programIds,
        this.selectedStatus,
        this.selectedPhase?.id
      );
      if (response?.body) {
        const blob = response.body as Blob;
        const contentDisposition = response.headers?.get('Content-Disposition');
        let filename = `${this.selectedStatus}_Budget-Summary.xlsx`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Budget Summary export failed:', e);
    }
    this.isExportingBudget = false;
  }

  downloadFile() {
    if (!this.downloadUrl || !this.downloadFilename) return;
    const a = document.createElement("a");
    a.href = this.downloadUrl;
    a.download = this.downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(this.downloadUrl);
    this.downloadUrl = null;
    this.downloadReady = false;
    this.socket.emit("downloadReady", {
      downloadReady: false,
      downloadUrl: null,
      downloadFilename: null,
    });
  }
}
