import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PorbService } from "src/app/services/porb.service";
import { LocationAddDialogComponent } from "./location-add-dialog.component";

@Component({
  selector: "app-location-benefit-section",
  templateUrl: "./location-benefit-section.component.html",
  styleUrls: ["./location-benefit-section.component.scss"],
  standalone: false,
})
export class LocationBenefitSectionComponent implements OnChanges {
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
      return String(row.location_name || "").toLowerCase().includes(search);
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

  get isInvalidTotal(): boolean {
    const rounded = Math.round(this.totalPercentage * 100) / 100;
    return rounded !== 0 && rounded !== 100;
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

  getTypeLabel(row: any): string {
    const t = String(row.location_type || "").toLowerCase();
    if (t === "global") return "Global";
    if (t === "region") return "Region";
    return "Country";
  }

  getTypeClass(row: any): string {
    const t = String(row.location_type || "").toLowerCase();
    if (t === "global") return "global";
    if (t === "region") return "region";
    return "country";
  }

  async saveRow(row: any) {
    if (!row?.program_id || !row?.porb_aow_id || !row?.center_id || !row?.location_name) {
      return;
    }

    const pct = this.parsePercentageValue(row.percentage);

    const savingKey = `${row.location_name}::${row.location_type}`;
    this.errorIds.delete(savingKey);
    this.savedIds.delete(savingKey);
    this.savingIds.add(savingKey);

    try {
      const saved = await this.porbService.updateLocationBenefit({
        program_id: Number(row.program_id),
        porb_aow_id: Number(row.porb_aow_id),
        center_id: Number(row.center_id),
        location_name: String(row.location_name),
        location_type: String(row.location_type),
        percentage: pct,
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

  getSavingKey(row: any): string {
    return `${row.location_name}::${row.location_type}`;
  }

  openAddLocationDialog() {
    const dialogRef = this.dialog.open(LocationAddDialogComponent, {
      width: "520px",
      data: {
        existingLocations: this.rows.map((r) => ({
          name: r.location_name,
          type: r.location_type,
        })),
        programId: this.selectedProgramId,
        porbAowId: this.selectedPorbAowId,
        centerId: this.selectedCenterId,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.rowAdded.emit();
    });
  }

  async deleteManualLocation(row: any) {
    if (!row?.id || !confirm("Are you sure you want to delete this location?")) return;
    try {
      await this.porbService.deleteManualLocation(row.id);
      this.rowAdded.emit();
    } catch {}
  }

  export() {
    this.exportAsExcel(
      "location-benefit.xls",
      ["Location", "Type", "Percentage (%)"],
      this.filteredRows.map((row) => [
        row.location_name,
        this.getTypeLabel(row),
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
