import { Component, OnInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import * as Highcharts from "highcharts";
import HighchartsMore from "highcharts/highcharts-more";
import { HeaderService } from "src/app/header.service";
import { PhasesService } from "src/app/services/phases.service";
import { PorbService } from "src/app/services/porb.service";
import { Meta, Title } from "@angular/platform-browser";
HighchartsMore(Highcharts);

@Component({
    selector: "app-track-porbs",
    templateUrl: "./track-porbs.component.html",
    styleUrls: ["./track-porbs.component.scss"],
    standalone: false
})
export class TrackPORBsComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts;

  constructor(
    private headerService: HeaderService,
    private phasesService: PhasesService,
    private porbService: PorbService,
    private title: Title,
    private meta: Meta
  ) {
    this.headerService.background =
      "linear-gradient(to bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to top, #0F212F, #09151E)";
    this.headerService.backgroundFooter =
      "linear-gradient(to top, #0F212F, #09151E)";
  }

  length = 0;
  pageSize = 100;
  pageIndex = 1;

  phases: any[] = [];
  selectedPhase: any = null;
  statusOptions = ["Approved", "Pending", "Draft"];
  selectedStatus = "Approved";

  allPrograms: any[] = [];
  columnsToDisplay = ["official_code", "title", "status"];
  dataSource: MatTableDataSource<any>;
  pieChart: any = null;

  private readonly statusColors: Record<string, string> = {
    Approved: "#198754",
    Pending: "#e65100",
    Draft: "#616A9E",
    Rejected: "#dc3545",
  };

  async ngOnInit() {
    this.phases = await this.phasesService.getPhases();
    this.selectedPhase = this.phases.find((p: any) => p.active) || this.phases[0];
    await this.loadData();
    this.title.setTitle("Track PORBs");
    this.meta.updateTag({ name: "description", content: "Track PORBs" });
  }

  async onPhaseChange() {
    await this.loadData();
  }

  async onStatusChange() {
    await this.loadData();
  }

  async loadData() {
    // Fetch all statuses for pie chart
    const [approved, pending, draft] = await Promise.all([
      this.porbService.getExportList(this.selectedPhase?.id, "Approved"),
      this.porbService.getExportList(this.selectedPhase?.id, "Pending"),
      this.porbService.getExportList(this.selectedPhase?.id, "Draft"),
    ]);

    this.buildPieChart({
      Approved: approved?.length || 0,
      Pending: pending?.length || 0,
      Draft: draft?.length || 0,
    });

    // Use the selected status data for the table
    let tableData: any[];
    if (this.selectedStatus === "Approved") tableData = approved;
    else if (this.selectedStatus === "Pending") tableData = pending;
    else tableData = draft;

    this.allPrograms = tableData || [];
    this.dataSource = new MatTableDataSource(this.allPrograms);
    this.length = this.allPrograms.length;
    this.pageIndex = 1;
  }

  buildPieChart(counts: Record<string, number>) {
    const data = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        y: count,
        color: this.statusColors[name] || "#999",
      }));

    this.pieChart = {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 340,
      },
      credits: { enabled: false },
      title: {
        text: `PORB Status — ${this.selectedPhase?.name || ""}`,
        align: "center",
        style: { fontSize: "16px", color: "#1e1e1e", fontWeight: "600" },
      },
      tooltip: {
        pointFormat: "<b>{point.y}</b> program(s) ({point.percentage:.1f}%)",
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.y}",
            style: { fontSize: "13px", fontWeight: "400", color: "#333" },
          },
        },
      },
      series: [
        {
          name: "Programs",
          colorByPoint: true,
          data,
        },
      ],
    };
  }

  pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
  }

  async exportData() {
    if (!this.allPrograms.length) return;
    const programIds = this.allPrograms.map((p: any) => p.id);
    try {
      const response: any = await this.porbService.exportBulkZip(programIds);
      if (response?.body) {
        const blob = response.body as Blob;
        const contentDisposition = response.headers?.get("Content-Disposition");
        let filename = "PORB_Export.zip";
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed:", e);
    }
  }
}
