import { Component, OnInit } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { PageEvent } from "@angular/material/paginator";
import * as Highcharts from "highcharts";
import { HeaderService } from "src/app/header.service";
import { AuthService } from "src/app/services/auth.service";
import { InitiativesService } from "src/app/services/initiatives.service";
import { PhasesService } from "src/app/services/phases.service";
import { Meta, Title } from "@angular/platform-browser";
declare var require: any;
require("highcharts/highcharts-more.js")(Highcharts);

@Component({
  selector: "app-track-porbs",
  templateUrl: "./track-porbs.component.html",
  styleUrls: ["./track-porbs.component.scss"],
})
export class TrackPORBsComponent {
  // Chartstuff

  constructor(
    private headerService: HeaderService,
    private phasesService: PhasesService,
    private initiativesService: InitiativesService,
    private authService: AuthService,
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
  pageSize: number = 10;
  pageIndex: number = 1;

  filters: any = null;

  phase: any;
  initiatives: any = [];
  initiativesOnly: any = [];
  user: any;
  map: any = [];
  status: any = [];
  result: any = [];
  pieChart: any = null;

  columnsToDisplay: string[] = [
    "official_code",
    "title",
    "updated by",
    "status",
  ];
  dataSource: MatTableDataSource<any>;

  async ngOnInit() {
    if (this.authService.getLoggedInUser()) await this.getInitiativesOnly();

    if (this.authService.getLoggedInUser()) await this.getInitiatives();
    this.user = this.authService.getLoggedInUser();

    this.phase = await this.phasesService.getActivePhase();


    this.pieChart = {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: "pie",
        backgroundColor: { fill: "#e2e2e2" },
      },
      credits: {
        enabled: false,
      },

      title: {
        text: "Track PORBs graph",
        align: "center",
        style: {
          fontSize: "1.9rem",
          color: "#04030f",
        },
      },
      tooltip: {
        borderWidth: 0,
        backgroundColor: "rgba(255,255,255,0)",
        shadow: false,
        useHTML: true,
        style: {
          textAlign: "left",
          color: "#04030f",
          fontFamily: '"Poppins", sans-serif !important',
          fontSize: "1.6rem",
          fontStyle: "normal",
          fontWeight: "400",

          border: "1px solid #172f8f !important",
          borderRadius: "5px",
          opacity: "1",
          zIndex: "9999 !important",
          padding: "4.8em 5.2em 0",
          left: "0 !important",
          top: "0 !important",
        },
        headerFormat: "<table>",
        pointFormat:
          '<tr><th colspan="2"><span class="chart-bubble-title"><b class="title-tooltip">{point.name}</b></span></th></tr>' +
          "<tr><th>" +
          "</th><td>{series.name}: <b>{point.percentage:.1f}%</b></td></tr>",
        footerFormat: "</table>",
        followPointer: true,
      },
      accessibility: {
        point: {
          valueSuffix: "%",
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            style: {
              textAlign: "left",
              color: "#04030f",
              fontFamily: '"Poppins", sans-serif !important',
              fontSize: "1.6rem",
              fontStyle: "normal",
              fontWeight: "400",
              backgroundColor: "#fff",
              border: "1px solid #172f8f !important",
              borderRadius: "5px",
              opacity: "1",
              zIndex: "9999 !important",
              padding: "4.8em 5.2em 0",
              left: "0 !important",
              top: "0 !important",
            },
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.1f} %",
          },
        },
      },
      series: [
        {
          name: "Usage",
          colorByPoint: true,
          data: this.status
            .filter((d: any) => d.count)
            .map((d: any) => {
              return { name: d.el, y: +d.count };
            }),

          colors: ["#2A2E45", "#616A9E", "#FBBCBC", "#DCDEE9"],
        },
      ],
    };

    this.title.setTitle("Track PORBs");
    this.meta.updateTag({ name: "description", content: "Track PORBs" });
  }

  async getInitiativesOnly() {
    this.initiativesOnly = await this.initiativesService.getInitiativesOnly();
    const arr = [];
    for (let i = 0; i < this.initiativesOnly.result.length; i++) {
      arr.push(
        this.initiativesOnly?.result[i]?.last_submitted_at != null &&
          this.initiativesOnly?.result[i]?.last_update_at ==
            this.initiativesOnly?.result[i]?.last_submitted_at
          ? this.initiativesOnly?.result[i]?.latest_submission
            ? this.initiativesOnly?.result[i]?.latest_submission?.status
            : "Draft"
          : "Draft"
      );
    }
    this.status = arr.reduce(
      (b, c) => (
        (
          b[b.findIndex((d: { el: any }) => d.el === c)] ||
          b[b.push({ el: c, count: 0 }) - 1]
        ).count++,
        b
      ),
      []
    );
    this.result = this.status
      .filter((d: any) => d.count)
      .map((d: any) => {
        return { name: d.el, y: +d.count };
      });
  }

  async getInitiatives() {
    if (this.authService.getLoggedInUser())
      this.initiatives = await this.initiativesService.getInitiatives(
        null,
        this.pageIndex,
        this.pageSize
      );
    this.dataSource = new MatTableDataSource(this.initiatives?.result);
    this.length = this.initiatives.count;

  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getInitiatives();
  }


  async exportData() {
    await this.initiativesService.exportInitiativesForTrackPORBs();
  }

  Highcharts: typeof Highcharts = Highcharts;

  color(level: number) {
    switch (level) {
      case 25:
        return ` background-color: #1f6ca6;`;
      case 20:
        return ` background-color: #357AAE;`;

      case 16:
        return ` background-color: #257fc2;`;
      case 12:
        return ` background-color: #3090d9;`;
      case 9:
        return ` background-color: #0091ff;`;

      default:
        return ` background-color: #6ab8f2;`;
    }
  }
}
