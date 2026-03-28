import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PorbService } from "src/app/services/porb.service";
import { CountryAddDialogComponent } from "./country-add-dialog.component";

@Component({
  selector: "app-country-percentage-section",
  templateUrl: "./country-percentage-section.component.html",
  styleUrls: ["./country-percentage-section.component.scss"],
  standalone: false,
})
export class CountryPercentageSectionComponent implements OnChanges {
  @Input() rows: any[] = [];
  @Input() pooledTotal: number = 0;
  @Input() selectedProgramId: number | undefined;
  @Input() selectedPorbAowId: number | undefined;
  @Input() selectedCenterId: number | undefined;
  @Input() canEdit: boolean = true;
  @Input() isAow00: boolean = false;
  @Output() budgetUpdated = new EventEmitter<void>();
  @Output() rowAdded = new EventEmitter<void>();

  search = "";
  savingIds = new Set<string>();
  errorIds = new Set<string>();
  savedIds = new Set<string>();

  constructor(private porbService: PorbService, private dialog: MatDialog) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"]) {
      this.normalizeRows();
    }
  }

  get filteredRows(): any[] {
    const search = this.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (!search) return true;
      return String(row.country_name || "").toLowerCase().includes(search);
    });
  }

  get totalPercentage(): number {
    return this.rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);
  }

  get totalBudget(): string {
    const total = this.rows.reduce(
      (sum, r) => sum + this.getComputedBudget(r),
      0
    );
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total);
  }

  get isOverLimit(): boolean {
    return this.totalPercentage > 100;
  }

  getComputedBudget(row: any): number {
    return Math.round((Number(row.percentage) || 0) * (this.pooledTotal || 0) / 100);
  }

  getFormattedBudget(row: any): string {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(this.getComputedBudget(row));
  }

  async saveRow(row: any) {
    if (!row?.program_id || !row?.porb_aow_id || !row?.center_id || !row?.country_name) {
      return;
    }

    // Cap individual value to 100
    let pct = this.parsePercentageValue(row.percentage);
    if (pct != null && pct > 100) {
      pct = 100;
      row.percentage = 100;
    }
    if (pct != null && pct < 0) {
      pct = 0;
      row.percentage = 0;
    }

    // Block if total exceeds 100
    if (this.totalPercentage > 100) {
      row.percentage = null;
      return;
    }

    const savingKey = String(row.country_name);
    this.errorIds.delete(savingKey);
    this.savedIds.delete(savingKey);
    this.savingIds.add(savingKey);

    try {
      const percentage = pct;
      const saved = await this.porbService.updateCountryPercentage({
        program_id: Number(row.program_id),
        porb_aow_id: Number(row.porb_aow_id),
        center_id: Number(row.center_id),
        country_name: String(row.country_name),
        percentage,
      });
      this.savingIds.delete(savingKey);
      if (saved) {
        this.savedIds.add(savingKey);
        setTimeout(() => this.savedIds.delete(savingKey), 1200);
        this.budgetUpdated.emit();
      } else {
        this.errorIds.add(savingKey);
      }
    } catch {
      this.savingIds.delete(savingKey);
      this.errorIds.add(savingKey);
    }
  }

  openAddCountryDialog() {
    const dialogRef = this.dialog.open(CountryAddDialogComponent, {
      width: '500px',
      data: {
        existingCountries: this.rows.map((r) => r.country_name),
        programId: this.selectedProgramId,
        porbAowId: this.selectedPorbAowId,
        centerId: this.selectedCenterId,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.rowAdded.emit();
    });
  }

  async deleteManualCountry(row: any) {
    if (!row?.id || !confirm('Are you sure you want to delete this country?')) return;
    try {
      await this.porbService.deleteManualCountry(row.id);
      this.rowAdded.emit();
    } catch {}
  }

  export() {
    this.exportAsExcel(
      "country-percentage.xls",
      ["Country", "Percentage (%)"],
      this.filteredRows.map((row) => [
        row.country_name,
        String(row.percentage ?? ""),
      ])
    );
  }

  private parsePercentageValue(value: any): number | null {
    const normalized = String(value ?? "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeRows() {
    if (!Array.isArray(this.rows)) {
      this.rows = [];
      return;
    }
    this.rows.forEach((row) => {
      if (row?.percentage === 0) row.percentage = null;
      row.percentage = row.percentage ?? null;
    });
  }

  private exportAsExcel(
    fileName: string,
    headers: string[],
    rows: Array<Array<string>>
  ) {
    const headerHtml = headers
      .map((header) => `<th>${this.escapeHtml(header)}</th>`)
      .join("");
    const rowsHtml = rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${this.escapeHtml(String(cell ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("");
    const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${tableHtml}</body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
