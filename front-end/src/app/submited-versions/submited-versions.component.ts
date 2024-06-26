import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  EventEmitter,
  Output,
} from "@angular/core";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { AuthService } from "../services/auth.service";
import { SubmissionService } from "../services/submission.service";
import { ActivatedRoute } from "@angular/router";
import { StatusComponent } from "./status/status.component";
import { MatDialog } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { HeaderService } from "../header.service";
import { Meta, Title } from "@angular/platform-browser";
import { jsPDF } from "jspdf";
import { LoaderService } from "src/app/services/loader.service";
import { PhasesService } from "src/app/services/phases.service";
import { ChatComponent } from "../share/chat/chat/chat.component";
import { InitiativesService } from "../services/initiatives.service";

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: "app-submited-versions",
  templateUrl: "./submited-versions.component.html",
  styleUrls: ["./submited-versions.component.scss"],
})
export class SubmitedVersionsComponent implements AfterViewInit {
  displayedColumns: string[] = [
    "id",
    "phase",
    "created_by",
    "created_at",
    "status",
    "status_reason",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  submissions: any = [];
  isAllowedToAccessChat: boolean = false;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild("pdfcontent", { static: false }) pdfcontent: ElementRef;

  @Output("pdfClicked") pdfClicked = new EventEmitter<{
    serverName: string;
  }>();

  constructor(
    private submissionService: SubmissionService,
    private authService: AuthService,
    private activatedRoute: ActivatedRoute,
    public dialog: MatDialog,
    private toastrService: ToastrService,
    private headerService: HeaderService,
    private title: Title,
    private meta: Meta,
    public loader: LoaderService,
    private phasesService: PhasesService,
    private initiativesService: InitiativesService
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
  user: any;
  params: any;
  initiativeId: any;
  officalCode: any;
  allfilters: any;
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  nameK = "download";
  async ngAfterViewInit() {
    this.params = this.activatedRoute?.snapshot.params;
    await this.initData();

    this.user = this.authService.getLoggedInUser();

    this.isAllowedToAccessChat =
      (await this.initiativesService
        .isAllowedToAccessChat(this.params.id)
        .toPromise()) ?? false;
  }
  async initData(filters = null) {
    this.initiativeId = this.params.id;
    this.officalCode = this.params.code;

    this.submissions =
      await this.submissionService.getSubmissionsByInitiativeId(
        this.params.id,
        filters,
        this.pageIndex,
        this.pageSize,
        true
      );
    console.log("main Data", this.submissions);
    this.dataSource = new MatTableDataSource(this.submissions?.result);
    this.length = this.submissions?.count;

    this.title.setTitle("Submitted versions");
    this.meta.updateTag({ name: "description", content: "Submitted versions" });
  }

  filter(filters: any) {
    this.allfilters = filters;
    this.pageIndex = 1;
    this.pageSize = 10;
    this.initData(filters);
    this.paginator.pageSize = 0;
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.initData(this.allfilters);
  }

  changeStatus(element: number) {
    const dialogRef = this.dialog.open(StatusComponent, {
      data: element,
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.initData();
        this.toastrService.success("Status changed successfully");
      }
    });
  }

  data: any = [];
  wps: any = [];
  partners: any = [];
  result: any;
  partnersData: any = {};
  sammary: any = {};
  allData: any = {};
  values: any = {};
  totals: any = {};
  displayValues: any = {};
  summaryBudgets: any = {};
  summaryBudgetsTotal: any = {};
  wp_budgets: any = {};
  budgetValues: any = {};
  displayBudgetValues: any = {};
  toggleValues: any = {};
  toggleSummaryValues: any = {};
  errors: any = {};
  period: Array<any> = [];
  check(values: any, code: string, id: number, item_id: string) {
    if (values[code] && values[code][id] && values[code][id][item_id]) {
      return true;
    } else if (values[code] && !values[code][id]) {
      values[code][id] = {};
      values[code][id][item_id] = 0;
      this.totals[code][id] = 0;
      this.errors[code][id] = null;
      return true;
    } else if (values[code] && values[code][id] && !values[code][id][item_id]) {
      values[code][id][item_id] = 0;
      return true;
    } else {
      values[code] = {};
      values[code][id] = {};
      values[code][id][item_id] = 0;
      this.totals[code] = {};
      this.totals[code][id] = 0;
      this.errors[code] = {};
      this.errors[code][id] = null;
      return true;
    }
  }
  calclate(code: any, id: any) {
    if (this.totals[code] && this.totals[code][id])
      return this.totals[code][id];
  }

  perValues: any = {};
  perValuesSammary: any = {};
  perAllValues: any = {};
  sammaryTotal: any = {};
  sammaryTotalConsolidated: any = {}; 
  async changes(
    partner_code: any,
    wp_id: any,
    item_id: any,
    per_id: number,
    value: any
  ) {
    if (!this.perValues[partner_code]) this.perValues[partner_code] = {};
    if (!this.perValues[partner_code][wp_id])
      this.perValues[partner_code][wp_id] = {};
    if (!this.perValues[partner_code][wp_id][item_id])
      this.perValues[partner_code][wp_id][item_id] = {};

    this.perValues[partner_code][wp_id][item_id][per_id] = value;

    this.allvalueChange();
  }

  wpsTotalSum = 0;
  sammaryCalc() {
    let totalsum: any = {};
    let totalsumcenter: any = {};
    let totalWp: any = {};
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};

    Object.keys(this.budgetValues).forEach((partner_code) => {
      Object.keys(this.budgetValues[partner_code]).forEach((wp_id) => {
        if (!this.summaryBudgets[wp_id]) this.summaryBudgets[wp_id] = {};
        if (!this.summaryBudgetsTotal[wp_id])
          this.summaryBudgetsTotal[wp_id] = 0;
        Object.keys(this.budgetValues[partner_code][wp_id]).forEach(
          (item_id) => {
            if (!this.summaryBudgets[wp_id][item_id])
              this.summaryBudgets[wp_id][item_id] = 0;
            this.summaryBudgets[wp_id][item_id] +=
              +this.budgetValues[partner_code][wp_id][item_id];
            this.summaryBudgetsTotal[wp_id] +=
              +this.budgetValues[partner_code][wp_id][item_id];
          }
        );
      });
    });
    this.summaryBudgetsAllTotal = Object.values(
      this.summaryBudgetsTotal
    ).reduce((a: any, b: any) => a + b);

    Object.keys(this.summaryBudgets).forEach((wp_id) => {
      if (this.summaryBudgetsTotal[wp_id]) {
        Object.keys(this.summaryBudgets[wp_id]).forEach((item_id) => {
          this.sammary[wp_id][item_id] = this.percentValue(
            this.summaryBudgets[wp_id][item_id],
            this.summaryBudgetsTotal[wp_id]
          );
        });
      }
    });

    Object.keys(this.values).forEach((code) => {
      Object.keys(this.values[code]).forEach((wp_id) => {
        let total = 0;
        Object.keys(this.values[code][wp_id]).forEach((d) => {
          total += +this.values[code][wp_id][d];
        });
        if (total > 100) {
          this.errors[code][wp_id] =
            "total percentage cannot be over 100 percent";
        } else {
          this.errors[code][wp_id] = null;
        }
        this.totals[code][wp_id] = total;

        Object.keys(this.values[code][wp_id]).forEach((item_id) => {
          if (!totalsum[wp_id]) totalsum[wp_id] = {};
          if (!totalsum[wp_id][item_id]) totalsum[wp_id][item_id] = 0;
          totalsum[wp_id][item_id] += +this.values[code][wp_id][item_id];
        });
        // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
      });
    });

    Object.keys(this.totals).forEach((code) => {
      Object.keys(this.totals[code]).forEach((wp_id) => {
        if (!totalsumcenter[wp_id]) totalsumcenter[wp_id] = 0;
        totalsumcenter[wp_id] += +this.totals[code][wp_id];
        // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
      });
    });

    Object.keys(totalsum).forEach((wp_id) => {
      Object.keys(totalsum[wp_id]).forEach((item_id) => {
        if (!totalWp[wp_id]) totalWp[wp_id] = {};
        if (+totalsum[wp_id][item_id] && +totalsumcenter[wp_id])
          totalWp[wp_id][item_id] =
            +(+totalsum[wp_id][item_id] / +totalsumcenter[wp_id]) * 100;
        else totalWp[wp_id][item_id] = 0;
      });
    });

    this.sammaryTotal["CROSS"] = 0;
    this.sammaryTotal["IPSR"] = 0;
    this.sammaryTotalConsolidated["CROSS"] = 0;
    this.sammaryTotalConsolidated["IPSR"] = 0;
    Object.keys(this.sammary).forEach((wp_id) => {
      this.sammaryTotal[wp_id] = 0;
      this.sammaryTotalConsolidated[wp_id] = 0;
      Object.keys(this.sammary[wp_id]).forEach((item_id) => {
        this.sammaryTotal[wp_id] += totalWp[wp_id][item_id];
        this.sammaryTotalConsolidated[wp_id] = this.summaryBudgetsAllTotal ? this.summaryBudgetsTotal[wp_id] / this.summaryBudgetsAllTotal * 100 : 0;
      });
    });
    this.wpsTotalSum = 0;
    Object.keys(this.sammaryTotal).forEach((wp_id) => {
      this.wpsTotalSum += this.sammaryTotalConsolidated[wp_id];
    });
    // this.wpsTotalSum = this.wpsTotalSum / Object.keys(this.sammaryTotal).length;
  }
  allvalueChange() {
    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code].forEach((item: any) => {
        this.period.forEach((element) => {
          if (!this.perAllValues[wp.ost_wp.wp_official_code])
            this.perAllValues[wp.ost_wp.wp_official_code] = {};
          if (!this.perAllValues[wp.ost_wp.wp_official_code][item.id])
            this.perAllValues[wp.ost_wp.wp_official_code][item.id] = {};
          this.perAllValues[wp.ost_wp.wp_official_code][item.id][element.id] =
            false;
        });
      });
    }
    this.wps.forEach((wp: any) => {
      this.period.forEach((per) => {
        this.perValuesSammary[wp.ost_wp.wp_official_code][per.id] = false;
      });
    });

    Object.keys(this.perValues).forEach((partner_code) => {
      Object.keys(this.perValues[partner_code]).forEach((wp_id) => {
        Object.keys(this.perValues[partner_code][wp_id]).forEach((item_id) => {
          Object.keys(this.perValues[partner_code][wp_id][item_id]).forEach(
            (per_id) => {
              if (this.perValues[partner_code][wp_id][item_id][per_id] == true)
                this.perAllValues[wp_id][item_id][per_id] =
                  this.perValues[partner_code][wp_id][item_id][per_id];

              if (this.perValues[partner_code][wp_id][item_id][per_id] == true)
                this.perValuesSammary[wp_id][per_id] = true;
            }
          );
        });
      });
    });
  }

  results: any;
  loading = false;
  initiative_data: any = {};
  ipsr_value_data: any;

  async pdfData(lastSubmitionId: any) {
    console.log(lastSubmitionId);
    this.loading = true;
    this.wpsTotalSum = 0;
    this.perValues = {};
    this.perValuesSammary = {};
    this.perAllValues = {};
    this.sammaryTotal = {};
    this.sammaryTotalConsolidated = {};
    this.data = [];
    this.wps = [];
    this.partnersData = {};
    this.sammary = {};
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};
    this.wp_budgets = {};
    this.toggleValues = {};
    this.budgetValues = {};
    this.budgetValues = {};
    this.displayBudgetValues = {};
    this.allData = {};
    this.values = {};
    this.displayValues = {};
    this.totals = {};
    this.errors = {};

    this.wp_budgets = await this.submissionService.getBudgets(
      lastSubmitionId,
      this.submission_data.phase.id
    );
    this.results = this.submission_data.toc_data;
    // const melia_data = await this.submissionService.getMeliaBySubmission(
    //   lastSubmitionId
    // );
    const cross_data = await this.submissionService.getCrossBySubmission(
      lastSubmitionId
    );
    this.ipsr_value_data = await this.submissionService.getIpsrBySubmission(
      lastSubmitionId
    );
    cross_data.map((d: any) => {
      d["category"] = "Cross Cutting";
      d["wp_id"] = "CROSS";
      return d;
    });
    // melia_data.map((d: any) => {
    //   d["category"] = "MELIA";
    //   return d;
    // });
    this.ipsr_value_data.map((d: any) => {
      d["category"] = "IPSR";
      d["wp_id"] = "IPSR";
      return d;
    });
    this.results = [
      ...cross_data,
      // ...melia_data,
      ...this.ipsr_value_data,
      ...this.results,
      // ...indicators_data,
    ];
    this.wps = this.results
      .filter((d: any) => d.category == "WP" && !d.group)
      .sort((a: any, b: any) => a.title.localeCompare(b.title));
    this.wps.unshift({
      id: "CROSS",
      title: "Cross Cutting",
      category: "Cross Cutting",
      ost_wp: { wp_official_code: "CROSS" },
    });
    this.wps.push({
      id: "IPSR",
      title: "Innovation Packages & Scaling Readiness (IPSR)",
      category: "IPSR",
      ost_wp: { wp_official_code: "IPSR" },
    });
    for (let partner of this.partners) {
      if (!this.budgetValues[partner.code])
        this.budgetValues[partner.code] = {};

      if (!this.displayBudgetValues[partner.code])
        this.displayBudgetValues[partner.code] = {};

      for (let wp of this.wps) {
        if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
        if (!this.wp_budgets[partner.code][wp.ost_wp.wp_official_code])
          this.wp_budgets[partner.code][wp.ost_wp.wp_official_code] = null;

        if (!this.toggleValues[partner.code])
          this.toggleValues[partner.code] = {};
        if (!this.toggleValues[partner.code][wp.ost_wp.wp_official_code])
          this.toggleValues[partner.code][wp.ost_wp.wp_official_code] = false;

        if (!this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code] = {};

        if (!this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code] =
            {};

        if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
          this.summaryBudgets[wp.ost_wp.wp_official_code] = {};

        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;

        const result = await this.getDataForWp(
          wp.id,
          partner.code,
          wp.ost_wp.wp_official_code
        );
        if (result.length) {
          if (!this.partnersData[partner.code])
            this.partnersData[partner.code] = {};
          this.partnersData[partner.code][wp.ost_wp.wp_official_code] = result;
        }
        if (!this.perValuesSammary[wp.ost_wp.wp_official_code])
          this.perValuesSammary[wp.ost_wp.wp_official_code] = {};
        this.period.forEach((element) => {
          if (!this.perValuesSammary[wp.ost_wp.wp_official_code][element.id])
            this.perValuesSammary[wp.ost_wp.wp_official_code][element.id] =
              false;
        });
        result.forEach((item: any) => {
          this.check(
            this.values,
            partner.code,
            wp.ost_wp.wp_official_code,
            item.id
          );
          this.check(
            this.displayValues,
            partner.code,
            wp.ost_wp.wp_official_code,
            item.id
          );
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
            null;

          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;

          if (!this.summaryBudgets[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgets[wp.ost_wp.wp_official_code][item.id] = 0;

          if (!this.perValues[partner.code]) this.perValues[partner.code] = {};
          if (!this.perValues[partner.code][wp.ost_wp.wp_official_code])
            this.perValues[partner.code][wp.ost_wp.wp_official_code] = {};
          if (
            !this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id]
          )
            this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
              {};

          this.period.forEach((element) => {
            this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id][
              element.id
            ] = false;
          });

          this.period.forEach((element) => {
            if (!this.perAllValues[wp.ost_wp.wp_official_code])
              this.perAllValues[wp.ost_wp.wp_official_code] = {};
            if (!this.perAllValues[wp.ost_wp.wp_official_code][item.id])
              this.perAllValues[wp.ost_wp.wp_official_code][item.id] = {};

            this.perAllValues[wp.ost_wp.wp_official_code][item.id][element.id] =
              false;

            if (!this.sammary[wp.ost_wp.wp_official_code])
              this.sammary[wp.ost_wp.wp_official_code] = {};
            if (!this.sammary[wp.ost_wp.wp_official_code][item.id])
              this.sammary[wp.ost_wp.wp_official_code][item.id] = 0;

            if (!this.sammaryTotal[wp.ost_wp.wp_official_code])
              this.sammaryTotal[wp.ost_wp.wp_official_code] = 0;
              
            if (!this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code])
              this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code] = 0;
          });
        });
      }

      if (this.partnersData[partner.code]?.IPSR)
        this.partnersData[partner.code].IPSR = this.partnersData[
          partner.code
        ]?.IPSR?.filter((d: any) => d.value != null && d.value != "");
        
      let newCrossCenters = this.partnersData[partner.code].CROSS.filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));

      this.partnersData[partner.code].CROSS = this.partnersData[partner.code].CROSS.filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));

      newCrossCenters.forEach((d: any) => this.partnersData[partner.code].CROSS.unshift(d))

      this.wps.forEach((d : any) => {
        if(d.category == "WP") {
          let outputData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
            .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))
          
          let outcomeData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
            .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))
  
          this.partnersData[partner.code][d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
        }
      })


      this.loading = false;
    }

    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code] = await this.getDataForWp(
        wp.id,
        null,
        wp.ost_wp.wp_official_code
      );
    }

    this.savedValues = this.submission_data.consolidated;

    this.setvalues(this.savedValues.values, this.savedValues.perValues);


    const newCROSS = this.allData["CROSS"].filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));

    this.allData["CROSS"] = this.allData["CROSS"].filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));

    newCROSS.forEach((d: any) => this.allData["CROSS"].unshift(d))


    //sort WP titles
    this.wps.forEach((d : any) => {
      if(d.category == "WP") {
        let outputData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
        .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))
        
        let outcomeData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
        .sort((a: any, b: any) => a?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()));

        this.allData[d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
      }
    })

    this.loader.setLoading(true, "Downloading");
    setTimeout(() => {
      this.exportPDF();
    }, 1000);

    this.meta.updateTag({ name: "description", content: "Submitted versions" });
  }
  savedValues: any = null;
  submission_data: any;

  summaryBudgetsAllTotal: any = 0;
  async generatePDF(lastSubmitionId: any) {
    this.toPdf = true;
    console.log(lastSubmitionId);

    this.submission_data = await this.submissionService.getSubmissionsById(
      lastSubmitionId
    );
    this.initiative_data = this.submission_data.initiative;

    this.partners = await this.phasesService.getAssignedOrgs(
      this.submission_data.phase.id,
      this.initiative_data.id
    );
    if (this.partners.length < 1) {
      this.partners = await this.submissionService.getOrganizations();
    }

    this.pdfData(lastSubmitionId);
    this.period = this.submission_data.phase.periods;

    this.pdfClicked.emit({ serverName: this.nameK });
  }

  percentValue(value: number, totalBudget: number) {
    return (value / totalBudget) * 100;
  }

  budgetValue(value: number, totalBudget: number) {
    return (value * totalBudget) / 100;
  }

  toggleActualValues(partner_code: any, wp_official_code: any) {
    this.toggleValues[partner_code][wp_official_code] =
      !this.toggleValues[partner_code][wp_official_code];
  }

  toggleSummaryActualValues(wp_official_code: any) {
    this.toggleSummaryValues[wp_official_code] =
      !this.toggleSummaryValues[wp_official_code];
  }

  roundNumber(value: number) {
    return Math.round(value);
  }

  finalPeriodVal(period_id: any) {
    return this.wps
      .map(
        (wp: any) =>
          this.perValuesSammary[wp.ost_wp.wp_official_code][period_id]
      )
      .reduce((a: any, b: any) => a || b);
  }

  finalItemPeriodVal(wp_id: any, period_id: any) {
    let periods = this.allData[wp_id].map(
      (item: any) => this.perAllValues[wp_id][item.id][period_id]
    );
    if (periods.length) return periods.reduce((a: any, b: any) => a || b);
    else return false;
  }

  setvalues(valuesToSet: any, perValuesToSet: any) {
    if (valuesToSet != null)
      Object.keys(this.values).forEach((code) => {
        Object.keys(this.values[code]).forEach((wp_id) => {
          Object.keys(this.values[code][wp_id]).forEach((item_id) => {
            if (
              valuesToSet[code] &&
              valuesToSet[code][wp_id] &&
              valuesToSet[code][wp_id][item_id]
            ) {
              let percentValue = +valuesToSet[code][wp_id][item_id];
              let budgetValue = this.budgetValue(
                percentValue,
                this.wp_budgets[code][wp_id]
              );
              this.values[code][wp_id][item_id] = percentValue;
              this.displayValues[code][wp_id][item_id] =
                Math.round(percentValue);
              this.budgetValues[code][wp_id][item_id] = budgetValue;
              this.displayBudgetValues[code][wp_id][item_id] =
                Math.round(budgetValue);
            } else {
              this.values[code][wp_id][item_id] = 0;
              this.displayValues[code][wp_id][item_id] = 0;
              this.budgetValues[code][wp_id][item_id] = 0;
              this.displayBudgetValues[code][wp_id][item_id] = 0;
            }
            // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
          });
        });
      });
    if (perValuesToSet != null)
      Object.keys(this.perValues).forEach((code) => {
        Object.keys(this.perValues[code]).forEach((wp_id) => {
          Object.keys(this.perValues[code][wp_id]).forEach((item_id) => {
            Object.keys(this.perValues[code][wp_id][item_id]).forEach(
              (per_id) => {
                if (
                  perValuesToSet[code] &&
                  perValuesToSet[code][wp_id] &&
                  perValuesToSet[code][wp_id][item_id]
                )
                  this.perValues[code][wp_id][item_id][per_id] =
                    perValuesToSet[code][wp_id][item_id][per_id];
                // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
              }
            );
          });
        });
      });

    this.sammaryCalc();
    this.allvalueChange();
  }
  async getDataForWp(
    id: string,
    partner_code: any | null = null,
    official_code = null
  ) {
    let wp_data = this.results.filter((d: any) => {
      if (partner_code)
        return (
          (d.category == "OUTPUT" ||
            d.category == "OUTCOME" ||
            d.category == "EOI" ||
            d.category == "Cross Cutting" ||
            d.category == "IPSR" 
          //   ||d.category == 'INDICATOR' ||
            // d.category == "MELIA"
            ) &&
          (d.group == id ||
            d.wp_id == official_code ||
            (official_code == "CROSS" && d.category == "EOI"))
        );
      else
        return (
          ((d.category == "OUTPUT" ||
            d.category == "OUTCOME" ||
            d.category == "EOI" ||
            d.category == "IPSR" ||
            d.category == "Cross Cutting" 
            // ||
            // d.category == 'INDICATOR' ||
            // d.category == "MELIA"
            ) &&
            (d.group == id || d.wp_id == official_code)) ||
          (official_code == "CROSS" && d.category == "EOI")
        );
    });

    wp_data.sort(this.compare);

    return wp_data;
  }

  compare(a: any, b: any) {
    if (a.category == "OUTPUT" && b.category == "OUTCOME") return -1;
    if (b.category == "OUTPUT" && a.category == "OUTCOME") return 1;
    return 0;
  }
  toPdf: boolean = false;
  exportPDF() {
    let content = this.pdfcontent.nativeElement;
    this.pdfcontent.nativeElement.width;
    // let doc = new jsPDF('portrait', 'pt', 'a4');
    // let doc = new jsPDF('portrait', 'pt', [1550, 10000]);
    let doc = new jsPDF({
      orientation: "p",
      unit: "px",

      format: [
        this.pdfcontent.nativeElement.scrollWidth,
        this.pdfcontent.nativeElement.scrollHeight + 100,
      ],
      // format: [1500, height + 400]
    });
    setTimeout(() => {
      doc.html(content, {
        callback: (doc: any) => {
          doc.save("Planning-" + this.officalCode + ".pdf");
          this.toPdf = false;
          this.loader.setLoading(false);
        },
      });
    }, 500);
  }
  submition: any;
  async generateExcel(id: number) {
    // const downloadLink = document.createElement('a');
    // const dataType = 'application/vnd.ms-excel';
    // const table = document.getElementById('soso');
    // const tableHtml = table?.outerHTML.replace(/ /g, '%20');
    // document.body.appendChild(downloadLink);
    // downloadLink.href = 'data:' + dataType + ' ' + tableHtml;
    // downloadLink.download = 'httptrace.xlsx';
    // downloadLink.click()

    this.submition = await this.submissionService.excel(id);
    console.log(this.submition);
  }

  finalCenterItemPeriodVal(partner_code: any, wp_id: any, period_id: any) {
    let periods = this.allData[wp_id].map(
      (item: any) => this.perValues[partner_code][wp_id][item.id][period_id]
    );
    if (periods.length) return periods.reduce((a: any, b: any) => a || b);
    else return false;
  }

  openChatDialog(initiative_id: number, version_id: number) {
    const dialogRef = this.dialog.open(ChatComponent, {
      data: {
        initiative_id,
        version_id,
      },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.toastrService.success("dialof closed");
      }
    });
  }
}
