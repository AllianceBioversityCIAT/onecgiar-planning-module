import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { SubmissionService } from "../../services/submission.service";
import { AppSocket } from "../../socket.service";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { ToastrService } from "ngx-toastr";
import { PhasesService } from "src/app/services/phases.service";
import { HeaderService } from "src/app/header.service";
import { Meta, Title } from "@angular/platform-browser";
import { QualitativeIndicatorsComponent } from "src/app/submission/qualitative-indicators/qualitative-indicators.component";
import { DecimalPipe, Location } from "@angular/common";
import { ClarisaCountryService } from "src/app/services/clarisa-country.service";
import { BudgetAssumptionsService } from "src/app/services/budget-assumptions.service";
import { AnaplanService } from "src/app/services/anaplan.service";

@Component({
  selector: "app-submited-version",
  templateUrl: "./submited-version.component.html",
  styleUrls: ["./submited-version.component.scss"],
  providers: [DecimalPipe] 
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
    private meta: Meta,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private decimalPipe: DecimalPipe,
    private anaplanService: AnaplanService,
    private countryService: ClarisaCountryService,
    private budgetAssumptionsService: BudgetAssumptionsService,
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
  clarisaCountries: any[] = [];

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

  toggleValues: any = {};
  toggleSummaryValues: any = {};
  errors: any = {};
  period: Array<any> = [];
  indicatorTypes: Array<any> = [];
  highLevelOutputIndicatorTypes: Array<any> = [];
  outcomeIndicatorTypes: Array<any> = [];
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
  perAllValuesIndicator: any = {};
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
  organizationSelected: any = "";
  selectedTabIndex: number = 0;
  selectedTabIndexAOW: number = 0;
  tabChanged(organization: any) {
    this.partners.map((d: any) => {
      if (d.name == organization?.tab?.textLabel) this.organizationSelected = d;
    });
    this.updatePath(organization);
  }
  updatePath(tab: any) {
    this.location.replaceState(
    this.router.url.split('?')[0], 
    `tab=${tab.index}&AOW=${this.selectedTabIndexAOW}`    
  );
  this.selectedTabIndex = tab.index;
  }

  isUpdatingTab = false;

  tabChangedAOW(event: any) {
    if (this.isUpdatingTab) return;
  
    const newIndex = event.index;
  
    this.isUpdatingTab = true;
  
    this.updateURL(newIndex);
  
    setTimeout(() => {
      this.selectedTabIndexAOW = newIndex;
      this.isUpdatingTab = false;
    });
  }
  
  updateURL(newIndex: number) {
    this.location.replaceState(
      this.router.url.split('?')[0],
      `tab=${this.selectedTabIndex}&AOW=${newIndex}`
    );
  }
  wpsTotalSum = 0;
  // sammaryCalc() {
  //   let totalsum: any = {};
  //   let totalsumcenter: any = {};
  //   let totalWp: any = {};
  //   this.summaryBudgets = {};
  //   this.summaryBudgetsTotal = {};

  //   Object.keys(this.budgetValues).forEach((partner_code) => {
  //     Object.keys(this.budgetValues[partner_code]).forEach((wp_id) => {
  //       if (!this.summaryBudgets[wp_id]) this.summaryBudgets[wp_id] = {};
  //       if (!this.summaryBudgetsTotal[wp_id])
  //         this.summaryBudgetsTotal[wp_id] = 0;
  //       Object.keys(this.budgetValues[partner_code][wp_id]).forEach(
  //         (item_id) => {
  //           if (!this.summaryBudgets[wp_id][item_id])
  //             this.summaryBudgets[wp_id][item_id] = 0;
  //           this.summaryBudgets[wp_id][item_id] +=
  //             +this.budgetValues[partner_code][wp_id][item_id];
  //           this.summaryBudgetsTotal[wp_id] +=
  //             +this.budgetValues[partner_code][wp_id][item_id];
  //         }
  //       );
  //     });
  //   });

  //   if(!this.initiative_data.synchronized)
  //     this.summaryBudgetsAllTotal = Object.values(
  //       this.summaryBudgetsTotal
  //     ).reduce((a: any, b: any) => a + b);
  //   else
  //     this.summaryBudgetsProjectsTotal = Object.entries(this.summaryBudgetsTotal)
  //     .filter(([key, _]) => key.includes('-project'))
  //     .reduce((sum, [_, value]: any) => sum + value, 0);

  //     this.summaryBudgetsAllTotal = Object.entries(this.summaryBudgetsTotal)
  //     .filter(([key, _]) => !key.includes('-project'))
  //     .reduce((sum, [_, value]: any) => sum + value, 0);

  //   Object.keys(this.summaryBudgets).forEach((wp_id) => {
  //     if (this.summaryBudgetsTotal[wp_id]) {
  //       Object.keys(this.summaryBudgets[wp_id]).forEach((item_id) => {
  //         this.sammary[wp_id][item_id] = this.percentValue(
  //           this.summaryBudgets[wp_id][item_id],
  //           this.summaryBudgetsTotal[wp_id]
  //         );
  //       });
  //     }
  //   });

  //   Object.keys(this.values).forEach((code) => {
  //     Object.keys(this.values[code]).forEach((wp_id) => {
  //       let total = 0;
  //       Object.keys(this.values[code][wp_id]).forEach((d) => {
  //         total += +this.values[code][wp_id][d];
  //       });
  //       if (total > 100) {
  //         this.errors[code][wp_id] =
  //           "total percentage cannot be over 100 percent";
  //       } else {
  //         this.errors[code][wp_id] = null;
  //       }
  //       this.totals[code][wp_id] = total;

  //       Object.keys(this.values[code][wp_id]).forEach((item_id) => {
  //         if (!totalsum[wp_id]) totalsum[wp_id] = {};
  //         if (!totalsum[wp_id][item_id]) totalsum[wp_id][item_id] = 0;
  //         totalsum[wp_id][item_id] += +this.values[code][wp_id][item_id];
  //       });
  //       // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
  //     });
  //   });

  //   Object.keys(this.totals).forEach((code) => {
  //     Object.keys(this.totals[code]).forEach((wp_id) => {
  //       if (!totalsumcenter[wp_id]) totalsumcenter[wp_id] = 0;
  //       totalsumcenter[wp_id] += +this.totals[code][wp_id];
  //       // Sum(percentage from each output from each center for each WP) / Sum(total percentage for each WP for each center)
  //     });
  //   });

  //   Object.keys(totalsum).forEach((wp_id) => {
  //     Object.keys(totalsum[wp_id]).forEach((item_id) => {
  //       if (!totalWp[wp_id]) totalWp[wp_id] = {};
  //       if (+totalsum[wp_id][item_id] && +totalsumcenter[wp_id])
  //         totalWp[wp_id][item_id] =
  //           +(+totalsum[wp_id][item_id] / +totalsumcenter[wp_id]) * 100;
  //       else totalWp[wp_id][item_id] = 0;
  //     });
  //   });

  //   this.sammaryTotal["CROSS"] = 0;
  //   this.sammaryTotal["IPSR"] = 0;
  //   this.sammaryTotalConsolidated["CROSS"] = 0;
  //   this.sammaryTotalConsolidated["IPSR"] = 0;
  //   Object.keys(this.sammary).forEach((wp_id) => {
  //     this.sammaryTotal[wp_id] = 0;
  //     this.sammaryTotalConsolidated[wp_id] = 0;
  //     Object.keys(this.sammary[wp_id]).forEach((item_id) => {
  //       this.sammaryTotal[wp_id] += totalWp[wp_id][item_id];
  //       this.sammaryTotalConsolidated[wp_id] = this.summaryBudgetsAllTotal ? this.summaryBudgetsTotal[wp_id] / this.summaryBudgetsAllTotal * 100 : 0;
  //     });
  //   });
  //   this.wpsTotalSum = 0;
  //   Object.keys(this.sammaryTotal).forEach((wp_id) => {
  //     this.wpsTotalSum += this.sammaryTotalConsolidated[wp_id];
  //   });
  //   // this.wpsTotalSum = this.wpsTotalSum / Object.keys(this.sammaryTotal).length;
  // }
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
            this.indicatorTypes.forEach((type) => {
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

  results: any;
  loading = false;
  params: any;
  initiative_data: any = {};
  ipsr_value_data: any;
  actualWps:any;
  toggleIndicatorValues: any= true;
  savedValuesForIndicator: any = null;

  partnersMelia:any;
  partnersProject:any;
  partnerProjects:any = {}
  partnersProjectMelia:any;
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
    this.summaryBudgetsIndicator = {};
    this.totalTargetsIndicator = {};
    this.totalTargetsIndicatorPartners = {};
    this.summaryBudgetsTotal = {};
    this.wp_budgets = {};
    this.toggleValues = {};
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

    this.wp_budgets = await this.submissionService.getBudgets(this.params.id, this.submission_data.phase.id);

    this.results = this.submission_data.toc_data.results;
    console.log(this.submission_data)
    // const melia_data = await this.submissionService.getMeliaBySubmission(
    //   this.params.id
    // );
    const cross_data = await this.submissionService.getCrossBySubmission(
      this.params.id
    );
    this.ipsr_value_data = await this.submissionService.getIpsrBySubmission(
      this.params.id
    );
    this.partnersMelia = this.sortByNameOrTitle(this.submission_data.toc_data?.extra?.melias);
    this.partnersProject = this.sortByNameOrTitle(this.submission_data.toc_data?.extra?.projects);


    for(let partner of this.partners){
      if(this.toggleIndicatorValues)
      this.partnerProjects[partner.code] = this.partnersProject.filter((project: any) => project.center.code === partner.code);
    else
      this.partnerProjects[partner.code] = this.partnersProject
    }



    this.partnersMelia.forEach((melia: any) => {
      if (melia.results && Array.isArray(melia.results)) {
        melia.results.forEach((result: any) => {
          const wp = result?.group?.ost_wp;
          if (wp?.acronym === 'AOW00') {
            wp.wp_official_code = 'CROSS';
          }
        });
      }
    });


    cross_data.map((d: any) => {
      d["category"] = "Cross Cutting";
      d["wp_id"] = "CROSS";
      return d;
    });
    this.ipsr_value_data.map((d: any) => {
      d["category"] = "IPSR";
      d["wp_id"] = "IPSR";
      return d;
    });
    if(!this.initiative_data.synchronized)
      this.results = [
        ...cross_data,
        ...this.ipsr_value_data,
        ...this.results,
      ];
    else 
      this.results = [
        ...cross_data,
        ...this.results,
      ];
    this.wps = this.results
      .filter((d: any) => {
        if (d.category == "WP")
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
      if(!this.initiative_data.synchronized){
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
      }
      let melias = [];
      if(this.initiative_data.synchronized){
        for (let wp of this.wps) {
          melias.push({
            id: wp.id,
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

      let synergyPrograms = [];
      if(this.initiative_data.synchronized){
        
        for (let wp of this.wps) {
          synergyPrograms.push({
            id: wp.id,
            title: wp.ost_wp.wp_official_code + "-synergy-programs",
            category: "synergy-programs",
            ost_wp: { wp_official_code: wp.ost_wp.wp_official_code + "-synergy-programs" },
          });
        }
      }
  
      this.wps = [...this.wps, ...melias, ...crossCutting, ...w3Projects ,...geographicScope, ...partners, ...synergyPrograms];

      this.anaplanLabels = await this.anaplanService.getAll();


    // for (let partner of this.partners) {
    //   if (!this.budgetValues[partner.code])
    //     this.budgetValues[partner.code] = {};

    //   if (!this.displayBudgetValues[partner.code])
    //     this.displayBudgetValues[partner.code] = {};

    //   for (let wp of this.wps) {
    //     if (!this.wp_budgets[partner.code]) this.wp_budgets[partner.code] = {};
    //     if (!this.wp_budgets[partner.code][wp.ost_wp.wp_official_code])
    //       this.wp_budgets[partner.code][wp.ost_wp.wp_official_code] = null;

    //     if (!this.toggleValues[partner.code])
    //       this.toggleValues[partner.code] = {};
    //     if (!this.toggleValues[partner.code][wp.ost_wp.wp_official_code])
    //       this.toggleValues[partner.code][wp.ost_wp.wp_official_code] = false;

    //     if (!this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
    //       this.budgetValues[partner.code][wp.ost_wp.wp_official_code] = {};
    //     // console.log(this.budgetValues[partner.code][wp.ost_wp.wp_official_code])
    //     if (!this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code])
    //       this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code] =
    //         {};

    //     if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
    //       this.summaryBudgets[wp.ost_wp.wp_official_code] = {};

    //     if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
    //       this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;

    //     const result = await this.getDataForWp(
    //       wp.id,
    //       partner.code,
    //       wp.ost_wp.wp_official_code,
    //       wp.ost_wp.acronym,
    //       wp.category
    //     );
    //     // console.log(result)
    //     if (result.length) {
    //       if (!this.partnersData[partner.code])
    //         this.partnersData[partner.code] = {};
    //       this.partnersData[partner.code][wp.ost_wp.wp_official_code] = result;
    //     }
    //     if (!this.perValuesSammary[wp.ost_wp.wp_official_code])
    //       this.perValuesSammary[wp.ost_wp.wp_official_code] = {};
    //     this.period.forEach((element) => {
    //       if (!this.perValuesSammary[wp.ost_wp.wp_official_code][element.id])
    //         this.perValuesSammary[wp.ost_wp.wp_official_code][element.id] =
    //           false;
    //     });

    //     if (!this.perValuesSammaryForPartner[partner.code])
    //       this.perValuesSammaryForPartner[partner.code] = {};
    //     if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code])
    //       this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code] = {};
    //     this.period.forEach((element) => {
    //       if (!this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id])
    //         this.perValuesSammaryForPartner[partner.code][wp.ost_wp.wp_official_code][element.id] =
    //           false;
    //     });
    //     result.forEach((item: any) => {
    //       this.check(
    //         this.values,
    //         partner.code,
    //         wp.ost_wp.wp_official_code,
    //         item.id
    //       );
    //       this.check(
    //         this.displayValues,
    //         partner.code,
    //         wp.ost_wp.wp_official_code,
    //         item.id
    //       );
    //       this.budgetValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
    //         null;

    //       this.displayBudgetValues[partner.code][wp.ost_wp.wp_official_code][
    //         item.id
    //       ] = null;

    //       if (!this.summaryBudgets[wp.ost_wp.wp_official_code][item.id])
    //         this.summaryBudgets[wp.ost_wp.wp_official_code][item.id] = 0;

    //       if (!this.perValues[partner.code]) this.perValues[partner.code] = {};
    //       if (!this.perValues[partner.code][wp.ost_wp.wp_official_code])
    //         this.perValues[partner.code][wp.ost_wp.wp_official_code] = {};
    //       if (
    //         !this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id]
    //       )
    //         this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id] =
    //           {};

    //       this.period.forEach((element) => {
    //         this.perValues[partner.code][wp.ost_wp.wp_official_code][item.id][
    //           element.id
    //         ] = false;
    //       });

    //       this.period.forEach((element) => {
    //         if (!this.perAllValues[wp.ost_wp.wp_official_code])
    //           this.perAllValues[wp.ost_wp.wp_official_code] = {};
    //         if (!this.perAllValues[wp.ost_wp.wp_official_code][item.id])
    //           this.perAllValues[wp.ost_wp.wp_official_code][item.id] = {};

    //         this.perAllValues[wp.ost_wp.wp_official_code][item.id][element.id] =
    //           false;

    //         if (!this.sammary[wp.ost_wp.wp_official_code])
    //           this.sammary[wp.ost_wp.wp_official_code] = {};
    //         if (!this.sammary[wp.ost_wp.wp_official_code][item.id])
    //           this.sammary[wp.ost_wp.wp_official_code][item.id] = 0;

    //         if (!this.sammaryTotal[wp.ost_wp.wp_official_code])
    //           this.sammaryTotal[wp.ost_wp.wp_official_code] = 0;

    //         if (!this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code])
    //           this.sammaryTotalConsolidated[wp.ost_wp.wp_official_code] = 0;
    //       });
    //     });
    //   }
    //   if(!this.initiative_data.synchronized){
    //     if (this.partnersData[partner.code]?.IPSR)
    //       this.partnersData[partner.code].IPSR = this.partnersData[
    //         partner.code
    //       ]?.IPSR?.filter((d: any) => d.value != null && d.value != "").sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
    //   }
    //     if(!this.initiative_data.synchronized){
    //       let newCrossCenters = this.partnersData[partner.code].CROSS.filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
    //       this.partnersData[partner.code].CROSS = this.partnersData[partner.code].CROSS.filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
    //       newCrossCenters.forEach((d: any) => this.partnersData[partner.code].CROSS.unshift(d))
    //     }
    //   this.wps.forEach((d: any) => {
    //     if (d.category == "WP") {
    //       let outputData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category == "OUTPUT")
    //         .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

    //       let outcomeData = this.partnersData[partner.code][d.ost_wp.wp_official_code].filter((d: any) => d.category != "OUTPUT")
    //         .sort((a: any, b: any) => a.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase().localeCompare(b.title.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').toLowerCase()))

    //       this.partnersData[partner.code][d.ost_wp.wp_official_code] = outputData.concat(outcomeData);
    //     }
    //   })

    //   this.loading = false;
    // }
    for (let partner of this.partners) {
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
      for(let wp of this.actualWps) {
        if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code]) {
          this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code] = {};
        }

        this.anaplanLabels.forEach((element) => {
          if (!this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id])
            this.anaplanBudgets[partner.code][wp.ost_wp.wp_official_code][element.id] =
              0;
        });
      }

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
        if (!this.summaryBudgets[wp.ost_wp.wp_official_code])
          this.summaryBudgets[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code])
          this.summaryBudgetsIndicator[wp.ost_wp.wp_official_code] = {};
        if (!this.summaryBudgetsTotal[wp.ost_wp.wp_official_code])
          this.summaryBudgetsTotal[wp.ost_wp.wp_official_code] = 0;

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

         const filterd_results = result.filter((r: any) => r.category.includes('OUTPUT'))
         if(filterd_results.length > 0){
          const indicator_filterd = [...result.filter((r: any) => !r.category.includes('OUTPUT')),...filterd_results.filter((d:any)=> d?.pooled_centers?.map((d:any)=>d.code).includes(partner.code))];
          const updatedIndicators = indicator_filterd.map((res: any) => ({
                          ...res,
                          quantitative_indicators: (res.quantitative_indicators ?? []).filter((i: any) =>
                            i.targets?.some((t: any) =>
                              t.centers?.some((co: any) => co.code === partner.code)
                            )
                          )
                        }));
        this.partnersData[partner.code][wp.ost_wp.wp_official_code] = updatedIndicators;
         } else
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
    console.log(this.allData)
    console.log(this.values)


    this.savedValues = this.submission_data.consolidated;
    console.log(this.savedValues)

    this.setvalues(this.savedValues.values, this.savedValues.perValues);

    this.savedValuesForIndicator = await this.submissionService.getSavedDataIndicatorVersion(
      this.initiativeId,
      this.submission_data.phase.id,
      this.submission_data.id
    );

    this.setvaluesForIndicators(this.savedValuesForIndicator);
    this.setPartnervaluesForIndicators(this.savedValuesForIndicator);

    this.setTotalTargetForIndicators();
    this.setTotalTargetForIndicatorsForPartners();
    this.setItemIndicatorAndBudget();
    this.sammaryCalc();
    this.getTotalIndValuesByPartner(this.totalTargetsIndicatorPartners);
    await this.setAnaplanValues();


    if(!this.initiative_data.synchronized){
      const newIPSR = this.allData["IPSR"]
        .filter((d: any) => d.value != "")
        .sort((a: any, b: any) => +(a.ipsr.id - b.ipsr.id));
      this.allData["IPSR"] = newIPSR;
    }

  //sort (Cross Cutting)
  const firstKey = Object.keys(this.allData)[0];
    const newCROSS = this.allData[firstKey].filter((d: any) => d.category == "Cross Cutting").sort((a: any, b: any) => b?.title?.toLowerCase().localeCompare(a?.title?.toLowerCase()));
    this.allData[firstKey] = this.allData[firstKey].filter((d: any) => d.category != "Cross Cutting").sort((a: any, b: any) => a?.title?.toLowerCase().localeCompare(b?.title?.toLowerCase()));
    newCROSS.forEach((d: any) => this.allData[firstKey].unshift(d))

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
  allBudgetAssumptions: any[] = [];
  anaplanLabels: any[] = [];
  anaplanValues: any[] = [];
  allCenterCountryValues: any[] = [];
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

    this.clarisaCountries = await this.countryService.getAll();
    this.allCenterCountryValues = await this.countryService.getAllValues(this.submission_data.phase.id);

    if (this.partners.length < 1) {
      this.partners = await this.submissionService.getOrganizations();
    }
    const tab = this.activatedRoute.snapshot.queryParamMap.get('tab');
    if (tab) {
      this.selectedTabIndex = tab ? +tab : 0;

    } 
    const aowTab = this.activatedRoute.snapshot.queryParamMap.get('AOW');
    if (aowTab) {
      this.selectedTabIndexAOW = aowTab ? +aowTab : 0;
    } 
    this.organizationSelected = this.partners[0];

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
    ]
    this.allBudgetAssumptions = await this.budgetAssumptionsService.getAll(this.submission_data.phase.id);

    this.InitData();
    this.period = this.submission_data.phase.periods;

    this.initiativeId = this.submission_data.initiative.id;
    this.officalCode = this.params.code;
    console.log(this.initiativeId);
    this.setItemIndicatorAndBudget();
    this.sammaryCalc();
    this.recomputeIndicatorBudgetTotals();
    this.cdr.detectChanges();
  }

  setItemIndicatorAndBudget() {
    if (!this.displayBudgetValuesIndicator) return;
  
    Object.keys(this.displayBudgetValuesIndicator).forEach((code) => {
      const orgObj = this.displayBudgetValuesIndicator[code];
      if (!orgObj) return;
  
      Object.keys(orgObj).forEach((wp_id) => {
        const wpObj = orgObj[wp_id];
        if (!wpObj) return;
  
        Object.keys(wpObj).forEach((item_id) => {
          const itemObj = wpObj[item_id];
          if (!itemObj) return;
  
          let sum = 0;
          let total = 0;
  
          Object.keys(itemObj).forEach((indicator_id) => {
            const value = itemObj[indicator_id];
            sum += Number(value) || 0;
          });
  
          this.displayBudgetValuesItemIndicator[code] ??= {};
          this.displayBudgetValuesItemIndicator[code][wp_id] ??= {};
          this.budgetValues[code] ??= {};
          this.budgetValues[code][wp_id] ??= {};
          this.displayBudgetValues[code] ??= {};
          this.displayBudgetValues[code][wp_id] ??= {};
          this.wp_budgets[code] ??= {};
  
          this.displayBudgetValuesItemIndicator[code][wp_id][item_id] = sum;
          this.budgetValues[code][wp_id][item_id] = sum;
          this.displayBudgetValues[code][wp_id][item_id] = sum;
  
          Object.values(this.displayBudgetValuesItemIndicator[code][wp_id]).forEach((val) => {
            if (typeof val === "number") {
              total += Number(val) || 0;
            }
          });
  
          this.wp_budgets[code][wp_id] = total;
        });
      });
    });
  }

  setvaluesForIndicators(data: any[]) {
    const indicatorIds = this.results[this.results.length - 1].indicator_ids;
    const ids = Object.values(indicatorIds);
    const filtered = data.filter(item => ids.includes(item.result_uuid));
  
    for (let value of filtered) {
      const org = value.organization_code;
      const wp = value.workPackage.wp_official_code;
      const parent = value.parent_id;
      const result = value.result_uuid;
  
      this.displayBudgetValuesIndicator[org] ??= {};
      this.displayBudgetValuesIndicator[org][wp] ??= {};
      this.displayBudgetValuesIndicator[org][wp][parent] ??= {};
  
      this.displayBudgetValuesIndicator[org][wp][parent][result] = Number(value.budget);
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




    //   if (!this.budgetValuesIndicatorSummary[wpCode]) {
    //     this.budgetValuesIndicatorSummary[wpCode] = {};
    //   }
  
    //   if (!this.budgetValuesIndicatorSummary[wpCode][indicatorType]) {
    //     this.budgetValuesIndicatorSummary[wpCode][indicatorType] = 0;
    //   }
  
    //   this.budgetValuesIndicatorSummary[wpCode][indicatorType] += budget;


    //   if (!this.totalBudgetValuesIndicatorPartner[orgCode]) {
    //     this.totalBudgetValuesIndicatorPartner[orgCode] = {};
    //   }
  
    //   if (!this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType]) {
    //     this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] = 0;
    //   }
  
    //   this.totalBudgetValuesIndicatorPartner[orgCode][indicatorType] += budget;
  
    //   if (!this.totalBudgetValuesIndicatorSummary[indicatorType]) {
    //     this.totalBudgetValuesIndicatorSummary[indicatorType] = 0;
    //   }
  
    //   this.totalBudgetValuesIndicatorSummary[indicatorType] += budget;
      
    }
  }

  async recomputeIndicatorBudgetTotals() {
    this.savedValuesForIndicator = await this.submissionService.getSavedDataIndicatorVersion(
      this.initiativeId,
      this.submission_data.phase.id,
      this.submission_data.id
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
  roundNumbers(values: number[]): number {
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return Math.round(sum);
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


  getTotalBudgetForEachPartner(budgets: { [key: string]: any }) {
    if (!budgets || typeof budgets !== 'object') return '0';
      return Object.entries(budgets)
        .filter(([key]) => 
          !key.includes('-project')
        )
        .reduce((sum, [, value]) => sum + Number(value || 0), 0)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerProject(budgets: { [key: string]: any }) {
    if (!budgets || typeof budgets !== 'object') return '0';
      return Object.entries(budgets)
      .filter(([key]) => key.includes("-project"))
      .reduce((sum, [_, value]) => sum + Number(value), 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerPartner(budgets: { [key: string]: any }) {
    if (!budgets || typeof budgets !== 'object') return '0';
      return Object.entries(budgets)
      .filter(([key]) => key.includes("-partners"))
      .reduce((sum, [_, value]) => sum + Number(value), 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  getTotalBudgetForEachPartnerMelia(budgets: { [key: string]: any }) {
    if (!budgets || typeof budgets !== 'object') return '0';
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

              this.values[code][wp_id][item_id] = percentValue;
              this.displayValues[code][wp_id][item_id] =
                Math.round(percentValue);
              this.budgetValues[code][wp_id][item_id] = percentValue;
              this.displayBudgetValues[code][wp_id][item_id] =
                Math.round(percentValue);
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
    this.setIndecatorValues();
    this.getAllMeliasLength()
  }
  checkEOI(category: any) {
    return this.submission_data.phase?.show_eoi ? category == "EOI" : false;
  }
  async getDataForWp(
    id: string,
    partner_code: any | null = null,
    official_code: any = null,
    ost_wp_acronym: string,
    wp_category: string
  ) {
    let wp_data;
    if(wp_category != 'Projects' && wp_category != 'Geographic-Scope' && wp_category != 'partners' && wp_category != 'melia' && wp_category != 'Cross Cutting' && wp_category != 'synergy-programs') {
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
    }  else if(wp_category == 'synergy-programs') {
      wp_data = this.results.filter((d: any) => {
        if (partner_code)
          return (
            (d.category == "synergy-programs") &&
            (
              (d?.wp.id == id && d.category == 'synergy-programs' && wp_category == 'synergy-programs')
            )
          );
        else
        return (
          (d.category == "synergy-programs") &&
          (
            (d?.wp.id == id && d.category == 'synergy-programs' && wp_category == 'synergy-programs')
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
          const dataId = data.id;
          const indicatorValues = data.pooled_funded_indicator_values || {};
  
          if (!this.perAllValuesIndicator[group][dataId]) {
            this.perAllValuesIndicator[group][dataId] = {};
          }
  
          for (let key of this.indicatorTypes) {
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

  getTargetValue(targets: any[],code:string='') {
   let  filterd;
    
    if(code!='')
      filterd = targets.filter((target:any)=>target?.centers?.map((d:any)=>d.code).includes(code))
    else
      filterd = targets;
    return filterd.reduce((sum, target) => {
      const val = parseFloat(target?.[this.submission_data.phase.reportingYear]) || 0; 
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
            : indicator?.type?.value + '-' + wpData.category;
    
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
              const value = parseFloat(target[this.submission_data.phase.reportingYear]); 
              if (!isNaN(value)) {
                this.totalTargetsIndicatorPartners[partnerCode][wpCode][indicatorType] += value;
              }
            }
          }
        }
      }
    }
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

  async setAnaplanValues() {
    this.anaplanValues = await this.anaplanService.getAllValuesVersion(this.initiativeId, this.submission_data.id,this.submission_data.phase.id);
    for(let values of this.anaplanValues){
     this.anaplanBudgets[values.organization.code][values.workPackage.wp_official_code][values.anaplan.id] = values.value
    }
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
    return this.decimalPipe.transform(totals[wp], '1.2-2');;
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
    return this.decimalPipe.transform(totals[anaplan_id], '1.2-2');
  }

  getAnaplanTotal(partnerCode: number):number {
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
  getAnaplanValueAcrossPartners(wpCode: string, anaplanId: number) {
    let total = 0;
  
    for (const partnerCode in this.anaplanBudgets) {
      const partnerData = this.anaplanBudgets[partnerCode];
      const wpData = partnerData[wpCode];
      if (wpData && wpData[anaplanId] !== undefined) {
        total += Number(wpData[anaplanId]) || 0;
      }
    }
  
    return this.decimalPipe.transform(total, '1.2-2');
  }
  getTotalByAnaplanId(anaplanId: number): number {
    let total = 0;
  
    for (const partnerCode in this.anaplanBudgets) {
      const partnerData = this.anaplanBudgets[partnerCode];
      for (const wpCode in partnerData) {
        const wpData = partnerData[wpCode];
        if (wpData && wpData[anaplanId] !== undefined) {
          total += Number(wpData[anaplanId]) || 0;
        }
      }
    }
  
    return total;
  }


  getWpTotalsAcrossPartners(wpCode: string) {
    let total = 0;
  
    for (const partnerCode in this.anaplanBudgets) {
      const partnerData = this.anaplanBudgets[partnerCode];
      const wpData = partnerData[wpCode];
      if (wpData) {
        for (const anaplanId in wpData) {
          total += Number(wpData[anaplanId]) || 0;
        }
      }
    }
  
    return this.decimalPipe.transform(total, '1.2-2');
  }

  getSummaryTotalAnaplan(): number {
    let total = 0;
  
    for (const partnerCode in this.anaplanBudgets) {
      const partnerData = this.anaplanBudgets[partnerCode];
      for (const wpCode in partnerData) {
        const wpData = partnerData[wpCode];
        for (const anaplanId in wpData) {
          total += Number(wpData[anaplanId]) || 0;
        }
      }
    }
  
    return total;
  }
  haveHLO(data: any[]) {
    if(data)
      return data.some(item => item.category === 'OUTPUT' && item.quantitative_indicators.length);
    else
      return false
  }

  haveselectedCountry(data: any[]) {
    return data.some(item => item.selectedCountries.length);
  }

  sort(obj: any): void {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
  
      if (Array.isArray(value)) {
        value.sort((a, b) => {
          const textA = (a.name || a.title || '').toLowerCase();
          const textB = (b.name || b.title || '').toLowerCase();
          return textA.localeCompare(textB);
        });
      } else if (typeof value === 'object' && value !== null) {
        this.sort(value);
      }
    });
  }
  sortByNameOrTitle(arr: any[]): any[] {
    if (!Array.isArray(arr)) return arr;
  
    return [...arr].sort((a, b) => {
      const textA = (a.name || a.title || '').trim().toLowerCase();
      const textB = (b.name || b.title || '').trim().toLowerCase();
      return textA.localeCompare(textB);
    });
  }
}
