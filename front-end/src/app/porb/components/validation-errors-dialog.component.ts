import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-validation-errors-dialog',
  template: `
    <div class="dialog-wrapper">
      <div class="dialog-header">
        <mat-icon class="header-icon">warning</mat-icon>
        <h2>{{ data.title || 'Cannot Mark as Complete' }}</h2>
      </div>

      <div class="dialog-body">
        <p class="intro">{{ data.message }}</p>

        <div class="error-section" *ngFor="let group of errorGroups">
          <div class="error-section-title" *ngIf="group.label">{{ group.label }}</div>
          <div class="error-cards">
            <div class="error-card" *ngFor="let item of group.items">
              <mat-icon class="card-icon">error</mat-icon>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div class="hint-box">
          <mat-icon>lightbulb</mat-icon>
          <span>Look for the <strong>error icons (!)</strong> next to centers, AOWs, and budget sections to locate and fix each issue.</span>
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
      font-size: 1.6rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .header-icon {
      color: #e65100;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .dialog-body {
      margin-bottom: 1.5rem;
    }

    .intro {
      font-size: 1.15rem;
      color: #333;
      line-height: 1.6;
      margin: 0 0 1.5rem;
    }

    .error-cards {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #fef2f2;
      border-left: 3px solid #dc2626;
      border-radius: 4px;
      font-size: 1.1rem;
      color: #1a1a1a;
    }

    .card-icon {
      color: #dc2626;
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .hint-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.15rem;
      background: #f0f7ff;
      border-radius: 6px;
      font-size: 1.05rem;
      color: #334155;
      line-height: 1.6;
    }

    .hint-box mat-icon {
      color: #2563eb;
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .error-section {
      margin-bottom: 1.25rem;
    }

    .error-section-title {
      font-weight: 600;
      font-size: 1.05rem;
      color: #1a1a1a;
      margin-bottom: 0.5rem;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
    }
  `],
  standalone: false
})
export class ValidationErrorsDialogComponent {
  errorGroups: { label: string; items: string[] }[] = [];

  constructor(
    public dialogRef: MatDialogRef<ValidationErrorsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title?: string;
      message: string;
      centerName?: string;
      aowErrorIds?: number[];
      aows?: any[];
      centerErrorCodes?: string[];
      centers?: any[];
    }
  ) {
    // Center errors
    if (data.centerErrorCodes?.length && data.centers?.length) {
      const codes = data.centerErrorCodes!;
      const errorCenters = data.centers.filter((c: any) =>
        codes.includes(String(c.code))
      );
      if (errorCenters.length) {
        this.errorGroups.push({
          label: errorCenters.length > 1 ? 'Centers with errors' : '',
          items: errorCenters.map((c: any) => c.acronym || c.name || `Center ${c.code}`),
        });
      }
    }

    // AOW errors
    if (data.aowErrorIds?.length && data.aows?.length) {
      const ids = data.aowErrorIds!;
      const errorAows = data.aows.filter((aow: any) => ids.includes(aow.id));
      if (errorAows.length) {
        this.errorGroups.push({
          label: this.errorGroups.length ? 'Areas of Work with errors' : '',
          items: errorAows.map((aow: any) =>
            `${aow.code || aow.aow_acrnum}: ${aow.title || aow.aow_name}`
          ),
        });
      }
    }
  }
}
