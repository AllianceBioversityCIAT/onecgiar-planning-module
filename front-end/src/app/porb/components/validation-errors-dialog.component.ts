import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-validation-errors-dialog',
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <mat-icon class="header-icon">warning</mat-icon>
        <h2>Cannot Mark as Complete</h2>
      </div>

      <div class="dialog-body">
        <p class="intro">
          <strong>{{ data.centerName }}</strong> has validation errors that must be resolved first.
        </p>

        <div class="error-cards" *ngIf="errorAows.length">
          <div class="error-card" *ngFor="let aow of errorAows">
            <mat-icon class="card-icon">error</mat-icon>
            <span>{{ aow.code || aow.aow_acrnum }}: {{ aow.title || aow.aow_name }}</span>
          </div>
        </div>

        <div class="hint-box">
          <mat-icon>lightbulb</mat-icon>
          <span>Look for the <strong>error icons (!)</strong> next to AOWs and budget sections to locate and fix each issue.</span>
        </div>
      </div>

      <div class="dialog-footer">
        <button mat-flat-button color="primary" mat-dialog-close>Got it</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      padding: 0.5rem;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .header-icon {
      color: #e65100;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-body {
      margin-bottom: 1.5rem;
    }

    .intro {
      font-size: 0.95rem;
      color: #333;
      line-height: 1.6;
      margin: 0 0 1.25rem;
    }

    .error-cards {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.85rem;
      background: #fef2f2;
      border-left: 3px solid #dc2626;
      border-radius: 4px;
      font-size: 0.9rem;
      color: #1a1a1a;
    }

    .card-icon {
      color: #dc2626;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .hint-box {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      background: #f0f7ff;
      border-radius: 6px;
      font-size: 0.88rem;
      color: #334155;
      line-height: 1.55;
    }

    .hint-box mat-icon {
      color: #2563eb;
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
    }
  `],
  standalone: false
})
export class ValidationErrorsDialogComponent {
  errorAows: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<ValidationErrorsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { centerName: string; aowErrorIds: number[]; aows: any[] }
  ) {
    this.errorAows = (data.aows || []).filter((aow: any) => data.aowErrorIds.includes(aow.id));
  }
}
