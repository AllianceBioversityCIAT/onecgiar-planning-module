import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SummaryAssumptionDialogComponent } from './summary-assumption-dialog.component';

export interface AssumptionEntry {
  center?: string;
  assumption: string;
}

@Component({
    selector: 'app-summary-assumption-icon',
    templateUrl: './summary-assumption-icon.component.html',
    styleUrls: ['./summary-assumption-icon.component.scss'],
    standalone: false
})
export class SummaryAssumptionIconComponent {
  /** Single assumption string (backward compat) */
  @Input() assumption: string;
  /** Multiple assumptions with center labels */
  @Input() assumptions: AssumptionEntry[];
  /** Label for the dialog title */
  @Input() label = 'Budget Assumption';

  constructor(private dialog: MatDialog) {}

  get hasAssumption(): boolean {
    if (this.assumptions?.length) {
      return this.assumptions.some(a => !!a.assumption?.trim());
    }
    return !!this.assumption?.trim();
  }

  onIconClick() {
    if (!this.hasAssumption) return;
    const entries: AssumptionEntry[] = this.assumptions?.length
      ? this.assumptions.filter(a => !!a.assumption?.trim())
      : [{ assumption: this.assumption }];

    this.dialog.open(SummaryAssumptionDialogComponent, {
      data: { label: this.label, entries },
      width: '500px',
      autoFocus: false,
    });
  }
}
