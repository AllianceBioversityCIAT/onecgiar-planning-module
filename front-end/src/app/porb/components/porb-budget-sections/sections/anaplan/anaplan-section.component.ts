import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { PorbService } from "src/app/services/porb.service";

@Component({
    selector: "app-anaplan-section",
    templateUrl: "./anaplan-section.component.html",
    styleUrls: ["./anaplan-section.component.scss"],
    standalone: false
})
export class AnaplanSectionComponent implements OnChanges {
  @Input() rows: any[] = [];
  @Input() canEdit: boolean = true;
  @Output() budgetUpdated = new EventEmitter<void>();

  search = "";
  filterAccount = "";
  savingIds = new Set<number>();
  errorIds = new Set<number>();
  savedIds = new Set<number>();

  constructor(private porbService: PorbService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"]) {
      this.normalizeRows();
    }
  }

  get accountOptions(): string[] {
    return Array.from(new Set(this.rows.map((row) => String(row.account || "")).filter(Boolean))).sort();
  }

  get filteredRows() {
    const search = this.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      const account = String(row.account || "");
      const matchesSearch = !search || account.toLowerCase().includes(search);
      const matchesFilter = !this.filterAccount || account === this.filterAccount;
      return matchesSearch && matchesFilter;
    });
  }

  async saveRow(row: any) {
    if (!row?.program_id || !row?.porb_aow_id || !row?.center_id || !row?.anaplan_id) {
      return;
    }

    const savingKey = Number(row.anaplan_id);
    this.errorIds.delete(savingKey);
    this.savedIds.delete(savingKey);
    this.savingIds.add(savingKey);
    try {
      const saved = await this.porbService.updateAnaplan({
        program_id: Number(row.program_id),
        porb_aow_id: Number(row.porb_aow_id),
        center_id: Number(row.center_id),
        anaplan_id: Number(row.anaplan_id),
        budget: this.parseBudgetValue(row.porb_budget),
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

  export() {
    this.exportAsExcel(
      "anaplan-budget.xls",
      ["Main Accounts", "Budget"],
      this.filteredRows.map((row) => [row.account, row.porb_budget])
    );
  }

  private parseBudgetValue(value: any): number | null {
    const normalized = String(value ?? "")
      .replace(/,/g, "")
      .trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeRows() {
    if (!Array.isArray(this.rows)) {
      this.rows = [];
      return;
    }
    this.rows.forEach((row) => {
      if (row?.porb_budget === 0) {
        row.porb_budget = "";
      }
    });
  }

  private exportAsExcel(fileName: string, headers: string[], rows: Array<Array<string>>) {
    const headerHtml = headers.map((header) => `<th>${this.escapeHtml(header)}</th>`).join("");
    const rowsHtml = rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${this.escapeHtml(String(cell ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("");
    const tableHtml = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"></head><body>${tableHtml}</body></html>`;
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
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
