import { Component } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
  selector: "app-clear-budget-confirm-dialog",
  template: `
    <h2 mat-dialog-title>Clear Budget</h2>
    <mat-dialog-content>
      This row has an assumption attached. Clearing the budget will also
      delete the assumption.
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-raised-button color="warn" (click)="dialogRef.close(true)">
        Delete Both
      </button>
    </mat-dialog-actions>
  `,
})
export class ClearBudgetConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ClearBudgetConfirmDialogComponent>
  ) {}
}
