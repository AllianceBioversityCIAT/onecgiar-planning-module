import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BudgetAssumptionsService } from 'src/app/services/budget-assumptions.service';

@Component({
    selector: 'app-budget-assumption-summary',
    templateUrl: './budget-assumption-summary.component.html',
    styleUrls: ['./budget-assumption-summary.component.scss'],
    standalone: false
})
export class BudgetAssumptionSummaryComponent {
  constructor(
    private dialogRef: MatDialogRef<BudgetAssumptionSummaryComponent>,
    private service: BudgetAssumptionsService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  budget_assumptions: any;
 

  async ngOnInit() {
    await this.getData();
  }

  async getData() {
    console.log(this.data);
    this.budget_assumptions = await this.service.getAllByItem(this.data.item_id,this.data.initiative_id);
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
