import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";

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
import { UserService } from "../services/user.service";
import { QualitativeIndicatorsComponent } from "./qualitative-indicators/qualitative-indicators.component";
import * as moment from 'moment';
import { BudgetAssumptionsComponent } from "./budget-assumptions/budget-assumptions.component";
import { BudgetAssumptionSummaryComponent } from "./budget-assumption-summary/budget-assumption-summary.component";
import { BudgetAssumptionsService } from "../services/budget-assumptions.service";
import { AnaplanService } from "../services/anaplan.service";
import { ClarisaCountryService } from "../services/clarisa-country.service";

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
    private userService: UserService,
    private budgetAssumptionsService: BudgetAssumptionsService,
    private anaplanService: AnaplanService,
    private countryService: ClarisaCountryService
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

  clarisaCountries: any[] = [];
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
  summaryBudgetsIndicator: any = {};
  totalTargetsIndicator: any = {};
  totalTargetsIndicatorPartners: any = {};

  summaryBudgetsTotal: any = {};
  summaryBudgetsAllTotal: any = 0;
  summaryBudgetsProjectsTotal: any = 0;
  summaryBudgetsPartnerTotal: any = 0;
  summaryBudgetsMeliaTotal: any = 0;

  wp_budgets: any = {};
  anaplanBudgets: any = {};
  budgetValues: any = {};
  displayBudgetValues: any = {};
  displayBudgetValuesItemIndicator: any = {};

  displayBudgetValuesIndicator: any = {};
  budgetValuesIndicatorPartner: any = {};
  totalBudgetValuesIndicatorPartner: any = {};
  budgetValuesIndicatorSummary: any = {};
  totalBudgetValuesIndicatorSummary: any = {};

  totals: any = {};
  errors: any = {};
  period: Array<any> = [];
  indicatorTypes: Array<any> = [];
  highLevelOutputIndicatorTypes: Array<any> = [];
  outcomeIndicatorTypes: Array<any> = [];
  toggleValues: any = {};
  toggleSummaryValues: any = {};
  noValuesAssigned: any = {};
  partnersStatus: any = {};
  partnersValidate: any = {};
  centerHasError: any = {};
  itemHasError: any = {};
  tocSubmissionData: any;
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
  checkForOutput(values: any, code: string, id: number, item: any) {
    if (!values[code]) {
      values[code] = {};
      this.totals[code] = {};
      this.errors[code] = {};
    }
  
    if (!values[code][id]) {
      values[code][id] = {};
      this.totals[code][id] = 0;
      this.errors[code][id] = null;
    }
  
    if (!values[code][id][item.id]) {
      values[code][id][item.id] = {};
    }
  
    for (let indicator of item.quantitative_indicators) {
      if (!values[code][id][item.id][indicator.id]) {

        values[code][id][item.id][indicator.id] = 0;
      }
    }
    return true;
  }
  
  calclate(code: any, id: any) {
    if (this.totals[code] && this.totals[code][id])
      return this.totals[code][id];
  }

  getTotalBudgetForEachPartner(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
      .filter(([key]) => 
        !key.includes('-project')
      )
      .reduce((sum, [, value]) => sum + Number(value || 0), 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  
  getTotalBudgetForEachPartnerProject(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-project"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerPartner(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-partners"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerMelia(budgets: { [key: string]: any }) {
    return Object.entries(budgets)
    .filter(([key]) => key.includes("-melia"))
    .reduce((sum, [_, value]) => sum + Number(value), 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalPercentageForEachPartner(budgets: any) {
    const totalBudgets: any = Object.values(budgets).reduce((a: any, b: any) => Number(a) + Number(b))
    return totalBudgets / totalBudgets * 100 
  }

  getPercentageForeachPartnerWp(total:any, wpTotal: number) {
    const totalBudgets: any = Object.values(total).reduce((a: any, b: any) => Number(a) + Number(b))
    return (wpTotal / totalBudgets * 100); 
  }
  
  timeCalc: any;
  async changeCalc(partner_code: any, wp_id: any, item_id: any, item_title: string, type: string, fromCheck: boolean, item_type: string | null = null, socket: boolean) {
    if (this.timeCalc) clearTimeout(this.timeCalc);
    this.timeCalc = setTimeout(async () => {
      let percentValue = 0;
      let budgetValue = 0;
      let isActualValues = this.toggleValues[partner_code][wp_id];
      let budget = 0;
      // if (type == "percent") {
      //   if (isActualValues) {
      //     percentValue = Number(this.values[partner_code][wp_id][item_id]);
      //   } else {
      //     percentValue = Number(this.displayValues[partner_code][wp_id][item_id]);
      //   }
      //   budgetValue = this.budgetValue(
      //     percentValue,
      //     this.wp_budgets[partner_code][wp_id]
      //   );
      // } else {
        budgetValue = isActualValues
          ? Number(this.budgetValues[partner_code][wp_id][item_id])
          : Number(this.displayBudgetValues[partner_code][wp_id][item_id]);
        Object.values(this.displayBudgetValues[partner_code][wp_id]).forEach(val => {
          if (typeof val === "number") {
            budget += val;

          } 
        });
        this.wp_budgets[partner_code][wp_id] = budget;

        percentValue = this.percentValue(
          budgetValue,
          this.wp_budgets[partner_code][wp_id]
        );
      // }
      this.values[partner_code][wp_id][item_id] = percentValue;
      this.displayValues[partner_code][wp_id][item_id] =
        Math.round(percentValue);
      this.budgetValues[partner_code][wp_id][item_id] = budgetValue;
      this.displayBudgetValues[partner_code][wp_id][item_id] =
        Math.round(budgetValue);
      
      if(percentValue == 0 && !fromCheck)
        this.haveTrue[partner_code][wp_id][item_id] = true;

      const result2 = await this.submissionService.saveWpBudget(this.params.id, {
        partner_code,
        wp_id,
        budget,
        phaseId: this.phase.id,
      });
      if (result2)
        this.socket.emit("setDataBudget", {
          id: this.params.id,
          partner_code,
          wp_id,
          budget,
        });
      const result = await this.submissionService.saveResultValue(
        this.params.id,
        {
          partner_code: partner_code,
          wp_id: wp_id,
          item_id: item_id,
          item_title: item_title,
          percent_value: !percentValue ? 0 : percentValue,
          budget_value: budgetValue,
          no_budget: this.noValuesAssigned[partner_code][wp_id][item_id],
          phase_id: this.phase.id,
          type: item_type
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
    }, 1250); 
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );
    this.getInitStatus(this.initiative_data);
    // localStorage.setItem('initiatives', JSON.stringify(this.values));
  } 

  async changeCalcForIndicator(partner_code: any, wp_id: any, item_id: any, item_title: string, indicator_id: number, item_type: string, parent_title: string, indicator_type: string) {
    if (this.timeCalc) clearTimeout(this.timeCalc);
    this.timeCalc = setTimeout(async () => {
      let percentValue = 0;
      let budgetValue;
      let subTotalBudgetIndicator = 0;
      let totalWpBudget = 0;

      
     
        budgetValue = this.displayBudgetValuesIndicator[partner_code][wp_id][item_id][indicator_id];
       
        
        Object.values(this.displayBudgetValuesIndicator[partner_code][wp_id][item_id]).forEach(val => {
          if (typeof val === "number") {
            subTotalBudgetIndicator += val;
          } 
        });
        this.displayBudgetValuesItemIndicator[partner_code][wp_id][item_id] = subTotalBudgetIndicator;
        
        Object.values(this.displayBudgetValuesItemIndicator[partner_code][wp_id]).forEach(val => {
          if (typeof val === "number") {
            totalWpBudget += val;
          } 
        });
        this.wp_budgets[partner_code][wp_id] = totalWpBudget;

        const result = await this.submissionService.saveResultValue(
        this.params.id,
        {
          partner_code: partner_code,
          wp_id: wp_id,
          item_id: indicator_id,
          item_title: item_title,
          percent_value: percentValue,
          budget_value: budgetValue,
          no_budget: this.noValuesAssigned[partner_code][wp_id][item_id],
          phase_id: this.phase.id,
          type: item_type,
          parent_id: item_id,
          indicator_type: indicator_type == 'custom' ? 'custom-OUTPUT' : indicator_type
        }
      );
      if (result) {
        this.socket.emit("setDataValueForIndicator", {
          id: this.params.id,
          partner_code,
          wp_id,
          item_id,
          indicator_id,
          budgetValue,
          subTotalBudgetIndicator
        });
      }
    }, 1250); 
  } 

  budgetTime: any;
  async wpBudgetChange(partner_code: any, wp_id: any, budget: any, refresh: boolean) {
    if (this.budgetTime) clearTimeout(this.budgetTime);
    this.budgetTime = setTimeout(async () => {
      const result = await this.submissionService.saveWpBudget(this.params.id, {
        partner_code,
        wp_id,
        budget,
        phaseId: this.phase.id,
      });

      // this.refreshValues(partner_code, wp_id);

      if (result)
        this.socket.emit("setDataBudget", {
          id: this.params.id,
          partner_code,
          wp_id,
          budget,
        });
        if(refresh){
          this.sammaryCalc();
          this.validateCenter(partner_code, false);
          this.initiative_data = await this.submissionService.getInitiative(
            this.params.id
          );
          this.getInitStatus(this.initiative_data);
        }
    }, 1000);
  }

  percentValue(value: number, totalBudget: number) {
    return Number((value / totalBudget) * 100);
  }

  budgetValue(value: number, totalBudget: number) {
    return (value * totalBudget) / 100;
  }

  roundNumber(value: number) {
    return Math.round(value);
  }
  roundNumbers(values: number[]): number {
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return Math.round(sum);
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
    // this.changeCalc(partner_code, wp_official_code, item_id, item_name, "percent", true);
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
    return this.actualWps
      .map(
        (wp: any) =>
          this.perValuesSammary[wp.ost_wp.wp_official_code][period_id]
      )
      .reduce((a: any, b: any) => a || b);
  }

  finalPeriodValForPartner(partner_code: number,period_id: any) {
      return this.actualWps.map((wp: any) => 
        this.perValuesSammaryForPartner[partner_code][wp.ost_wp.wp_official_code][period_id]
      ).reduce((a: any, b: any) => a || b)
  }

  finalItemPeriodVal(wp_id: any, period_id: any) { 
    let periods = this.allData[wp_id].map(
      (item: any) => this.perAllValues[wp_id][item.id][period_id]
    );
    if (periods.length) return periods.reduce((a: any, b: any) => a || b);
    else return false;
  } 

  perValues: any = {};
  haveTrue: any = {};
  perValuesSammary: any = {};
  perValuesSammaryForPartner: any = {};
  perAllValues: any = {};
  perAllValuesIndicator: any = {};

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

  checkValidateCenter(organization_code: number) {
    if (this.initiative_data.center_status) {
      return (
        this.initiative_data.center_status.filter(
          (d: any) =>
            d.organization_code == organization_code &&
            d.phase_id == this.phase.id
        )[0]?.is_valid == 1
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
          AOW: this.selectedTabIndexAOW,
        },
        queryParamsHandling: "merge", // Merge new params with existing params
      }
    );
  }
  tabChangedAOW(aow: any) {
    this.updateChildPath(aow.index);
  }
  updateChildPath(index: any) {
    this.selectedTabIndexAOW = index;
    this.router.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: {
          AOW: index,
        },
        queryParamsHandling: "merge",
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
    category: string,
    event: any
  ) {
    if (
      !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
        true
      )
    ) {
      if (!!this.noValuesAssigned[partner_code][wp_id][item_id]) {
        this.noValuesAssigned[partner_code][wp_id][item_id] = 0;
      }
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
        is_project: category == "Project" ? true : false
      }
    );
    if (
      !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
        true
      )
    ) {
      this.values[partner_code][wp_id][item_id] = 0;
      this.displayValues[partner_code][wp_id][item_id] = 0;
      // this.changeCalc(partner_code, wp_id, item_id, title, "percent", true);
    }
    if(Object.values(this.perValues[partner_code][wp_id][item_id]).filter(item => item).length === 1 && (this.values[partner_code][wp_id][item_id] == 0 && this.displayValues[partner_code][wp_id][item_id] == 0)){
      this.values[partner_code][wp_id][item_id] = null;
      this.displayValues[partner_code][wp_id][item_id] = null;
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

  async checkAll(
    partner_code: any,
    wp_id: any,
    value: boolean,
    is_project: boolean
  ) {
    console.log(partner_code, wp_id, value)
    if(!value) {
      this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Cancel submission",
          custom_message_1: `Are you sure to clear all data ?`,
          custom_message_2: `All the data you added will be removed.`,
        },
      })
      .afterClosed()
      .subscribe(dialogResult => {
        if (dialogResult == true) {
          this.doCheck(partner_code, wp_id, value, is_project);
        }
      });
    } else {
      this.doCheck(partner_code, wp_id, value, is_project);
    }
  }

  async doCheck(partner_code: any, wp_id: any, value: boolean, is_project: boolean) {
    const itemsIds = Object.keys(this.perValues[partner_code][wp_id]);
    for (let item_id of itemsIds) {
      if (
        !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
          true
        )
      ) {
        if (!!this.noValuesAssigned[partner_code][wp_id][item_id]) {
          this.noValuesAssigned[partner_code][wp_id][item_id] = 0;
        }
      }
      for (let period of this.period) {
        this.changes(partner_code, wp_id, item_id, period.id, value);
      }


      if (
        !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
          true
        )
      ) {
        this.values[partner_code][wp_id][item_id] = 0;
        this.displayValues[partner_code][wp_id][item_id] = 0;
        this.noValuesAssigned[partner_code][wp_id][item_id] = false;
        this.haveTrue[partner_code][wp_id][item_id] = false;
      } else if(!Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
        false
      )) {
        if(!this.values[partner_code][wp_id][item_id] && !this.displayValues[partner_code][wp_id][item_id]) {
          this.values[partner_code][wp_id][item_id] = null;
          this.displayValues[partner_code][wp_id][item_id] = null;
        }
      }
      if(value == true) {
        if(!this.values[partner_code][wp_id][item_id] && !this.displayValues[partner_code][wp_id][item_id]) {
          this.values[partner_code][wp_id][item_id] = null;
          this.displayValues[partner_code][wp_id][item_id] = null;
        }
      } else {
        this.values[partner_code][wp_id][item_id] = 0;
        this.displayValues[partner_code][wp_id][item_id] = 0;
      }
    }


    const result = await this.submissionService.saveAllResultValues(
      this.params.id,
      {
        partner_code,
        wp_id,
        title: value ? 'Checked all periods' : 'Unchecked all periods',
        value: value,
        phase_id: this.phase.id,
        itemsIds: itemsIds,
        is_project: is_project
      }
    );

    if (result)
      this.socket.emit("setAllDataValues", {
        id: this.params.id,
        partner_code,
        wp_id,
        itemsIds,
        period: this.period,
        value: value,
      });

    if (result && !value)
      this.socket.emit("setDataValueForAll", {
        id: this.params.id,
        partner_code,
        wp_id,
        itemsIds,
        value: 0,
        no_budget: false,
      });
    
    this.validateCenter(partner_code, false);
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
    Object.keys(this.summaryBudgets).forEach((wp_id) => {
      Object.keys(this.summaryBudgets[wp_id]).forEach((item_id) => {
        if (this.summaryBudgetsTotal[wp_id]) {
          this.sammary[wp_id][item_id] = 0
        }
      });
    });
    this.summaryBudgets = {};
    this.summaryBudgetsTotal = {};
    this.summaryBudgetsIndicator = {};

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

    Object.keys(this.displayBudgetValuesIndicator).forEach((partner_code) => {
      Object.keys(this.displayBudgetValuesIndicator[partner_code]).forEach((wp_id) => {
        if (!this.summaryBudgetsIndicator[wp_id]) {
          this.summaryBudgetsIndicator[wp_id] = {};
        }
    
        Object.keys(this.displayBudgetValuesIndicator[partner_code][wp_id]).forEach((item_id) => {
          if (!this.summaryBudgetsIndicator[wp_id][item_id]) {
            this.summaryBudgetsIndicator[wp_id][item_id] = {};
          }
    
          Object.keys(this.displayBudgetValuesIndicator[partner_code][wp_id][item_id]).forEach((indicator_id) => {
            if (this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] == null) {
              this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] = 0;
            }
    
            const raw = this.displayBudgetValuesIndicator[partner_code][wp_id][item_id][indicator_id];
            const value = Number(raw) || 0;
    
            this.summaryBudgetsIndicator[wp_id][item_id][indicator_id] += value;
          });
        });
      });
    });



    this.summaryBudgetsProjectsTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-project'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsPartnerTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-partners'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsMeliaTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key, _]) => key.includes('-melia'))
    .reduce((sum, [_, value]: any) => sum + value, 0);

    this.summaryBudgetsAllTotal = Object.entries(this.summaryBudgetsTotal)
    .filter(([key]) => 
      !key.includes('-project')
    )
    .reduce((sum, [, value]: any) => sum + value, 0);
  
    // console.log(this.summaryBudgetsTotal)

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
        if (totalWp[wp_id])
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
      if(this.allData[wp.ost_wp.wp_official_code]) {
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

    }

    for (let wp of this.wps) {
      // if(wp.category == 'WP' || wp.category == 'Projects')
      if(wp.category == 'WP')
        if(this.allData[wp.ost_wp.wp_official_code]) {
          this.allData[wp.ost_wp.wp_official_code].forEach((item: any) => {
            this.highLevelOutputIndicatorTypes.forEach((type) => {
              if (!this.perAllValuesIndicator[wp.ost_wp.wp_official_code])
                this.perAllValuesIndicator[wp.ost_wp.wp_official_code] = {};
              if (!this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id])
                this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id] = {};
              this.perAllValuesIndicator[wp.ost_wp.wp_official_code][item.id][type] =
                0;
            });
          });
        }

    }
    console.log(this.perAllValuesIndicator)

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
  actualWps:any;
  tocIncompleteData: boolean = false;
  partnersMelia:any;
  partnersProject:any;
  partnersProjectMelia:any;
  async InitData() {
    this.loading = true;
    this.wpsTotalSum = 0;
    this.perValues = {};
    this.haveTrue = {};
    this.perValuesSammary = {};
    this.perValuesSammaryForPartner = {};

    this.perAllValues = {};
    this.sammaryTotal = {};
    this.sammaryTotalConsolidated = {};
    this.data = [];
    this.wps = [];
    this.actualWps = [];
    this.partnersData = {};
    this.sammary = {};
    this.summaryBudgets = {};
    this.summaryBudgetsIndicator = {};
    this.totalTargetsIndicator = {};
    this.totalTargetsIndicatorPartners = {};

    this.summaryBudgetsTotal = {};
    this.wp_budgets = {};
    this.toggleValues = {};
    this.budgetValues = {};
    this.budgetValues = {};
    this.displayBudgetValues = {};
    this.displayBudgetValuesItemIndicator = {};

    this.displayBudgetValuesIndicator = {};
    this.budgetValuesIndicatorPartner = {};
    this.budgetValuesIndicatorSummary = {};
    this.allData = {};
    this.values = {};
    this.displayValues = {};
    this.totals = {};
    this.errors = {};
    this.noValuesAssigned = {};
    this.partnersStatus = {};
    this.partnersValidate = {};
    this.centerHasError = {};
    this.itemHasError = {};

    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );

    if(!this.initiative_data.synchronized){
        this.ipsrs_data = await this.submissionService.getIpsrs();
        this.ipsr_value_data = await this.submissionService.getIpsrByInitiative(
          this.initiative_data.id
        );
        this.ipsr_value_data.map((d: any) => {
          d["category"] = "IPSR";
          d["wp_id"] = "IPSR";
          return d;
        });
    }

    this.partnersProjectMelia = await this.submissionService.getActualTocData(
      this.params.code
    );

    this.partnersMelia = this.partnersProjectMelia.melias;
    this.partnersProject = this.partnersProjectMelia.projects;

 
      const cross_data = await this.submissionService.getCrossByInitiative(
        this.params.id
      );
      cross_data.map((d: any) => {
        d["category"] = "Cross Cutting";
        d["wp_id"] = "CROSS";
        return d;
      });
 
    await this.submissionService.getToc(this.initiative_data.synchronized == true ? this.params.code : this.params.id).then(
      (data) => {
        if(!data)
          this.tocIncompleteData = true
        else
          this.results = data;
          if(!this.initiative_data.synchronized)
            this.results = [
              ...cross_data,
              ...this.ipsr_value_data,
              ...this?.results,
            ];
          else
            this.results = [
              ...cross_data,
              ...this?.results,
            ];
      console.log(data)

      },
      (error) => {
        this.dialog
          .open(CustomMessageComponent, {
            disableClose: true,
          })
        this.results = [
          ...cross_data,
          ...this.ipsr_value_data,
        ];
      }
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
          if(!d.ost_wp?.acronym || !d.ost_wp?.name)
            this.tocIncompleteData = true;
          else
            d.title = d.ost_wp.acronym + ": " + d.ost_wp.name;
        return d.category == "WP" && !d.group;
      })
      .sort((a: any, b: any) => a.title.localeCompare(b.title));
      const isCrosscuttingAndManagementValid = this.wps.some((wp: any) => wp.ost_wp?.acronym == "AOW00");
      
      if(!isCrosscuttingAndManagementValid && this.initiative_data.synchronized) {
        this.wps.unshift({
          id: "CROSS",
          title: "AOW00: Cross-Cutting and Management",
          category: "WP",
          ost_wp: { wp_official_code: "CROSS", acronym: "AOW00" },
        });
      } else {
        const wpToUpdate = this.wps.find(
          (wp: any) => wp.ost_wp?.acronym === "AOW00"
        );
        if (wpToUpdate) {
          wpToUpdate.ost_wp.wp_official_code = "CROSS";
        }
      }
      this.actualWps = this.wps;
      if(!this.initiative_data.synchronized)
        this.wps.unshift({
          id: "CROSS",
          title: "Cross Cutting",
          category: "Cross Cutting",
          ost_wp: { wp_official_code: "CROSS" },
        });

    if(!this.initiative_data.synchronized)
      this.wps.push({
        id: "IPSR",
        title: "Innovation Packages & Scaling Readiness (IPSR)",
        category: "IPSR",
        ost_wp: { wp_official_code: "IPSR" },
      });
      let melias = [];
      if(this.initiative_data.synchronized){
        for (let wp of this.wps) {
          melias.push({
            id: wp.id, // actual wp id 
            title: wp.ost_wp.wp_official_code + '-melia',
            category: "melia",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-melia', acronym: wp.ost_wp.wp_official_code },
          });
        }
      }
      let crossCutting = [];
      if(this.initiative_data.synchronized){
        for (let wp of this.wps) {
          crossCutting.push({
            id: 'Cross-Cutting', 
            title: wp.ost_wp.wp_official_code + '-Cross-Cutting',
            category: "Cross Cutting",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-Cross-Cutting' },
          });
        }
      }
      let w3Projects = [];
      if(this.initiative_data.synchronized){
        for (let wp of this.wps) {
          w3Projects.push({
            id: wp.id, // actual wp id 
            title: wp.ost_wp.wp_official_code + '-project',
            category: "Projects",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + '-project' },
          });
        }
      }
      let geographicScope = [];
      if(this.initiative_data.synchronized){
        
        for (let wp of this.wps) {
          geographicScope.push({
            id: wp.id,
            title: wp.ost_wp.wp_official_code + "-Geographic Scope",
            category: "Geographic-Scope",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-Geographic-Scope" },
          });
        }
      }

      let partners = [];
      if(this.initiative_data.synchronized){
        
        for (let wp of this.wps) {
          partners.push({
            id: wp.id,
            title: wp.ost_wp.wp_official_code + "-partners",
            category: "partners",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-partners" },
          });
        }
      }
  
      this.wps = [...this.wps, ... melias, ...crossCutting, ...w3Projects ,...geographicScope, ...partners];


    this.anaplanLabels = await this.anaplanService.getAll();
      
    for (let partner of this.partners) {
      this.partnersStatus[partner.code] = this.checkComplete(partner.code);
      this.partnersValidate[partner.code] = this.checkValidateCenter(partner.code);
      if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
      if (!this.budgetValues[partner.code])
        this.budgetValues[partner.code] = {};
      if (!this.anaplanBudgets[partner.code]) {
        this.anaplanBudgets[partner.code] = {};
      }
      if (!this.displayBudgetValues[partner.code])
        this.displayBudgetValues[partner.code] = {};
      if (!this.displayBudgetValuesItemIndicator[partner.code])
        this.displayBudgetValuesItemIndicator[partner.code] = {};
      if (!this.displayBudgetValuesIndicator[partner.code])
        this.displayBudgetValuesIndicator[partner.code] = {};
      if (!this.budgetValuesIndicatorPartner[partner.code])
        this.budgetValuesIndicatorPartner[partner.code] = {};
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
        if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code]) {
          this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code] = {};
        }
        if (!this.toggleValues[partner.code][wp.ost_wp.wp_official_code])
          this.toggleValues[partner.code][wp.ost_wp.wp_official_code] = false;
        if (!this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code] = {};
        if (!this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code] =
            {};
        if (!this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code] =
            {};
        if (!this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code])
          this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code] =
            {};
        if (!this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code])
          this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code] = {};
        for(let type of this.highLevelOutputIndicatorTypes) {
          if (!this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code][type])
            this.budgetValuesIndicatorPartner[partner.code][wp.ost_wp.wp_official_code] = 0;
        }
        if (!this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code])
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
          this.summaryBudgets[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code])
          this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;
        if (!this.itemHasError[partner.code][wp.ost_wp.wp_official_code])
          this.itemHasError[partner.code][wp.ost_wp.wp_official_code] = {};

        const result = await this.getDataForWp(
          wp.id,
          partner.code,
          wp.ost_wp.wp_official_code,
          wp.ost_wp.acronym,
          wp.category
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

        if (!this.perValuesSammaryForPartner[partner.code])
          this.perValuesSammaryForPartner[partner.code] = {};
        if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code])
          this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code] = {};
        this.period.forEach((element) => {
          if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id] =
              false;
        });

        this.anaplanLabels.forEach((element) => {
          if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id] =
              0;
        });
        result.forEach((item: any) => {
          if (item.category !== "OUTCOME" && item.category !== "OUTPUT") {
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
          } else if(item.category === "OUTCOME" && !item.group) {
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
          else if(item.category === "OUTPUT") {
            this.checkForOutput(
              this.values,
              partner.code,
              wp.ost_wp.wp_official_code,
              item
            );
            this.checkForOutput(
              this.displayValues,
              partner.code,
              wp.ost_wp.wp_official_code,
              item
            );
          }
          this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
            null;
          this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          this.displayBudgetValuesItemIndicator[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = null;
          if(item.category == 'OUTPUT'){
            this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code][
              item.id
            ] = {};
            for(let indicator of item.quantitative_indicators) {
              this.displayBudgetValuesIndicator[partner.code][wp.ost_wp.wp_official_code][item.id][indicator.id] = null;
            }
          }
          this.noValuesAssigned[partner.code][wp.ost_wp.wp_official_code][
            item.id
          ] = false;
          this.itemHasError[partner.code][wp.ost_wp.wp_official_code][item.id] =
            false;
          if (!this.summaryBudgets[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgets[wp.ost_wp.wp_official_code][item.id] = 0;
          if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id])
            this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id] = {};
          if (item.category === 'OUTPUT') {
            for (let indicator of item.quantitative_indicators) {
              if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id][indicator.id]) {
                this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code][item.id][indicator.id] = 0;
              }
            }
          }
          if (!this.perValues[partner.code]) this.perValues[partner.code] = {};
          if (!this.haveTrue[partner.code]) this.haveTrue[partner.code] = {};
          if (!this.perValues[partner.code][wp.ost_wp.wp_official_code])
            this.perValues[partner.code][wp.ost_wp.wp_official_code] = {};
          if (!this.haveTrue[partner.code][wp.ost_wp.wp_official_code])
            this.haveTrue[partner.code][wp.ost_wp.wp_official_code] = {};
          if (
            !this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id]
          )
            this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
              {};

          if (
            !this.haveTrue[partner.code][wp.ost_wp.wp_official_code][item.id]
          )
            this.haveTrue[partner.code][wp.ost_wp.wp_official_code][item.id] =
              false;

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
      if(!this.initiative_data.synchronized)
        if (this.partnersData[partner.code]?.IPSR)
          this.partnersData[partner.code].IPSR = this.partnersData[
            partner.code
          ]?.IPSR?.filter((d: any) => d.value != null && d.value != "").sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));

      if(!this.initiative_data.synchronized){
         let newCrossCenters = this.partnersData[partner.code]?.CROSS?.filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
        if(this.partnersData[partner.code]?.CROSS)
          this.partnersData[partner.code].CROSS = this.partnersData[partner.code]?.CROSS?.filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
        newCrossCenters?.forEach((d: any) => this.partnersData[partner.code].CROSS.unshift(d))
      }
       

      this.wps.forEach((d: any) => {
        if (d.category == "WP") {
          if(this.partnersData[partner.code]){
            let outputData = this.partnersData[partner.code][d.ost_wp.wp_official_code]?.filter((d: any) => d.category == "OUTPUT")
            .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

            let outcomeData = this.partnersData[partner.code][d.ost_wp.wp_official_code]?.filter((d: any) => d.category != "OUTPUT")
              .sort((a: any, b: any) => a.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title?.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

            this.partnersData[partner.code][d.ost_wp.wp_official_code] = outputData?.concat(outcomeData);
          }
        }
      })
      this.loading = false;
    }

    for (let wp of this.wps) {
      this.allData[wp.ost_wp.wp_official_code] = await this.getDataForWp(
        wp.id,
        null,
        wp.ost_wp.wp_official_code,
        wp.ost_wp.acronym,
        wp.category
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

    this.savedValuesForIndicator = await this.submissionService.getSavedDataIndicator(
      this.params.id,
      this.phase.id
    );
    
    this.setvaluesForIndicators(this.savedValuesForIndicator);
    this.setPartnervaluesForIndicators(this.savedValuesForIndicator);

    this.setTotalTargetForIndicators();
    this.setTotalTargetForIndicatorsForPartners()
    this.setItemIndicatorAndBudget();
    this.sammaryCalc();
    this.getTotalIndValuesByPartner(this.totalTargetsIndicatorPartners);
    await this.setAnaplanValues();

    this.title2.setTitle("Complete the PORB");
    this.meta.updateTag({
      name: "description",
      content: "Complete the PORB",
    });

    if(!this.initiative_data.synchronized){
      const newIPSR = this.allData["IPSR"]
        .filter((d: any) => d.value != "")
        .sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
      this.allData["IPSR"] = newIPSR;
    }
      
    const firstKey = Object.keys(this.allData)[0];
    //sort first AOW
      const newCROSS = this.allData[firstKey].filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
      this.allData[firstKey] = this.allData[firstKey].filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
      newCROSS.forEach((d: any) => this.allData[firstKey].unshift(d))
    

    console.log(this.allData)
    console.log('allBudgetAssumptions', this.allBudgetAssumptions)
    

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
  }
  savedValues: any = null;
  savedValuesForIndicator: any = null;
  isCenter: boolean = false;
  selectedTabIndex: number = 0;
  selectedTabIndexAOW: number = 0;

  canSubmit: any;
  toggleIndicatorValues: any;
  InitiativeUsers: any;
  leaders: any[] = [];
  organizationSelected: any = "";
  initUser: any;
  connectDialogState = false;

  @HostListener('window:offline', ['$event'])
  offline(event: any) {
    this.handelDisconnect();
  }

  @HostListener('window:online', ['$event'])
  online(event: any) {
    this.handelConnect()
  }

  handelDisconnect = () => {
    if (this.connectDialogState) return;
    this.connectDialogState = true;
    this.dialog
      .open(CustomMessageComponent, {
        disableClose: true,
      })
  }

  handelConnect = () => {
    this.connectDialogState = false;
    this.dialog.closeAll();
  }

  user_info: any;
  my_roles: any;
  allBudgetAssumptions: any[] = [];
  anaplanLabels: any[] = [];
  anaplanValues: any[] = [];
  allCenterCountryValues: any[] = [];
  async ngOnInit() {
    this.socket.on('connect_error', this.handelDisconnect);
    this.socket.on('disconnect', this.handelDisconnect);
    this.socket.on('connect', this.handelConnect);
    this.user = this.AuthService.getLoggedInUser();
    this.params = this.activatedRoute?.snapshot.params;
    this.phase = await this.phasesService.getActivePhase();
    this.user_info = this.userService.getLogedInUser();
    this.initiative_data = await this.submissionService.getInitiative(
      this.params.id
    );
    this.clarisaCountries = await this.countryService.getAll();
    this.allCenterCountryValues = await this.countryService.getAllValues();

    this.tocSubmissionData = await this.submissionService.getTocSubmissionData(this.initiative_data.synchronized == true ? this.params.code : this.params.id)
    this.InitiativeUsers = await this.initiativeService.getInitiativeUsers(
      this.params.id
    );
    const tab = this.activatedRoute.snapshot.queryParamMap.get('tab');
    if (tab && this.initiative_data.is_valid && this.initUser?.role !== 'MELIA Focal Point') {
      this.selectedTabIndex = tab ? +tab : 0;

    } 
    const aowTab = this.activatedRoute.snapshot.queryParamMap.get('AOW');
    if (aowTab && this.initiative_data.is_valid && this.initUser?.role !== 'MELIA Focal Point') {
      this.selectedTabIndexAOW = aowTab ? +aowTab : 0;
    } 
    this.my_roles = this.InitiativeUsers.filter(
      (d: any) => d?.user?.id == this?.user_info?.id
    ).map((d: any) => d.role);
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
        roles[0].role == ROLES.MELIA_Focal_Point ||
        roles[0].role == ROLES.Financial_Focal_Point ||
        this.user.role == "admin"
      ) {
        this.partners = partners;
        this.isCenter = false;
        this.partners.forEach((x: any) =>
          x['canEdit'] = true
        )
      } else {
        if (roles[0].organizations.length) {
          const ids = new Set<number>()
          roles[0].organizations.forEach((o: any) => ids.add(o.code))
          partners.forEach((p: any) => p['canEdit'] = ids.has(p.code))
          this.partners = partners;
        } else {
          this.toastrService.error(
            "You are not assigned to this initiative, so please contact the leader to  give you access",
            "Access denied"
          );
          this.router.navigate(["denied"]);
        }
      }
    } else {
      if (this.user.role == "admin") {
        partners.forEach((x: any) =>
        x['canEdit'] = true
        )
        this.partners = partners;
      }

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
    this.indicatorTypes = [
      'Number of Policy (Policy Change)',
      'Innovation Use',
      'custom-OUTCOME',
      'Number of knowledge products',
      'Number of innovations (innovation development)',
      'Number of people trained (capacity sharing for development)',
      'custom-OUTPUT'
    ]
    this.highLevelOutputIndicatorTypes = [
      'Number of knowledge products',
      'Number of innovations (innovation development)',
      'Number of people trained (capacity sharing for development)',
      'custom-OUTPUT'
    ]
    this.outcomeIndicatorTypes = [
      'Number of Policy (Policy Change)',
      'Innovation Use',
      'custom-OUTCOME'
    ];

    this.allBudgetAssumptions = await this.budgetAssumptionsService.getAll();
    console.log(this.allBudgetAssumptions)
    this.socket.connect();
    this.socket.on("setDataValues-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, item_id, per_id, value } = data;
      this.changes(partner_code, wp_id, item_id, per_id, value);
      if (
        !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
          true
        )
      ) {
        this.values[partner_code][wp_id][item_id] = 0;
        this.displayValues[partner_code][wp_id][item_id] = 0;
      }
      if(Object.values(this.perValues[partner_code][wp_id][item_id]).filter(item => item).length === 1 && (this.values[partner_code][wp_id][item_id] == 0 && this.displayValues[partner_code][wp_id][item_id] == 0)){
        this.values[partner_code][wp_id][item_id] = null;
        this.displayValues[partner_code][wp_id][item_id] = null;
      }
    });
    this.socket.on("setAllDataValues-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, itemsIds, period, value } = data;
      itemsIds.forEach((item_id: any) => {
        period.forEach((period: any) => {
          this.changes(partner_code, wp_id, item_id, period.id, value);
        })
        if (
          !Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
            true
          )
        ) {
          this.values[partner_code][wp_id][item_id] = 0;
          this.displayValues[partner_code][wp_id][item_id] = 0;
        }
        else if(!Object.values(this.perValues[partner_code][wp_id][item_id]).includes(
          false
        )){
          this.values[partner_code][wp_id][item_id] = null;
          this.displayValues[partner_code][wp_id][item_id] = null;
        }
      })
       this.sammaryCalc();
    });
    this.socket.on("setDataValueForAll-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, itemsIds, value, no_budget } = data;
      for(let item_id of itemsIds) {
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
      }
      this.sammaryCalc();
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
      this.sammaryCalc();
    });
    this.socket.on("setDataValueForIndicator-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, item_id, indicator_id, budgetValue, subTotalBudgetIndicator } = data;
      this.displayBudgetValuesIndicator[partner_code][wp_id][item_id][indicator_id] = budgetValue;
      this.displayBudgetValues[partner_code][wp_id][item_id] = subTotalBudgetIndicator;

      this.setItemIndicatorAndBudget();
      this.sammaryCalc();
      this.recomputeIndicatorBudgetTotals();
    });
    this.socket.on("setDataBudget-" + this.params.id, (data: any) => {
      const { partner_code, wp_id, budget } = data;
      this.wp_budgets[partner_code][wp_id] = budget;
      this.sammaryCalc();
      // this.refreshValues(partner_code, wp_id);
    });
    this.socket.on("statusOfCenter", (data: any) => {
      if (this.params.id == data.initiative_id) {
        this.partnersStatus[data.organization_code] = !data.status;
        this.partnersValidate[data.organization_code] = !data.is_valid;
      }
      
    });

    this.socket.on("setDataAnaplan", (data: any) => {
      if (this.params.id == data.initiative_id) {
        this.anaplanBudgets[data.organization_code][data.wp_id][data.anaplan_id] = data.value;
        this.getWpTotals(data.organization_code, data.wp_id);
        this.getTotalsByAnaplan(data.organization_code, data.anaplan_id);
        this.getAnaplanTotal(data.organization_code);
      }
    });
    this.socket.on("validateOfCenter", (data: any) => {
      if (this.params.id == data.initiative_id) {
        this.partnersValidate[data.organization_code] = !data.is_valid;
      }
    });

    this.socket.on("submissionStatus", (data: any) => {
      this.initStatus = data.initStatus
      this.initiative_data = data.initiative_data;
    });

    this.socket.on("markPORBAsValid", (data: any) => {
      this.initiative_data = data.initiative_data;
    });

    this.socket.on("changeSubmissionStatus", async (data: any) => {
      this.initStatus = data.newSubmittionStatus.status
      this.initiative_data = await this.submissionService.getInitiative(
        this.params.id
      );
    });
    this.canSubmit = await this.constantsService.getSubmitStatus();
    const data : any = await this.constantsService.getShowIndicatorValues();
    this.toggleIndicatorValues = data.value !== "0";

   
    this.socket.on("setSelectedCountrySummary", (payload: any) => {
      const { wp, selectedCountries, result_id } = payload || {};
    
      const wpKey = wp.ost_wp.wp_official_code + "-partners";
      const allData = this.allData[wpKey];

      for (let item of allData) {
        if (item.id == result_id) {
          setTimeout(() => {
            item.selectedCountries = [];
            item.selectedCountries = selectedCountries;
          }, 500);
        }
      }
    });
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
            { status: this.initiative_data.latest_submission.status, initiative_id: this.initiative_data.id }
          ).then(
            async () => {
              this.initiative_data = await this.submissionService.getInitiative(
                this.params.id
              );
              this.socket.emit('submissionStatus', {
                initStatus: "Draft",
                initiative_data: this.initiative_data
              });
              await this.InitData();
              this.toastrService.success("Submission is canceled");
              this.router.navigate([
                "program",
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

  //set values for item-indicator and budget (front-end)
  setItemIndicatorAndBudget() {
    Object.keys(this.displayBudgetValuesIndicator).forEach((code) => {
      Object.keys(this.displayBudgetValuesIndicator[code]).forEach((wp_id) => {
        Object.keys(this.displayBudgetValuesIndicator[code][wp_id]).forEach((item_id) => {
          let sum = 0;
          let total = 0;
    
          Object.keys(this.displayBudgetValuesIndicator[code][wp_id][item_id]).forEach((indicator_id) => {
            const value = this.displayBudgetValuesIndicator[code][wp_id][item_id][indicator_id];
            sum += Number(value) || 0; 
          });
    
          if (!this.displayBudgetValuesItemIndicator[code]) {
            this.displayBudgetValuesItemIndicator[code] = {};
          }
          if (!this.displayBudgetValuesItemIndicator[code][wp_id]) {
            this.displayBudgetValuesItemIndicator[code][wp_id] = {};
          }
    
          this.displayBudgetValuesItemIndicator[code][wp_id][item_id] = sum;

          this.budgetValues[code][wp_id][item_id] = sum;
          this.displayBudgetValues[code][wp_id][item_id] = sum;


          Object.values(this.displayBudgetValuesItemIndicator[code][wp_id]).forEach(val => {
            if (typeof val === "number") {
              total += Number(val) || 0;
            } 
          });
          this.wp_budgets[code][wp_id] = total;
        });
      });
    });
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
                if(Object.values(this.perValues[code][wp_id][item_id]).includes(true)) 
                  this.haveTrue[code][wp_id][item_id] = true
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
    this.setIndecatorValues();
    this.getAllMeliasLength()
  }

  setvaluesForIndicators(data: any[]) {
    const indicatorIds = this.results[this.results.length - 1].indicator_ids;
    const ids = Object.values(indicatorIds);
    const filtered = data.filter(item => ids.includes(item.result_uuid));
    for(let value of filtered) {
      this.displayBudgetValuesIndicator[value.organization_code][value.workPackage.wp_official_code][value.parent_id][value.result_uuid] = Number(value.budget);      
    }
    this.sammaryCalc();
  }

  setPartnervaluesForIndicators(data: any[]) {  
    const indicatorIds = this.results[this.results.length - 1].indicator_ids;
    const ids = Object.values(indicatorIds);
    const filtered = data.filter(item => ids.includes(item.result_uuid));

    for(let value of filtered) {
      const orgCode = value.organization_code;
      const wpCode = value.workPackage.wp_official_code;
      const indicatorType = value.indicator_type;
      const budget = Number(value.budget) || 0;

      
      if (!this.budgetValuesIndicatorPartner[orgCode] || typeof this.budgetValuesIndicatorPartner[orgCode] !== 'object') {
        this.budgetValuesIndicatorPartner[orgCode] = {};
      }

      if (!this.budgetValuesIndicatorPartner[orgCode][wpCode] || typeof this.budgetValuesIndicatorPartner[orgCode][wpCode] !== 'object') {
        this.budgetValuesIndicatorPartner[orgCode][wpCode] = {};
      }

      if (!this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType]) {
        this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType] = 0;
      }

      this.budgetValuesIndicatorPartner[orgCode][wpCode][indicatorType] += budget;




      if (!this.budgetValuesIndicatorSummary[wpCode]) {
        this.budgetValuesIndicatorSummary[wpCode] = {};
      }
  
      if (!this.budgetValuesIndicatorSummary[wpCode][indicatorType]) {
        this.budgetValuesIndicatorSummary[wpCode][indicatorType] = 0;
      }
  
      this.budgetValuesIndicatorSummary[wpCode][indicatorType] += budget;


      if (!this.totalBudgetValuesIndicatorPartner[orgCode]) {
        this.totalBudgetValuesIndicatorPartner[orgCode] = {};
      }
  
      if (!this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType]) {
        this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] = 0;
      }
  
      this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] += budget;
  
      if (!this.totalBudgetValuesIndicatorSummary[indicatorType]) {
        this.totalBudgetValuesIndicatorSummary[indicatorType] = 0;
      }
  
      this.totalBudgetValuesIndicatorSummary[indicatorType] += budget;
      
    }
  }

  async recomputeIndicatorBudgetTotals() {
    this.savedValuesForIndicator = await this.submissionService.getSavedDataIndicator(
      this.params.id,
      this.phase.id
    );
    this.budgetValuesIndicatorPartner = {};
    this.budgetValuesIndicatorSummary = {};
    this.totalBudgetValuesIndicatorPartner = {};
    this.totalBudgetValuesIndicatorSummary = {};
  
    const indicatorIds = this.results?.[this.results.length - 1]?.indicator_ids ?? {};
    const ids = new Set(Object.values(indicatorIds));
  
    const filtered = this.savedValuesForIndicator.filter((item:any) => ids.has(item.result_uuid));
  
  
    for (const item of filtered) {
  
      const org = item.organization_code;
      const wp = item.workPackage?.wp_official_code;
      const type = item.indicator_type;
      const budget = Number(item.budget) || 0;
  
      this.budgetValuesIndicatorPartner[org] ??= {};
      this.budgetValuesIndicatorPartner[org][wp] ??= {};
      this.budgetValuesIndicatorPartner[org][wp][type] =
        (this.budgetValuesIndicatorPartner[org][wp][type] || 0) + budget;
  
      
      this.budgetValuesIndicatorSummary[wp] ??= {};
      this.budgetValuesIndicatorSummary[wp][type] =
        (this.budgetValuesIndicatorSummary[wp][type] || 0) + budget;
  
      this.totalBudgetValuesIndicatorPartner[org] ??= {};
      this.totalBudgetValuesIndicatorPartner[org][type] =
        (this.totalBudgetValuesIndicatorPartner[org][type] || 0) + budget;
  
      this.totalBudgetValuesIndicatorSummary[type] =
        (this.totalBudgetValuesIndicatorSummary[type] || 0) + budget;
    }
  
    this.budgetValuesIndicatorPartner = { ...this.budgetValuesIndicatorPartner };
    this.budgetValuesIndicatorSummary = { ...this.budgetValuesIndicatorSummary };
    this.totalBudgetValuesIndicatorPartner = { ...this.totalBudgetValuesIndicatorPartner };
    this.totalBudgetValuesIndicatorSummary = { ...this.totalBudgetValuesIndicatorSummary };
  }
  

  checkEOI(category: any) {
    return this.phase?.show_eoi ? category == "EOI" : false;
  }
  async getDataForWp(
    id: string,
    partner_code: any | null = null,
    official_code: any = null,
    ost_wp_acronym: string,
    wp_category: string
  ) {
    let wp_data;
    if(wp_category != 'Projects' && wp_category != 'Geographic-Scope' && wp_category != 'partners' && wp_category != 'melia' && wp_category != 'Cross Cutting') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "OUTPUT" ||
              d.category == "OUTCOME" ||
              this.checkEOI(d.category) ||
              // d.category == "Cross Cutting" ||
              d.category == "IPSR" 
              // d.category == "Melia"
            ) &&
            (d.group == id ||
              (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects') ||
              // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
              ((this.checkEOI(d.category) || d.category == "OUTCOME" && !d.group) && ost_wp_acronym == 'AOW00') ||

              // ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
              d.wp_id == official_code 
              // (official_code == "CROSS" && this.checkEOI(d.category))
            )
          );
        else
          return (
            ((d.category == "OUTPUT" ||
              d.category == "OUTCOME" ||
              this.checkEOI(d.category) ||
              // d.category == "Cross Cutting" ||
              d.category == "IPSR" 
              // d.category == "Melia" 
            ) &&
              (d.group == id || (d?.parent_id == id && d.category != 'Project' && wp_category != 'Projects')  ||
              // (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') ||
              ((this.checkEOI(d.category) || d.category == "OUTCOME" && !d.group) && ost_wp_acronym == 'AOW00') ||

              // ((this.checkEOI(d.category) || d.category == "Cross Cutting" || (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')) && ost_wp_acronym == 'AOW00') ||
                d.wp_id == official_code)) 
            // (official_code == "CROSS" && this.checkEOI(d.category))
          );
      });
    }  else if(wp_category == 'Projects') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Project") &&
            (
              (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') || (!d?.parent_id && d.category == 'Project' && official_code == 'CROSS-project')
            )
          );
        else
        return (
          (d.category == "Project") &&
          (
            (d?.parent_id == id && d.category == 'Project' && wp_category == 'Projects') || (!d?.parent_id && d.category == 'Project' && official_code == 'CROSS-project')
          )
        );
      });
    } 
    else if(wp_category == 'melia') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Melia") &&
            (
              (d?.parent_id == id) || ( (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')  && ost_wp_acronym == 'CROSS') 
            )
          );
        else
        return (
          (d.category == "Melia") &&
          (
            (d?.parent_id == id) || ( (!d.group && d.category != 'Melia') || (!d.parent_id && d.category == 'Melia')  && ost_wp_acronym == 'CROSS') 
          )
        );
      });
    } 
     else if(wp_category == 'Cross Cutting') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
              (d.category == "Cross Cutting" && official_code == 'CROSS-Cross-Cutting')
          );
        else
        return (
          (d.category == "Cross Cutting" && official_code == 'CROSS-Cross-Cutting')
        );
      });
    } 
    else if(wp_category == 'Geographic-Scope') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "Geographic-Scope") &&
            (
              (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
            )
          );
        else
        return (
          (d.category == "Geographic-Scope") &&
          (
            (d?.parent_id == id && d.category == 'Geographic-Scope' && wp_category == 'Geographic-Scope')
          )
        );
      });
    } else if(wp_category == 'partners') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "partners") &&
            (
              (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
            )
          );
        else
        return (
          (d.category == "partners") &&
          (
            (d?.parent_id == id && d.category == 'partners' && wp_category == 'partners')
          )
        );
      });
    } 
 
    // if (ost_wp_acronym === 'AOW00') {
    //   const meliaMap = new Map<string, any>();
    //   const nonMeliaItems: any[] = [];
    
    //   for (const item of wp_data) {
    //     if (item.category !== 'Melia') {
    //       nonMeliaItems.push(item);
    //       continue;
    //     }
    
    //     const key = `${item.id}`;
    
    //     if (!meliaMap.has(key)) {
    //       meliaMap.set(key, {
    //         ...item,
    //         results: item.results ?? '',
    //       });
    //     } else {
    //       const existing = meliaMap.get(key);
    //       if (item.results && !existing.results.includes(item.results)) {
    //         existing.results += `, ${item.results}`;
    //       }
    //     }
    //   }
    
    //   wp_data = [...nonMeliaItems, ...Array.from(meliaMap.values())];
    // }
    


    wp_data.sort(this.compare);

    return wp_data;
  }

  compare(a: any, b: any) {
    if (a.category == "OUTPUT" && b.category == "OUTCOME") return -1;
    if (b.category == "OUTPUT" && a.category == "OUTCOME") return 1;
    return 0;
  }

  addCross() {
    const isSmallScreen = window.innerWidth <= 768;
    const dialogRef = this.dialog.open(CrossCuttingComponent, {
      data: { id: "add", initiative_id: this.params.id },
      height: isSmallScreen ? '65%' : '70%',
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
          await this.submissionService.deleteCross(id).then(
            async () => {
              await this.InitData();
              this.toastrService.success("Deleted successfully");

            }, (error) => {
              this.toster.error('Connection Error', undefined, { disableTimeOut: true });
            }
          );
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
    let invalidCenters = this.invalidCenters().sort(); 
    if (invalidCenters.length) {
      messages = invalidCenters.length > 1 ? "Centers" : "Center(s)";
      messages += "  are invalid:";
    }
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Submit",
          message2: messages,
          f: invalidCenters,
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
                  initStatus: "Pending",
                  initiative_data: this.initiative_data
                });

                this.toastrService.success("Data Submitted successfully");
                this.router.navigate([
                  "program",
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

  invalidCenters() {
    let invalidCenters: any = [];
    this.partners.forEach((partner: any) => {
      if (!this.partnersValidate[partner.code]) {
        invalidCenters.push(partner.acronym);
      }
    });
    return invalidCenters;
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
    const validateWp = ['project', 'partners', 'melia', 'Cross-Cutting '];
    const isIncluded = validateWp.some(item => wp_id.toLowerCase().includes(item.toLowerCase()));

    let valid = true;
    let wpChecked = false;
    let message = "";
    let hasBudget = false;
    let total: any = Object.values(this.budgetValues[partner_code][wp_id]).reduce((sum: any, val: any) => sum + val, 0);
    if (!this.partnersData[partner_code][wp_id]) {
      return {
        valid: valid,
        message: message,
      };
    }
    // this.partnersData[partner_code][wp_id].forEach((item: any) => {
    //   if (item.category != "EOI" && item.category != "OUTCOME" && item.category != "Geographic-Scope" && item.category != "partners") {
    //     let perChecked = Object.values(
    //       this.perValues[partner_code][wp_id][item.id]
    //     ).reduce((a: any, b: any) => a || b);
    //     if (perChecked && !this.noValuesAssigned[partner_code][wp_id][item.id]) {
    //       hasBudget = true;
    //     }
    //     if (
    //       perChecked &&
    //       !+this.values[partner_code][wp_id][item.id] &&
    //       !this.noValuesAssigned[partner_code][wp_id][item.id]
    //     ) {
    //       valid = false;
    //       this.itemHasError[partner_code][wp_id][item.id] = true;
    //     } else {
    //       this.itemHasError[partner_code][wp_id][item.id] = false;
    //     }
    //     if (perChecked) wpChecked = true;
    //   }
    // });
    if(isIncluded){
      this.errors[partner_code][wp_id] = null;
      if (
        this.totals[partner_code][wp_id] == 0 &&
        (this.wp_budgets[partner_code][wp_id] != 0 && this.wp_budgets[partner_code][wp_id] != null)
      ) {
        valid = false;
        this.errors[partner_code][wp_id] =
          "There is a work package with a budget not disaggregated";
        message = "There is a work package with a budget not disaggregated";
      } else if (
        // wpChecked &&
        // hasBudget &&
        (Math.round(total) !== 0 &&  Number(this.wp_budgets[partner_code][wp_id]) !== 0)
      ) {
        valid = false;
        if ( Math.round(total) !== Number(this.wp_budgets[partner_code][wp_id])) {
          this.errors[partner_code][wp_id] =
            "Results budget must be equal total budget";
          message = "The subtotal of all percentages should equal 100%";
        } else {
          valid = true;
          this.errors[partner_code][wp_id] = null;
          message = '';
        }
         
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
        height: '500px',
        data: {
          initiative_id: initiative_id
        },
      })
  }

  getCategory(category: string) {
    switch (category) {
      case "OUTPUT":
        return "High Level Output";
      case "OUTCOME":
        return "Intermediate Outcome";
      case "EOI":
        return "2030 Outcome";
      case "Melia":
        return "MELIA Studies";
      case "Geographic-Scope":
        return "Geographic Scope";
      default:
        return category;
    }
  }
  canSubmitPORB() {
    return (
      this.user_info.role == "admin" ||
      this.my_roles?.includes(ROLES.LEAD) ||
      this.my_roles?.includes(ROLES.COORDINATOR) ||
      this.my_roles?.includes(ROLES.CoLeader)
    );
  }
  canMarkAsValid() {
    return (
      this.user_info.role == "admin" ||
      this.my_roles?.includes(ROLES.LEAD) ||
      this.my_roles?.includes(ROLES.COORDINATOR) ||
      this.my_roles?.includes(ROLES.CoLeader) ||
      this.my_roles?.includes(ROLES.MELIA_Focal_Point)
    );
  }
  markAsValid() {
    this.dialog
    .open(DeleteConfirmDialogComponent, {
      data: {
        title: "Mark this PORB as valid",
        message: `Are you sure you want to Mark this PORB as valid ?`,
      },
    })
    .afterClosed()
    .subscribe(async (dialogResult) => {
      if (dialogResult == true) {
        await this.submissionService.markAsValid(
          this.initiative_data.id,
          { is_valid: true, initiative_id: this.initiative_data.id }
        ).then(
          async () => {
            this.initiative_data = await this.submissionService.getInitiative(
              this.params.id
            );
            this.socket.emit('markPORBAsValid', {
              initiative_data: this.initiative_data
            });
            await this.InitData();
            this.toastrService.success("PORB marked as valid");
          }, (error) => {
            this.toster.error('Connection Error', undefined, { disableTimeOut: true });
          }
        );
      }
    });
  }

  getStatus() {
    return  this.initiative_data.last_submitted_at != null &&
    this.initiative_data.last_update_at ==
    this.initiative_data.last_submitted_at
      ? this.initiative_data?.latest_submission
        ? this.initiative_data?.latest_submission?.status ==
          "Pending"
          ? "Submitted"
          : this.initiative_data?.latest_submission?.status
        : "Draft"
      : "Draft"
  }



  qualitativeIndicatorsDialog(data: any []) {
    this.dialog.open(QualitativeIndicatorsComponent, {
      data: data,
      panelClass: 'dialog-fit-content'
    })
  }


  showSubQualitativeIndicators(data: any[]) {
    if (!data || !data.length) return '';
    const text = data.map((d: any) => d.measure_of_success_maximum).join('')
    return text.length > 10 ? text.substring(0, 30) + '...' : text;
  }

 
  setIndecatorValues() {
    for (const wp of this.wps) {
      // if (wp.category === 'WP' || wp.category === 'Projects') {
      if (wp.category === 'WP') {
        const group = wp.ost_wp?.wp_official_code;
        if (!group) continue;
  
        const allData = this.allData[group];
        if (!Array.isArray(allData)) continue;
  
        if (!this.perAllValuesIndicator[group]) {
          this.perAllValuesIndicator[group] = {};
        }
  
        for (let data of allData) {
          // console.log('dada', data)
          const dataId = data.id;
          const indicatorValues = data.pooled_funded_indicator_values || {};
  
          if (!this.perAllValuesIndicator[group][dataId]) {
            this.perAllValuesIndicator[group][dataId] = {};
          }
  
          for (let key of this.highLevelOutputIndicatorTypes) {
            this.perAllValuesIndicator[group][dataId][key] = indicatorValues[key] ?? 0;
          }
        }
      }
    }
  }
  getTotalIndValues(data: any, type: string) {
    if(data) {
      let sum = Object.values(data).reduce((sum, item: any) => {
        return sum + (item[type] || 0);
      }, 0);
      return sum;
    } else {
      return 0
    }
  
  }


  getTotalIndAllValues(data: any, type: string): number {
  if (!data) return 0;

  let total = 0;

  for (const uuid in data) {
    const item = data[uuid];

    total += item[type] || 0;

    for (const key in item) {
      const value = item[key];
      if (typeof value === 'object' && value !== null && value[type] !== undefined) {
        total += value[type] || 0;
      }
    }
  }

  return total;
}

totalConsolidatedTargetPartner: any;

 getTotalIndValuesByPartner(data: any): Record<string, Record<string, number>> {
  if (!data) return {};

  const totals: Record<string, Record<string, number>> = {};

  Object.keys(data).forEach((partnerId) => {
    totals[partnerId] = {};
    const partner = data[partnerId];

    Object.keys(partner).forEach((category) => {
      const categoryData = partner[category];

      if (typeof categoryData === 'object' && categoryData !== null) {
        Object.keys(categoryData).forEach((indicator) => {
          const value = categoryData[indicator];
          if (typeof value === 'number') {
            totals[partnerId][indicator] = (totals[partnerId][indicator] || 0) + value;
          }
        });
      }
    });
  });
  this.totalConsolidatedTargetPartner = totals;
  console.log(totals)
  return totals;
}





 
  getAllMeliasLength() {
    let total = 0;
    for(let wp of this.actualWps) {
      total += this.allData[wp.ost_wp.wp_official_code + '-melia']?.length
    }
    return total
  }
  getScope(indicator: any, type: string) {
    let target = type == 'item' ? 'location' : 'geographic_scope'
      let scope = '';
      if(indicator[target] == 'global') {
        scope = 'Global';
      } else if(indicator[target] == 'country') {
        if(target == 'geographic_scope')
          scope = 'Country: ' + indicator.country?.map((c:any) => c.name).join(', ')
        else
          scope = 'Country: ' + indicator.countries?.map((c:any) => c.name).join(', ')
      } else if(indicator[target] == 'regional') {
        scope = 'Regional: ' + indicator.regions?.map((c:any) => c.name).join(', ')
      }
      return scope
  }

  getTargetValue(targets: any[]) {
    return targets.reduce((sum, target) => {
      const val = parseFloat(target?.['2026']) || 0;
      return sum + val;
    }, 0);
  }

  setTotalTargetForIndicators() {
    for (let wp of this.actualWps) {
      if (!this.totalTargetsIndicator[wp.ost_wp.wp_official_code]) {
        this.totalTargetsIndicator[wp.ost_wp.wp_official_code] = {};
      }
  
      const wpData = this.perAllValuesIndicator?.[wp.ost_wp.wp_official_code];
      if (!wpData) continue;
  
      Object.keys(wpData).forEach((itemId) => {
        const indicators = wpData[itemId];
  
        Object.keys(indicators).forEach((indicatorName) => {
          const value = Number(indicators[indicatorName]) || 0;
  
          if (!this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName]) {
            this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName] = 0;
          }
  
          this.totalTargetsIndicator[wp.ost_wp.wp_official_code][indicatorName] += value;
        });
      });
    }
    
  }

  setTotalTargetForIndicatorsForPartners() {
    for (let partner of this.partners) {
      if (!this.totalTargetsIndicatorPartners[partner.code]) {
        this.totalTargetsIndicatorPartners[partner.code] = {};
      }
      for (let wp of this.actualWps) {
        if (!this.totalTargetsIndicatorPartners[partner.code][wp.ost_wp.wp_official_code]) {
          this.totalTargetsIndicatorPartners[partner.code][wp.ost_wp.wp_official_code] = {};
        }
      }
    }
   
    for (let wp of this.actualWps) {
      const wpDataArray = this.allData[wp.ost_wp.wp_official_code];
    
      for (let wpData of wpDataArray) {
        const wpCode = wpData.ost_wp?.wp_official_code || wp.ost_wp.wp_official_code;
    
        for (let indicator of wpData.quantitative_indicators || []) {
          const indicatorType = this.highLevelOutputIndicatorTypes.includes(indicator?.type?.value)
            ? indicator.type.value
            : 'Other';
    
          for (let target of indicator.targets || []) {
            for (let targetPartner of target.centers || []) {
              const partnerCode = targetPartner.code;
    
              if (!this.totalTargetsIndicatorPartners[partnerCode]) {
                this.totalTargetsIndicatorPartners[partnerCode] = {};
              }
    
              if (!this.totalTargetsIndicatorPartners[partnerCode][wpCode]) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode] = {};
              }
    
              if (!this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType]) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType] = 0;
              }
    
              const value = parseFloat(target['2026']);
              if (!isNaN(value)) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType] += value;
              }
            }
          }
        }
      }
    }
  }

  openBudgetAssumptionsDialog(partner: number, item_id: string, wp_id: string, budget: number, type: string) {
    const data ={ 
      organization_code: partner,
      item_id: item_id,
      wp_id: wp_id,
      item_budget: budget,
      type: type
    }
    this.dialog
    .open(BudgetAssumptionsComponent, {
      data: {
        data
      },
      width: '800px',
      maxWidth: '850px',
      maxHeight: '500px',
      height: '320px',
    }).afterClosed()
    .subscribe(async dialogResult => {
      if (dialogResult) {
        this.allBudgetAssumptions = await this.budgetAssumptionsService.getAll();
        this.hasBudgetAssumptions(dialogResult.data.organization_code, dialogResult.data.item_id, dialogResult.data.wp_id);
      }
    });
  } 

  openBudgetAssumptionsDialogSummary(item_id: string) {
    console.log(item_id)
    this.dialog
    .open(BudgetAssumptionSummaryComponent, {
      data: {
        item_id
      },
      width: '800px',
      maxWidth: '850px',
      maxHeight: '600px',
      height: 'auto',
    })
  } 

  getMeliaProjectItemTotal(partnerCode: string, item: any, type: string): number {
    if (!item?.results?.length) return 0;
  
    return item.results.reduce((sum: number, result: any) => {
      const wpCode = result?.group?.ost_wp?.wp_official_code + type;
      const value =
        this.displayBudgetValues?.[partnerCode]?.[wpCode]?.[item.id] || 0;
  
      return sum + Number(value.toString().replace(/,/g, ''));
    }, 0);
  }

  hasBudgetAssumptions(partnerCode: string, itemId: number, wpId: string): boolean {
    return this.allBudgetAssumptions.some(a =>
      a.organization_code === partnerCode &&
      a.item_id === itemId &&
      a.wp_id === wpId
    );
  }

  hasBudgetAssumptionsSummary(itemId: number, wpId: string): boolean { 
    return this.allBudgetAssumptions.some(a =>
      a.item_id === itemId &&
      a.wp_id === wpId
    );
  } 

  async setAnaplanValues() {
    this.anaplanValues = await this.anaplanService.getAllValues(this.params.id);
    for(let values of this.anaplanValues){
     this.anaplanBudgets[values.organization.code][values.workPackage.wp_official_code][values.anaplan.id] = values.value
    }
  }
  
  anaplanCalc(organization_code: number, anaplan_id: number, wp_id: number) {
    const value = this.anaplanBudgets[organization_code][wp_id][anaplan_id];
    const initiative_id = this.initiative_data.id;
    const data = { organization_code, anaplan_id, wp_id, value, initiative_id};
  
    clearTimeout(this.timeCalc);
    this.timeCalc = setTimeout(async () => {
        await this.anaplanService.createOrUpdate(data).then(
          () => {
            this.socket.emit("setDataAnaplan", {
              initiative_id,
              organization_code,
              wp_id,
              anaplan_id,
              value,
            });
          }, (error) => {
            console.log(error)
          }
        );
    }, 1250); 
  }


  getWpTotals(partnerCode: number, wp:any): any{
    const partnerData = this.anaplanBudgets[partnerCode];
  
    const totals: Record<string, number> = {};
  
    Object.keys(partnerData).forEach((wp) => {
      const wpObj = partnerData[wp] as Record<number, number>;
  
      totals[wp] = Object.values(wpObj).reduce(
        (sum, val) => sum + (Number(val) || 0), 
        0
      );
    });
    return totals[wp];
  }
  
  getTotalsByAnaplan(partnerCode: number, anaplan_id:number) {
    const partnerData = this.anaplanBudgets[partnerCode];
    if (!partnerData) return {};
  
    const totals: Record<number, number> = {};
  
    Object.values(partnerData).forEach((wpObj) => {
      Object.entries(wpObj as Record<number, number>).forEach(([anaplanId, value]) => {
        const id = +anaplanId;
        const val = value || 0;
  
        if (!totals[id]) {
          totals[id] = 0;
        }
        totals[id] += val;
      });
    });
    return totals[anaplan_id];
  }

  getAnaplanTotal(partnerCode: number): number {
    const partnerData = this.anaplanBudgets[partnerCode];
    if (!partnerData) return 0;
  
    let total = 0;
  
    Object.values(partnerData).forEach((wpObj) => {
      Object.values(wpObj as Record<number, number>).forEach((val) => {
        total += val || 0;
      });
    });
  
    return total;
  }


  async onCountriesChange(selectedCountries: any[], partner: any, wp: any, item: any) {
    const initiative_id = this.initiative_data.id;
    const official_code = this.initiative_data.official_code;

    const result_id = item.id;
    const parent_id = item.parent_id
    const data = {partner, wp, initiative_id, result_id}
    await this.countryService.createOrUpdate(data).then(
      (res) => {
        if(res)
          setTimeout(() => {
            this.socket.emit("setSelectedCountryPartner", {
              official_code,
              result_id,
              parent_id,
              partner,
              wp,
              selectedCountries
            });
          }, 500);
          setTimeout(() => {
            this.socket.emit("setSelectedCountrySummary", {
              official_code,
              result_id,
              wp
            });
          }, 500);
      }, (error) => {
        console.log(error)
      }
    )
  }
}
