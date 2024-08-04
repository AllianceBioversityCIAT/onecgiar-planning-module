import { Component, OnInit } from "@angular/core";
import { SubmissionService } from "../../services/submission.service";
import { AppSocket } from "../../socket.service";
import { MatDialog } from "@angular/material/dialog";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "../../confirm/confirm.component";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { ToastrService } from "ngx-toastr";
import { PhasesService } from "src/app/services/phases.service";
import { HeaderService } from "src/app/header.service";
import { Meta, Title } from "@angular/platform-browser";

@Component({
  selector: "app-submited-version",
  templateUrl: "./submited-version.component.html",
  styleUrls: ["./submited-version.component.scss"],
})
export class SubmitedVersionComponent implements OnInit {
  title = "planning";

  constructor(
    private submissionService: SubmissionService,
    private phasesService: PhasesService,
    private socket: AppSocket,
    public dialog: MatDialog,
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private AuthService: AuthService,
    private toastrService: ToastrService,
    private headerService: HeaderService,
    private titl2: Title,
    private meta: Meta
  ) {
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";

    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
    this.headerService.backgroundDeleteYes = "#5569dd";
    this.headerService.backgroundDeleteClose = "#808080";
    this.headerService.backgroundDeleteLr = "#5569dd";
    this.headerService.logoutSvg="brightness(0) saturate(100%) invert(43%) sepia(18%) saturate(3699%) hue-rotate(206deg) brightness(89%) contrast(93%)";
  }
  user: any;
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
  summaryBudgetsAllTotal: any = 0;
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
  timeCalc: any;
  async changeCalc(partner_code: any, wp_id: any, item_id: any, value: any) {
    if (this.timeCalc) clearTimeout(this.timeCalc);
    this.timeCalc = setTimeout(async () => {
      const result = await this.submissionService.saveResultValue(
        this.params.id,
        {
          partner_code,
          wp_id,
          item_id,
          value,
        }
      );
      if (result)
        this.socket.emit("setDataValue", {
          id: this.params.id,
          partner_code,
          wp_id,
          item_id,
          value,
        });
      this.sammaryCalc();
    }, 500);

    // localStorage.setItem('initiatives', JSON.stringify(this.values));
  }

  perValues: any = {};
  perValuesSammary: any = {};
  perValuesSammaryForPartner: any = {};
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
  // async changeEnable(
  //   partner_code: any,
  //   wp_id: any,
  //   item_id: any,
  //   per_id: number,
  //   event: any
  // ) {
  //   this.changes(partner_code, wp_id, item_id, per_id, event.checked);
  //   const result = await this.submissionService.saveResultValues(
  //     this.params.id,
  //     {
  //       partner_code,
  //       wp_id,
  //       item_id,
  //       per_id,
  //       value: event.checked,
  //     }
  //   );
  //   if (result)
  //     this.socket.emit("setDataValues", {
  //       id: this.params.id,
  //       partner_code,
  //       wp_id,
  //       item_id,
  //       per_id,
  //       value: event.checked,
  //     });
  // }
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

    this.partners.forEach((partner: any) => {
      this.wps.forEach((wp: any) => {
        this.period.forEach((per) => {
          this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][per.id] = false;
        });
      });
    });

    //from here
    Object.keys(this.perValues).forEach((partner_code) => {
      Object.keys(this.perValues[partner_code]).forEach((wp_id) => {
        Object.keys(this.perValues[partner_code][wp_id]).forEach((item_id) => {
          Object.keys(this.perValues[partner_code][wp_id][item_id]).forEach(
            (per_id) => {
              if (this.perValues[partner_code][wp_id][item_id][per_id] == true)
                this.perAllValues[wp_id][item_id][per_id] =
                  this.perValues[partner_code][wp_id][item_id][per_id];

              if (this.perValues[partner_code][wp_id][item_id][per_id] == true){
                this.perValuesSammary[wp_id][per_id] = true;
                this.perValuesSammaryForPartner[partner_code][wp_id][per_id] = true;  
              }
            }
          );
        });
      });
    });
  }

  results: any;
  loading = false;
  params: any;
  initiative_data: any = {};
  ipsr_value_data: any;
  async InitData() {
    this.loading = true;
    this.wpsTotalSum = 0;
    this.perValues = {};
    this.perValuesSammary = {};
    this.perValuesSammaryForPartner = {};

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
    this.displayBudgetValues = {};
    this.allData = {};
    this.values = {};
    this.displayValues = {};
    this.totals = {};
    this.errors = {};

    this.wp_budgets = await this.submissionService.getBudgets(this.params.id, this.submission_data.phase.id);

    this.results = this.submission_data.toc_data;
    // const melia_data = await this.submissionService.getMeliaBySubmission(
    //   this.params.id
    // );
    const cross_data = await this.submissionService.getCrossBySubmission(
      this.params.id
    );
    this.ipsr_value_data = await this.submissionService.getIpsrBySubmission(
      this.params.id
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
      .filter((d: any) => {
        if (d.category == "WP")
          d.title = d.ost_wp.acronym + ": " + d.ost_wp.name;
        return d.category == "WP" && !d.group;
      })
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
        // console.log(this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
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
        // console.log(result)
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

        if (!this.perValuesSammaryForPartner[partner.code])
          this.perValuesSammaryForPartner[partner.code] = {};
        if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code])
          this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code] = {};
        this.period.forEach((element) => {
          if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id] =
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

      this.wps.forEach((d: any) => {
        if (d.category == "WP") {
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
    // console.log(this.allData)

    this.savedValues = this.submission_data.consolidated;
    console.log(this.savedValues)

    this.setvalues(this.savedValues.values, this.savedValues.perValues);


  const newIPSR = this.allData["IPSR"]
    .filter((d: any) => d.value != "")
    .sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
  this.allData["IPSR"] = newIPSR;


  //sort (Cross Cutting)
  const newCROSS = this.allData["CROSS"].filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));

  this.allData["CROSS"] = this.allData["CROSS"].filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));

  newCROSS.forEach((d: any) => this.allData["CROSS"].unshift(d))


  //sort WP titles
  this.wps.forEach((d: any) => {
    if (d.category == "WP") {
      let outputData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
        .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

      let outcomeData = this.allData[d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
        .sort((a: any, b: any) => a?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b?.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()));

      this.allData[d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
    }
  })


    this.titl2.setTitle("Submitted versions");
    this.meta.updateTag({ name: "description", content: "Submitted versions" });
  }
  savedValues: any = null;
  submission_data: any;
  initiativeId: any;
  officalCode: any;
  params5: any;
  async ngOnInit() {
    this.params = this.activatedRoute?.snapshot.params;
    this.params5 = this.activatedRoute?.parent?.snapshot.parent?.params;

    this.submission_data = await this.submissionService.getSubmissionsById(
      +this.params.id
    );
    console.log(this.submission_data)
    this.initiative_data = this.submission_data.initiative;

    this.partners = await this.phasesService.getAssignedOrgs(
      this.submission_data.phase.id,
      this.initiative_data.id
    );
    if (this.partners.length < 1) {
      this.partners = await this.submissionService.getOrganizations();
    }

    this.InitData();
    this.period = this.submission_data.phase.periods;

    this.initiativeId = this.submission_data.initiative.id;
    this.officalCode = this.params.code;
    console.log(this.initiativeId);

  }

  ngOnDestroy(): void {
    this.socket.disconnect();
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

  finalPeriodValForPartner(partner_code: number,period_id: any) {
    return this.wps.map((wp: any) => 
      this.perValuesSammaryForPartner[partner_code][wp.ost_wp.wp_official_code][period_id]
    ).reduce((a: any, b: any) => a || b)
  }


  getTotalBudgetForEachPartner(budgets: string) {
    return  Object.values(budgets).reduce((a: any, b: any) => Number(a) + Number(b), 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");;
  }

  getTotalPercentageForEachPartner(percent: number) {
    return  Object.values(percent).reduce((a: any, b: any) => Number(a) + Number(b), 0) / this.wps.length
  }


  finalItemPeriodVal(wp_id: any, period_id: any) {
    let periods = this.allData[wp_id].map(
      (item: any) => this.perAllValues[wp_id][item.id][period_id]
    );
    if (periods.length) return periods.reduce((a: any, b: any) => a || b);
    else return false;
  }

  finalCenterItemPeriodVal(partner_code: any, wp_id: any, period_id: any) {
    let periods = this.allData[wp_id].map(
      (item: any) => this.perValues[partner_code][wp_id][item.id][period_id]
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
  checkEOI(category: any) {
    return this.submission_data.phase?.show_eoi ? category == "EOI" : false;
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
            // ||
            // d.category == 'INDICATOR' ||
            // d.category == "MELIA"
            ) &&
          (d.group == id ||
            d.wp_id == official_code ||
            (official_code == "CROSS" && this.checkEOI(d.category)))
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
          (official_code == "CROSS" && this.checkEOI(d.category))
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
}
