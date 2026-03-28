import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { PorbService } from "src/app/services/porb.service";

@Component({
    selector: "app-melia-section",
    templateUrl: "./melia-section.component.html",
    styleUrls: ["./melia-section.component.scss"],
    standalone: false
})
export class MeliaSectionComponent implements OnChanges {
  @Input() rows: any[] = [];
  @Input() canEdit: boolean = true;
  @Output() budgetUpdated = new EventEmitter<void>();

  search = "";
  filterOutputs = "";
  savingIds = new Set<number>();
  errorIds = new Set<number>();
  savedIds = new Set<number>();
  deletingIds = new Set<number>();

  constructor(private porbService: PorbService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"]) {
      this.normalizeBudgetValues();
    }
  }

  get outputOptions(): string[] {
    return Array.from(
      new Set(this.rows.map((row) => row.melia_outputs).filter(Boolean))
    ).sort();
  }

  get filteredRows() {
    const search = this.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      const matchesSearch =
        !search ||
        String(row.melia_name || "").toLowerCase().includes(search) ||
        String(row.melia_outputs || "").toLowerCase().includes(search) ||
        String(row.melia_assumption || "").toLowerCase().includes(search);
      const matchesOutputs =
        !this.filterOutputs || row.melia_outputs === this.filterOutputs;
      return matchesSearch && matchesOutputs;
    });
  }

  get subtotal(): string {
    const total = this.filteredRows.reduce((sum, r) => sum + (Number(r.melia_budget) || 0), 0);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(total);
  }

  rowHasValidationError(row: any): boolean {
    const budget = this.parseBudgetValue(row?.melia_budget);
    return budget != null && budget > 0 && !String(row?.melia_assumption ?? "").trim();
  }

  isGroupedCellStart(rows: any[], index: number, field: string): boolean {
    if (index === 0) {
      return true;
    }
    const current = String(rows[index]?.[field] ?? "").trim();
    const previous = String(rows[index - 1]?.[field] ?? "").trim();
    return current !== previous;
  }

  getGroupedCellRowspan(rows: any[], index: number, field: string): number {
    if (!this.isGroupedCellStart(rows, index, field)) {
      return 0;
    }
    const current = String(rows[index]?.[field] ?? "").trim();
    let span = 1;
    for (let i = index + 1; i < rows.length; i += 1) {
      const next = String(rows[i]?.[field] ?? "").trim();
      if (next !== current) {
        break;
      }
      span += 1;
    }
    return span;
  }


  isTocUpdated(row: any): boolean {
    if (!row?.toc_updated_at) return false;
    if (this.isTocAdded(row)) return false;
    return (Date.now() - new Date(row.toc_updated_at).getTime()) < 24 * 60 * 60 * 1000;
  }

  isTocAdded(row: any): boolean {
    if (!row?.toc_created_at) return false;
    return (Date.now() - new Date(row.toc_created_at).getTime()) < 24 * 60 * 60 * 1000;
  }

  async deleteRow(row: any) {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;
    this.deletingIds.add(row.id);
    try {
      const result = await this.porbService.deleteMelia(row.id);
      if (result?.deleted) {
        this.rows = this.rows.filter(r => r.id !== row.id);
        this.budgetUpdated.emit();
      }
    } finally {
      this.deletingIds.delete(row.id);
    }
  }

  export() {
    this.exportAsExcel(
      "melia-study.xls",
      ["Melia Name", "Outputs", "Budget"],
      this.filteredRows.map((row) => [
        row.melia_name,
        row.melia_outputs,
        row.melia_budget,
      ])
    );
  }

  async saveRow(row: any) {
    if (!row?.id) {
      return;
    }
    this.errorIds.delete(row.id);
    this.savedIds.delete(row.id);
    this.savingIds.add(row.id);
    try {
      const saved = await this.porbService.updateMelia(row.id, {
        melia_budget: this.parseBudgetValue(row.melia_budget),
        melia_assumption: row.melia_assumption ?? "",
      });
      this.savingIds.delete(row.id);
      if (saved) {
        this.savedIds.add(row.id);
        setTimeout(() => this.savedIds.delete(row.id), 1200);
        this.budgetUpdated.emit();
      } else {
        this.errorIds.add(row.id);
      }
    } catch {
      this.savingIds.delete(row.id);
      this.errorIds.add(row.id);
    }
  }

  async pasteFromSpreadsheet(
    event: ClipboardEvent,
    startIndex: number,
    budgetField: string,
    assumptionField: string
  ) {
    const text = event.clipboardData?.getData("text");
    if (!text) {
      return;
    }
    event.preventDefault();

    const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
    const viewRows = this.filteredRows;
    const changedRows: any[] = [];

    lines.forEach((line, lineOffset) => {
      const row = viewRows[startIndex + lineOffset];
      if (!row) {
        return;
      }
      const cells = line.split("\t");
      if (cells[0] != null && cells[0] !== "") {
        row[budgetField] = cells[0];
      }
      if (cells[1] != null) {
        row[assumptionField] = cells[1];
      }
      changedRows.push(row);
    });

    await Promise.all(changedRows.map((row) => this.saveRow(row)));
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

  private normalizeBudgetValues() {
    if (!Array.isArray(this.rows)) {
      return;
    }
    this.rows.forEach((row) => {
      if (row?.melia_budget === 0) {
        row.melia_budget = "";
      }
      row.melia_assumption = row.melia_assumption ?? "";
    });
  }
}
