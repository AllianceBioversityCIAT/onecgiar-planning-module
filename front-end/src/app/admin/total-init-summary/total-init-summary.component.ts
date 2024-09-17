import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Meta, Title } from '@angular/platform-browser';
import { HeaderService } from 'src/app/header.service';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { OrganizationsService } from 'src/app/services/organizations.service';
import { PhasesService } from 'src/app/services/phases.service';

@Component({
  selector: 'app-total-init-summary',
  templateUrl: './total-init-summary.component.html',
  styleUrls: ['./total-init-summary.component.scss']
})
export class TotalInitSummaryComponent implements OnInit {
  constructor(
    private headerService: HeaderService,
    private initiativesService: InitiativesService,
    private phaseService: PhasesService,
    private organizationService: OrganizationsService,

    private title: Title,
    private meta: Meta,
    private fb: FormBuilder
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundFooter =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.filterForm = this.fb.group({
      phase_id: [null]
    });
  }

  columnsToDisplay: string[] = [
    "id",
    "title",
    'total_budget',
  ];
  newColumnsToDisplay: any = [];
  phases: any;
  organization: any;

  activePhases: any;



  dataSource: any;
  filterForm: FormGroup = new FormGroup({});
  filters: any = null;
  totalBudgetForAllInit: any[];
  total: number = 0;

  async ngOnInit() {
    this.phases = await this.phaseService.getPhases();
    this.activePhases = await this.phaseService.getActivePhase();
    this.organization = await this.organizationService.getOrganizations();
    this.newColumnsToDisplay = this.columnsToDisplay.concat(this.organization.map((d: any) => d.acronym))
    this.filterForm.patchValue({
      phase_id: this.activePhases.id
    })

    await this.initTable(this.filterForm.value);
    // this.getTotalForEachPartner()



    this.setForm();
    this.title.setTitle("Budget Summary");
    this.meta.updateTag({ name: "description", content: "Budget Summary" });
  }

  setForm() {
    this.filterForm.valueChanges.subscribe(() => {
      this.filters = this.filterForm.value;
      this.initTable(this.filters);
    });
  }


  async initTable(filters = null) {
    this.dataSource = await this.initiativesService.getBudgetsForEachPartner(
      filters
    );
    this.getTotalForAllInit()

  }

  getTotalForAllInit() {
    this.totalBudgetForAllInit = this.dataSource.map((d: any) => d.submissions[0].wp_budget);

    this.totalBudgetForAllInit.forEach((d: any[]) => {
      this.total += d.map((x: any) => x.total).reduce((prev, current) =>
        prev + current)
    })
  }


  getTotalForEachPartner(partner: any) {
    let arr: any[] = [];
    this.totalBudgetForAllInit?.forEach((d: any[]) =>
      d.filter((x: any) => x.organization_code === partner.code ? arr.push(x) : 0))

    return arr.map((d: any) => d.total).reduce((prev, current) =>{
     return prev + current
    },0)
  }

  getTotalBudget(budget: any[]) {
    return budget.map((d: any) => d.total).reduce((prev, current) =>
      prev + current)
  }

}
