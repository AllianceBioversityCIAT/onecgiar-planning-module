import { Component, OnDestroy, OnInit } from "@angular/core";

import { SubmissionService } from "../services/submission.service";
import { AppSocket } from "../socket.service";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "../confirm/confirm.component";
import { CrossCuttingComponent } from "./cross-cutting/cross-cutting.component";
import { ViewDataComponent } from "./view-data/view-data.component";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { ToastrService } from "ngx-toastr";
import { ROLES } from "../components/new-team-member/new-team-member.component";
import { IpsrComponent } from "./ipsr/ipsr.component";
import { PhasesService } from "../services/phases.service";
import { HeaderService } from "../header.service";
import { DeleteConfirmDialogComponent } from "../delete-confirm-dialog/delete-confirm-dialog.component";
import { CenterStatusService } from "./center-status.service";
import { Meta, Title } from "@angular/platform-browser";
import { ConstantService } from "../services/constant.service";
import { InitiativesService } from "../services/initiatives.service";
import { filter, from, iif, of, switchMap, tap } from "rxjs";
import { RESOURCE_CACHE_PROVIDER } from "@angular/platform-browser-dynamic";
import { CustomMessageComponent } from "../custom-message/custom-message.component";
import { HistoryOfChangeComponent } from "./history-of-change/history-of-change.component";

@Component({
  selector: "app-submission",
  templateUrl: "./submission.component.html",
  styleUrls: ["./submission.component.scss"],
})
export class SubmissionComponent implements OnInit, OnDestroy {
  title = "planning";

  columnsToDisplay: string[] = ["name", "email"];
  constructor(
    private submissionService: SubmissionService,
    private phasesService: PhasesService,
    public socket: AppSocket,
    public dialog: MatDialog,
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private AuthService: AuthService,
    private toastrService: ToastrService,
    private headerService: HeaderService,
    private centerStatusService: CenterStatusService,
    private title2: Title,
    private meta: Meta,
    private constantsService: ConstantService,
    private initiativeService: InitiativesService,
    private toster: ToastrService,
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
  displayValues: any = {};
  summaryBudgets: any = {};
  summaryBudgetsTotal: any = {};
  summaryBudgetsAllTotal: any = 0;
  wp_budgets: any = {};
  budgetValues: any = {};
  displayBudgetValues: any = {};
  totals: any = {};
  errors: any = {};
  period: Array<any> = [];
  toggleValues: any = {};
  toggleSummaryValues: any = {};
  noValuesAssigned: any = {};
  partnersStatus: any = {};
  centerHasError: any = {};
  itemHasError: any = {};
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
  async changeCalc(partner_code: any, wp_id: any, item_id: any, item_title :string, type: string) { 
    if (this.timeCalc) clearTimeout(this.timeCalc);
    this.timeCalc = setTimeout(async () => {
      let percentValue;
      let budgetValue;
      let isActualValues = this.toggleValues[partner_code][wp_id];

      if (type == "percent") {
        if(isActualValues) {
          percentValue = Number(this.values[partner_code][wp_id][item_id]);
        } else {
          percentValue = Number(this.displayValues[partner_code][wp_id][item_id]);
        }
        budgetValue = this.budgetValue(
          percentValue,
          this.wp_budgets[partner_code][wp_id]
        );
      } else {
        budgetValue = isActualValues
          ? this.budgetValues[partner_code][wp_id][item_id]
          : this.displayBudgetValues[partner_code][wp_id][item_id];
        percentValue = this.percentValue(
          budgetValue,
          this.wp_budgets[partner_code][wp_id]
        );
      }
      this.values[partner_code][wp_id][item_id] = percentValue;
      this.displayValues[partner_code][wp_id][item_id] =
        Math.round(percentValue);
      this.budgetValues[partner_code][wp_id][item_id] = budgetValue;
      this.displayBudgetValues[partner_code][wp_id][item_id] =
        Math.round(budgetValue);

      const result = await this.submissionService.saveResultValue(
        this.params.id,
        {
          partner_code: partner_code,
          wp_id: wp_id,
          item_id: item_id,
          item_title: item_title,
          percent_value: percentValue,
          budget_value: budgetValue,
          no_budget: this.noValuesAssigned[partner_code][wp_id][item_id],
          phase_id: this.phase.id,
        }
      );
      if (result)
        this.socket.emit("setDataValue", {
          id: this.params.id,
          partner_code,
          wp_id,
          item_id,
          value: percentValue,
          no_budget: this.noValuesAssigned[partner_code][wp_id][item_id],
        });
      this.sammaryCalc();
      this.validateCenter(partner_code, false);
    }, 1000);
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );
    this.getInitStatus(this.initiative_data);
    // localStorage.setItem('initiatives', JSON.stringify(this.values));
  }

  budgetTime: any;
  async wpBudgetChange(partner_code: any, wp_id: any, budget: any) {
    if (this.budgetTime) clearTimeout(this.budgetTime);
    this.budgetTime = setTimeout(async () => {
      const result = await this.submissionService.saveWpBudget(this.params.id, {
        partner_code,
        wp_id,
        budget,
        phaseId: this.phase.id,
      });

      this.refreshValues(partner_code, wp_id);

      if (result)
        this.socket.emit("setDataBudget", {
          id: this.params.id,
          partner_code,
          wp_id,
          budget,
        });
      this.sammaryCalc();
      this.validateCenter(partner_code, false);
      this.initiative_data = await this.submissionService.getInitiative(
        this.params.id
      );
      this.getInitStatus(this.initiative_data);
    }, 1000);
  }

  percentValue(value: number, totalBudget: number) {
    return (value / totalBudget) * 100;
  }

  budgetValue(value: number, totalBudget: number) {
    return (value * totalBudget) / 100;
  }

  roundNumber(value: number) {
    return Math.round(value);
  }

  toggleActualValues(partner_code: any, wp_official_code: any) {
    this.toggleValues[partner_code][wp_official_code] =
      !this.toggleValues[partner_code][wp_official_code];
  }

  toggleSummaryActualValues(wp_official_code: any) {
    this.toggleSummaryValues[wp_official_code] =
      !this.toggleSummaryValues[wp_official_code];
  }

  async toggleNoValues(partner_code: any, wp_official_code: any, item_id: any, item_name: string) {
    this.values[partner_code][wp_official_code][item_id] = 0;
    this.displayValues[partner_code][wp_official_code][item_id] = 0;
    this.changeCalc(partner_code, wp_official_code, item_id, item_name, "percent");
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );
    this.getInitStatus(this.initiative_data);
  }

  refreshValues(partner_code: any, wp_id: any) {
    Object.keys(this.values[partner_code][wp_id]).forEach((item_id) => {
      let budgetValue = this.budgetValue(
        this.values[partner_code][wp_id][item_id],
        this.wp_budgets[partner_code][wp_id]
      );
      this.budgetValues[partner_code][wp_id][item_id] = budgetValue;
      this.displayBudgetValues[partner_code][wp_id][item_id] =
        Math.round(budgetValue);
    });
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

  perValues: any = {};
  perValuesSammary: any = {};
  perAllValues: any = {};
  sammaryTotal: any = {};
  sammaryTotalConsolidated: any = {};
  checkComplete(organization_code: number) {
    if (this.initiative_data.center_status) {
      return (
        this.initiative_data.center_status.filter(
          (d: any) =>
            d.organization_code == organization_code &&
            d.phase_id == this.phase.id
        )[0]?.status == 1
      );
    } else return false;
  }
  partnerStatusChange(event: any, partnerCode: number) {
    let index = 0;
    if (!this.isCenter) {
      index =
        this.partners
          .map((d: any) => {
            return d.id;
          })
          .indexOf(partnerCode) + 1;
    } else {
      index = this.partners
        .map((d: any) => {
          return d.id;
        })
        .indexOf(partnerCode);
    }
    this.InitData();
    this.selectedTabIndex = index;
  }

  tabChanged(organization: any) {
    this.partners.map((d: any) => {
      if (d.name == organization?.tab?.textLabel) this.organizationSelected = d;
    });
    this.updatePath(organization);
  }
  updatePath(tab: any) {
    this.router.navigate(
      [], // Remain on current route
      {
        relativeTo: this.activatedRoute,
        queryParams: {
          tab: tab.index,
        },
        queryParamsHandling: "merge", // Merge new params with existing params
      }
    );
  }
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
  async changeEnable(
    partner_code: any,
    wp_id: any,
    item_id: any,
    title: string,
    per_id: number,
    event: any
  ) {
    if (!!this.noValuesAssigned[partner_code][wp_id][item_id]) {
      this.noValuesAssigned[partner_code][wp_id][item_id] = 0;
    }
    this.changes(partner_code, wp_id, item_id, per_id, event.checked);
    const result = await this.submissionService.saveResultValues(
      this.params.id,
      {
        partner_code,
        wp_id,
        item_id,
        title,
        per_id,
        value: event.checked,
        phase_id: this.phase.id,
      }
    );
    if (
      !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
        true
      )
    ) {
      this.values[partner_code][wp_id][item_id] = 0;
      this.displayValues[partner_code][wp_id][item_id] = 0;
      this.changeCalc(partner_code, wp_id, item_id, title, "percent");
    }
    if (result)
      this.socket.emit("setDataValues", {
        id: this.params.id,
        partner_code,
        wp_id,
        item_id,
        per_id,
        value: event.checked,
      });
      this.initiative_data = await this.submissionService.getInitiative(
        this.params.id
      );
      this.getInitStatus(this.initiative_data);
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
      Object.keys(this.summaryBudgets[wp_id]).forEach((item_id) => {
        if (this.summaryBudgetsTotal[wp_id]) {
          this.sammary[wp_id][item_id] = this.percentValue(
            this.summaryBudgets[wp_id][item_id],
            this.summaryBudgetsTotal[wp_id]
          );
        }
      });
    });

    Object.keys(this.values).forEach((code) => {
      Object.keys(this.values[code]).forEach((wp_id) => {
        let total = 0;
        Object.keys(this.values[code][wp_id]).forEach((d) => {
          total += +this.values[code][wp_id][d];
        });
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
        if (totalWp[wp_id][item_id])
          this.sammaryTotal[wp_id] += totalWp[wp_id][item_id];
        this.sammaryTotalConsolidated[wp_id] = this.summaryBudgetsAllTotal
          ? (this.summaryBudgetsTotal[wp_id] / this.summaryBudgetsAllTotal) *
            100
          : 0;
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

  async refresh() {
    await this.InitData();
    this.selectedTabIndex = 0;
  }
  results: any;
  loading = true;
  params: any;
  ipsrs_data: any;
  initiative_data: any = {};
  ipsr_value_data: any;
  phase: any;

  async InitData() {
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
    this.noValuesAssigned = {};
    this.partnersStatus = {};
    this.centerHasError = {};
    this.itemHasError = {};



    //(all melia)
    // const melia_data = await this.submissionService.getMeliaByInitiative(
    //   this.params.id
    // );

    this.ipsrs_data = await this.submissionService.getIpsrs();
    this.ipsr_value_data = await this.submissionService.getIpsrByInitiative(
      this.initiative_data.id
    );
    this.ipsr_value_data.map((d: any) => {
      d["category"] = "IPSR";
      d["wp_id"] = "IPSR";
      return d;
    });
    const cross_data = await this.submissionService.getCrossByInitiative(
      this.params.id
    );
    cross_data.map((d: any) => {
      d["category"] = "Cross Cutting";
      d["wp_id"] = "CROSS";
      return d;
    });

    await this.submissionService.getToc(this.params.id).then(
      (data) => {
        this.results = data;
        this.results = [
          ...cross_data,
          // ...melia_data,
          ...this.ipsr_value_data,
          ...this.results,
          // ...indicators_data,
        ];
      },
      (error) => {
        this.dialog
        .open(CustomMessageComponent, {
          disableClose: true,
        })
        this.results = [
          ...cross_data,
          // ...melia_data,
          ...this.ipsr_value_data,
          // ...this.results,
          // ...indicators_data,
        ];
      }
    );
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );

    this.wp_budgets = await this.submissionService.getWpBudgets(
      this.params.id,
      this.phase.id
    );
    // const indicators_data = this.results
    //   .filter(
    //     (d: any) =>
    //       (d.category == 'OUTPUT' || d.category == 'OUTCOME') &&
    //       d.indicators.length
    //   )
    //   .map((d: any) => {
    //     return d.indicators.map((i: any) => {
    //       return {
    //         ...i,
    //         title: i.description,
    //         category: 'INDICATOR',
    //         group: d.group,
    //       };
    //     });
    //   })
    //   .flat(1);
   
    // melia_data.map((d: any) => {
    //   d["category"] = "MELIA";
    //   return d;
    // });

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
    // const partners_result = this.results
    //   .filter((d: any) => d.partners)
    //   .map((d: any) => d.partners)
    //   .flat(1);

    // this.results
    //   .filter((d: any) => d.responsible_organization)
    //   .map((d: any) => d.responsible_organization)
    //   .forEach((element: any) => {
    //     partners_result.push(element);
    //   });

    // this.partners = [
    //   ...new Map(
    //     partners_result.map((item: any) => [item['code'], item])
    //   ).values(),
    // ];
    for (let partner of this.partners) {
      this.partnersStatus[partner.code] = this.checkComplete(partner.code);
      if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
      if (!this.budgetValues[partner.code])
        this.budgetValues[partner.code] = {};
      if (!this.displayBudgetValues[partner.code])
        this.displayBudgetValues[partner.code] = {};
      if (!this.toggleValues[partner.code])
        this.toggleValues[partner.code] = {};
      if (!this.noValuesAssigned[partner.code])
        this.noValuesAssigned[partner.code] = {};
      if (!this.centerHasError[partner.code])
        this.centerHasError[partner.code] = false;
      if (!this.itemHasError[partner.code])
        this.itemHasError[partner.code] = {};

      for (let wp of this.wps) {
        if (!this.wp_budgets[partner.code][wp.ost_wp.wp_official_code])
          this.wp_budgets[partner.code][wp.ost_wp.wp_official_code] = null;
        if (!this.toggleValues[partner.code][wp.ost_wp.wp_official_code])
          this.toggleValues[partner.code][wp.ost_wp.wp_official_code] = false;
        if (!this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code] = {};
        if (!this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code] =
            {};
        if (!this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code])
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
          this.summaryBudgets[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;
        if (!this.itemHasError[partner.code][wp.ost_wp.wp_official_code])
          this.itemHasError[partner.code][wp.ost_wp.wp_official_code] = {};

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
          if (item.category != "OUTCOME") {
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
          }
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
            null;
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = false;
          this.itemHasError[partner.code][wp.ost_wp.wp_official_code][item.id] =
            false;
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
      console.log('wp =>', wp)

      this.allData[wp.ost_wp.wp_official_code] = await this.getDataForWp(
        wp.id,
        null,
        wp.ost_wp.wp_official_code
      );
    }
    this.savedValues = await this.submissionService.getSavedData(
      this.params.id,
      this.phase.id
    );

    this.setvalues(
      this.savedValues.values,
      this.savedValues.perValues,
      this.savedValues.no_budget
    );
    const tab = this.activatedRoute.snapshot.queryParamMap.get("tab");
    if (tab) this.selectedTabIndex = Number(tab);
    else this.selectedTabIndex = 0;
    this.title2.setTitle("Complete the PORB");
    this.meta.updateTag({
      name: "description",
      content: "Complete the PORB",
    });

    const newIPSR = this.allData["IPSR"]
      .filter((d: any) => d.value != "")
      .sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
    this.allData["IPSR"] = newIPSR;


    //sort (Cross Cutting)
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

    console.log('allData =>', this.allData)
  }
  savedValues: any = null;
  isCenter: boolean = false;
  selectedTabIndex: number = 0;
  canSubmit: any;
  InitiativeUsers: any;
  leaders: any[] = [];
  organizationSelected: any = "";
  initUser: any;
  async ngOnInit() {
    this.socket.on('disconnect', () => {
      this.dialog
      .open(CustomMessageComponent, {
        disableClose: true,
      })
    });

    this.socket.on('connect', () => {
      this.dialog.closeAll();
      this.InitData();
    });
    this.user = this.AuthService.getLoggedInUser();
    this.params = this.activatedRoute?.snapshot.params;
    this.phase = await this.phasesService.getActivePhase();
    this.InitiativeUsers = await this.initiativeService.getInitiativeUsers(
      this.params.id
    );
    this.InitiativeUsers.map((d: any) => {
      if (d.role == "Leader") this.leaders.push(d.user);
    });
    let partners: any = await this.phasesService.getAssignedOrgs(
      this.phase.id,
      this.params.id
    );
    if (partners.length < 1) {
      partners = await this.submissionService.getOrganizations();
    }
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );
    this.initUser = this.InitiativeUsers.filter(
      (d: any) => d?.user_id == this?.user?.id
    )[0];
    this.getInitStatus(this.initiative_data);
    const roles = this.initiative_data.roles.filter(
      (d: any) => d.user_id == this.user.id
    );
    if (roles.length) {
      this.isCenter = true;
      if (
        roles[0].role == ROLES.LEAD || 
        roles[0].role == ROLES.COORDINATOR ||
        roles[0].role == ROLES.CoLeader ||
        this.user.role == "admin"
      ) {
        this.partners = partners;
        this.isCenter = false;
      } else {
        if (roles[0].organizations.length) {
          this.partners = roles[0].organizations;
        } else {
          this.toastrService.error(
            "You are not assigned to this initiative, so please contact the leader to  give you access",
            "Access denied"
          );
          this.router.navigate(["denied"]);
        }
      }
    } else {
      if (this.user.role == "admin") this.partners = partners;
      else {
        this.router.navigate(["denied"]);
        return;
      }
    }
    this.activatedRoute?.url.subscribe((d) => {
      if (d[3] && d[3]?.path == "center") this.isCenter = true;
    });

    this.organizationSelected = this.partners[0];
    this.InitData();

    this.period = await this.submissionService.getPeriods(this.phase.id);
    this.socket.connect();
    this.socket.on("setDataValues-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, item_id, per_id, value } = data;
      this.changes(partner_code, wp_id, item_id, per_id, value);
    });
    this.socket.on("setDataValue-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, item_id, value, no_budget } = data;
      this.values[partner_code][wp_id][item_id] = value;
      this.displayValues[partner_code][wp_id][item_id] = Math.round(value);
      let budgetValue = this.budgetValue(
        value,
        this.wp_budgets[partner_code][wp_id]
      );
      this.budgetValues[partner_code][wp_id][item_id] = budgetValue;
      this.displayBudgetValues[partner_code][wp_id][item_id] =
        Math.round(budgetValue);
      this.noValuesAssigned[partner_code][wp_id][item_id] = no_budget;
      if (!this.isCenter) this.sammaryCalc();
    });
    this.socket.on("setDataBudget-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, budget } = data;
      this.wp_budgets[partner_code][wp_id] = budget;
      this.refreshValues(partner_code, wp_id);
    });
    this.socket.on("statusOfCenter", (data: any) => {
      if (this.params.id == data.initiative_id) {
        this.partnersStatus[data.organization_code] = !data.status;
      }
    });

    this.socket.on("submissionStatus", (data: any) => {
      this.initStatus = data.initStatus
      this.initiative_data = data.initiative_data;
    });

    this.socket.on("changeSubmissionStatus", async (data: any) => {
      this.initStatus = data.newSubmittionStatus.status
      this.initiative_data = await this.submissionService.getInitiative(
        this.params.id
      );
    });
    this.canSubmit = await this.constantsService.getSubmitStatus();
  }

  cancelLastSubmission() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Cancel submission",
          message: `Are you sure you want to Cancel submission ?`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        console.log(this.initiative_data);
        if (dialogResult == true) {
          await this.submissionService.cancelSubmission(
            this.initiative_data.latest_submission.id,
            { status: this.initiative_data.latest_submission.status,initiative_id: this.initiative_data.id }
          ).then(
            async () => {
              this.initiative_data = await this.submissionService.getInitiative(
                this.params.id
              );
              this.socket.emit('submissionStatus', {
                initStatus : "Draft",
                initiative_data: this.initiative_data
              });
              await this.InitData();
              this.toastrService.success("Submission is canceled");
              this.router.navigate([
                "initiative",
                this.initiative_data.id,
                this.initiative_data.official_code,
                "submited-versions",
              ]);
            }, (error) => {
              this.toster.error('Connection Error', undefined, { disableTimeOut: true });
            }
          );
        }
      });
  }

  initStatus: string;
  getInitStatus(init: any) {
    this.initStatus =
      init.last_submitted_at != null &&
      init.last_update_at == init.last_submitted_at
        ? init?.latest_submission
          ? init?.latest_submission?.status
          : "Draft"
        : "Draft";
  }

  ngOnDestroy(): void {
    this.socket.disconnect(); 
    this.dialog.closeAll();
  }

  setvalues(valuesToSet: any, perValuesToSet: any, noBudget: any) {
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
    if (noBudget != null)
      Object.keys(this.noValuesAssigned).forEach((code) => {
        Object.keys(this.noValuesAssigned[code]).forEach((wp_id) => {
          Object.keys(this.noValuesAssigned[code][wp_id]).forEach((item_id) => {
            if (
              noBudget[code] &&
              noBudget[code][wp_id] &&
              noBudget[code][wp_id][item_id]
            ) {
              this.noValuesAssigned[code][wp_id][item_id] =
                noBudget[code][wp_id][item_id];
            } else {
              this.noValuesAssigned[code][wp_id][item_id] = false;
            }
          });
        });
      });
    this.sammaryCalc();
    this.allvalueChange();
  }

  checkEOI(category: any) {
    return this.phase?.show_eoi ? category == "EOI" : false;
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
            this.checkEOI(d.category) ||
            d.category == "Cross Cutting" ||
            d.category == "IPSR") &&
          (d.group == id ||
            d.wp_id == official_code ||
            (official_code == "CROSS" && this.checkEOI(d.category)))
        );
      else
        return (
          ((d.category == "OUTPUT" ||
            d.category == "OUTCOME" ||
            this.checkEOI(d.category) ||
            d.category == "Cross Cutting" ||
            d.category == "IPSR") &&
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

  addCross() {
    const dialogRef = this.dialog.open(CrossCuttingComponent, {
      data: { id: "add", initiative_id: this.params.id },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.submissionService.newCross(result);
        await this.InitData();
        this.toastrService.success("Added successfully");
      }
    });
  }
  async editCross(id: number) {
    const dialogRef = this.dialog.open(CrossCuttingComponent, {
      data: await this.submissionService.getCrossById(id),
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.submissionService.updateCross(id, result);
        await this.InitData();
        this.toastrService.success("Edited successfully");
      }
    });
  }
  deleteCross(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Delete",
          message: `Are you sure you want to delete this Cross-cutting item?`,
          svg: `../../../../assets/shared-image/delete-user.png`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          let result = await this.submissionService.deleteCross(id);
          if (result) await this.InitData();
          this.toastrService.success("Deleted successfully");
        }
      });
  }

  // addMelia(wp: any, cross: boolean) {
  //   const dialogRef = this.dialog.open(MeliaComponent, {
  //     autoFocus: false,
  //     data: {
  //       id: "add",
  //       wp: wp,
  //       initiative_id: this.params.id,
  //       show_eoi: this.phase?.show_eoi,
  //       cross: cross,
  //     },
  //   });

  //   dialogRef.afterClosed().subscribe(async (result) => {
  //     if (result) {
  //       await this.submissionService.newMelia(result);
  //       await this.InitData();
  //       this.toastrService.success("Added successfully");
  //     }
  //   });
  // }

  async setIPSR(wp_official_code: any) {
    const dialogRef = this.dialog.open(IpsrComponent, {
      height: "70%",
      autoFocus: false,
      data: {
        wp_id: wp_official_code,
        initiative_id: this.params.id,
        ipsrs: this.ipsrs_data,
        values: await this.submissionService.getIpsrByInitiative(
          this.initiative_data.id
        ),
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.submissionService.saveIPSR(result);
        await this.InitData();
      }
    });
  }

  // async editMelia(id: number, wp: any) {
  //   const dialogRef = this.dialog.open(MeliaComponent, {
  //     height: '70%',
  //     autoFocus: false,
  //     data: {
  //       initiative_id: this.params.id,
  //       wp: wp,
  //       show_eoi: this.phase?.show_eoi,
  //       data: await this.submissionService.getMeliaById(id),
  //     },
  //   });

  //   dialogRef.afterClosed().subscribe(async (result) => {
  //     if (result) {
  //       await this.submissionService.updateMelia(id, result);
  //       await this.InitData();
  //       this.toastrService.success("Edited successfully");
  //     }
  //   });
  // }
  // async deleteMelia(id: number) {
  //   this.dialog
  //     .open(DeleteConfirmDialogComponent, {
  //       data: {
  //         title: "Delete",
  //         message: `Are you sure you want to delete this MELIA?`,
  //         svg: `../../../../assets/shared-image/delete-user.png`,
  //       },
  //     })
  //     .afterClosed()
  //     .subscribe(async (dialogResult) => {
  //       if (dialogResult == true) {
  //         let result = await this.submissionService.deleteMelia(id);
  //         if (result) await this.InitData();
  //         this.toastrService.success("Deleted successfully");
  //       }
  //     });
  // }

  // viewData(data: any) {
  //   this.dialog
  //     .open(ViewDataComponent, {
  //       maxWidth: "800px",
  //       data: { data, title: "View" },
  //     })
  //     .afterClosed()
  //     .subscribe(async (dialogResult) => {});
  // }

  async submit() {
    let messages = "Are you sure you want to submit?";
    let incompleteCenters = this.incompleteCenters().sort();
    if (incompleteCenters.length) {
      messages = incompleteCenters.length > 1 ? "Centers" : "Center(s)";
      messages += "  are incomplete:";
    }
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Submit",
          message2: messages,
          f: incompleteCenters,
          k: `Are you sure you want to submit?`,
          svg: `../../assets/shared-image/apply.png`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          if (this.validate()) {
            this.loading = true;
            await this.submissionService.submit(this.params.id, {
              phase_id: this.phase.id,
            }).then(
              async (data) => {
                this.initiative_data = await this.submissionService.getInitiative(
                    this.params.id
                  );
                  this.socket.emit('submissionStatus', {
                    initStatus : "Pending",
                    initiative_data: this.initiative_data
                  });

                  this.toastrService.success("Data Submitted successfully");
                  this.router.navigate([
                    "initiative",
                    this.initiative_data.id,
                    this.initiative_data.official_code,
                    "submited-versions",
                  ]);
              }, (error) => {
                  this.toster.error('Connection Error', undefined, { disableTimeOut: true });
              }
            );
            this.loading = false;
          }
        }
      });
  }

  incompleteCenters() {
    let incompleteCenters: any = [];
    this.partners.forEach((partner: any) => {
      if (!this.partnersStatus[partner.code]) {
        incompleteCenters.push(partner.acronym);
      }
    });
    return incompleteCenters;
  }

  validate() {
    let valid = true;
    let message = "";
    Object.keys(this.partnersData).forEach((partner_code) => {
      let result = this.validateCenter(partner_code, false);
      if (!result.valid) {
        valid = result.valid;
        message = result.message;
      }
    });
    if (!valid) {
      this.toastrService.error(message, "Submission failed");
    }
    return valid;
  }

  validateCenter(partner_code: any, is_mark = false) {
    let valid = true;
    let message = "";
    Object.keys(this.partnersData[partner_code]).forEach((wp_id) => {
      let result = this.validateWp(partner_code, wp_id);
      if (!result.valid) {
        valid = result.valid;
        message = result.message;
      }
    });
    if (is_mark) {
      if (!valid) this.toastrService.error(message, "Complete failed");
      this.centerStatusService.validPartner.next(valid);
    }
    this.centerHasError[partner_code] = !valid;
    return {
      valid: valid,
      message: message,
    };
  }

  validateWp(partner_code: any, wp_id: any) {
    let valid = true;
    let wpChecked = false;
    let message = "";
    if (!this.partnersData[partner_code][wp_id]) {
      return {
        valid: valid,
        message: message,
      };
    }
    this.partnersData[partner_code][wp_id].forEach((item: any) => {
      if (item.category != "EOI" && item.category != "OUTCOME") {
        let perChecked = Object.values(
          this.perValues[partner_code][wp_id][item.id]
        ).reduce((a: any, b: any) => a || b);
        if (
          perChecked &&
          !+this.values[partner_code][wp_id][item.id] &&
          !this.noValuesAssigned[partner_code][wp_id][item.id]
        ) {
          valid = false;
          this.itemHasError[partner_code][wp_id][item.id] = true;
        } else {
          this.itemHasError[partner_code][wp_id][item.id] = false;
        }
        if (perChecked) wpChecked = true;
      }
    });

    this.errors[partner_code][wp_id] = null;
    if (
      this.totals[partner_code][wp_id] == 0 &&
      this.wp_budgets[partner_code][wp_id]
    ) {
      valid = false;
      this.errors[partner_code][wp_id] =
        "There is a work package with a budget not disaggregated";
      message = "There is a work package with a budget not disaggregated";
    } else if (
      wpChecked &&
      Math.round(this.totals[partner_code][wp_id]) != 100
    ) {
      valid = false;
      if (this.totals[partner_code][wp_id] > 100)
        this.toggleValues[partner_code][wp_id] = true;
      this.errors[partner_code][wp_id] =
        "Subtotal percentage should equal 100%";
      message = "The subtotal of all percentages should equal 100%";
    } else if (
      this.totals[partner_code][wp_id] > 0 &&
      !+this.wp_budgets[partner_code][wp_id]
    ) {
      valid = false;
      this.errors[partner_code][wp_id] =
        "There is a work package without a total budget assigned";
      message = "There is a work package without a total budget assigned";
    } else if (!valid) {
      this.errors[partner_code][wp_id] =
        "There is a checked item(s) but not budgeted";
      message = "There is a checked item(s) but not budgeted";
    }
    return {
      valid: valid,
      message: message,
    };
  }
  async excel() {
    await this.submissionService.excelCurrent(this.params.id);
  }

  async excelCenters() {
    await this.submissionService.excelCurrentForCenter(
      this.params.id,
      this.organizationSelected
    );
  }


  openHistoryDialog(initiative_id: number) {
    this.dialog
    .open(HistoryOfChangeComponent, {
      width: '600px',
      maxWidth: '700px',
      maxHeight: '500px',
      data: {
        initiative_id: initiative_id
      },
    })
  }
}
