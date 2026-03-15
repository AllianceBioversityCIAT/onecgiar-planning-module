import { Component } from "@angular/core";
import { PageEvent } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { HeaderService } from "src/app/header.service";
import { AuthService } from "src/app/services/auth.service";
import { InitiativesService } from "src/app/services/initiatives.service";
import { PhasesService } from "src/app/services/phases.service";
import { SubmissionService } from "src/app/services/submission.service";
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
    private phasesService: PhasesService,
    private initiativesService: InitiativesService,
    private submissionService: SubmissionService,
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
  user: any;
  progressValue = 0;
  isExporting = false;
  downloadReady = false;
  downloadUrl: string | null | undefined = null;
  downloadFilename: string | null | undefined = null;

  columnsToDisplay: string[] = ["official_code", "title", "status"];
  dataSource: MatTableDataSource<any>;
  selectedPhase: any;
  statusOptions: string[] = ["Approved", "Pending"];
  selectedStatus: string = "Approved";
  async ngOnInit() {
    await this.getPhases();
    this.selectedPhase = this.phases.filter((phase: any) => phase.active)[0];

    await this.getInitiatives(this.selectedPhase.id);
    this.title.setTitle("Export");
    this.meta.updateTag({ name: "description", content: "Export" });

    this.socket.connect();

    this.socket.on("isExporting", (data: any) => {
      console.log('isExporting',data)
      this.isExporting = data.isExporting;
      this.progressValue = data.progressValue
    });
    this.socket.on("downloadReady", (data: any) => {
      console.log('downloadReady',data)
      this.downloadReady = data.downloadReady;
      this.downloadUrl = data.downloadUrl;
      this.downloadFilename = data.downloadFilename;
    });
  }

  async getPhases() {
    this.phases = await this.phasesService.getPhases();
  }

  async onPhaseChange(selectedValue: any) {
    await this.getInitiatives(selectedValue.id);
  }

  async onStatusChange(status: string) {
    this.selectedStatus = status;
    if (!this.selectedPhase) return;
    await this.getInitiatives(this.selectedPhase.id);
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  async getInitiatives(phase_id: number) {
    this.initiatives = await this.initiativesService.getInitiativeForExport(
      phase_id,
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
          progressValue: this.progressValue
    
        });
      }
    }, 300);

    const data = this.initiatives.map((item: any) => ({
      latest_submission_id: item.latest_submission_id,
      official_code: item.official_code,
      initiatives_id: item.id,
    }));

    const body = {
      phase: this.selectedPhase,
      initiatives: data,
    };

    const result = await this.submissionService.exportInit(
      body,
      this.selectedPhase.id
    );

    clearInterval(interval);
    this.progressValue = 100;

    if (result.success) {
      this.downloadUrl = result.url;
      this.downloadFilename = result.filename;
      this.downloadReady = true;
      this.socket.emit("downloadReady", {
        downloadReady: this.downloadReady,
        downloadUrl: result.url,
        downloadFilename: result.filename
      });
    }

    setTimeout(() => {
      this.isExporting = false;
      this.progressValue = 0;
      this.socket.emit("isExporting", {
        isExporting: this.isExporting,
        progressValue: 0
      });
    }, 500);
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
      downloadReady: this.downloadReady,
      downloadUrl: null,
      downloadFilename: null
    });
  }
}
