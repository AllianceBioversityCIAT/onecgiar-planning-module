import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-porb-budget-sections",
  templateUrl: "./porb-budget-sections.component.html",
  styleUrls: ["./porb-budget-sections.component.scss"],
})
export class PorbBudgetSectionsComponent {
  @Input() selectedExtraNavigation: string | null = null;
  @Input() selectedProgramId: number | undefined;
  @Input() selectedCenterId: number | undefined;
  @Input() selectedPorbAowId: number | undefined;
  @Input() poolFundingRows: any[] = [];
  @Input() partnersRows: any[] = [];
  @Input() w3Rows: any[] = [];
  @Input() meliaRows: any[] = [];
  @Input() anaplanRows: any[] = [];
  @Input() crossRows: any[] = [];
  @Input() canEdit: boolean = true;
  @Output() budgetUpdated = new EventEmitter<void>();
}
