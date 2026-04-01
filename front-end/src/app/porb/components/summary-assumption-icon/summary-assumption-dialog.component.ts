import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AssumptionEntry } from './summary-assumption-icon.component';

@Component({
  selector: 'app-summary-assumption-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.label }}</h2>
    <mat-dialog-content>
      <div *ngFor="let entry of data.entries" class="assumption-entry">
        <div class="assumption-center" *ngIf="entry.center">{{ entry.center }}</div>
        <div class="assumption-text">{{ entry.assumption }}</div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .assumption-entry {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
      &:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    }
    .assumption-center {
      font-weight: 600;
      font-size: 0.85rem;
      color: #475569;
      margin-bottom: 0.3rem;
    }
    .assumption-text {
      white-space: pre-wrap;
      line-height: 1.5;
    }
  `],
  standalone: false
})
export class SummaryAssumptionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SummaryAssumptionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { label: string; entries: AssumptionEntry[] }
  ) {}
}
