import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { PorbService } from "src/app/services/porb.service";

@Component({
  selector: "app-pool-section",
  templateUrl: "./pool-section.component.html",
  styleUrls: ["./pool-section.component.scss"],
})
export class PoolSectionComponent implements OnChanges {
  @Input() rows: any[] = [];
  @Input() canEdit: boolean = true;
  @Output() budgetUpdated = new EventEmitter<void>();

  search = "";
  filterType = "";
  savingIds = new Set<number>();
  errorIds = new Set<number>();
  savedIds = new Set<number>();

  constructor(private porbService: PorbService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"]) {
      this.normalizeBudgetValues();
    }
  }

  get typeOptions(): string[] {
    return Array.from(
      new Set(this.rows.map((row) => row.hlo_type).filter(Boolean))
    ).sort();
  }

  get filteredRows() {
    const search = this.search.trim().toLowerCase();
    return this.rows.filter((row) => {
      const matchesSearch =
        !search ||
        String(row.hlo_name || "").toLowerCase().includes(search) ||
        String(row.hlo_description || "").toLowerCase().includes(search) ||
        String(row.hlo_geo || "").toLowerCase().includes(search) ||
        String(row.hlo_assumption || "").toLowerCase().includes(search);
      const matchesFilter = !this.filterType || row.hlo_type === this.filterType;
      return matchesSearch && matchesFilter;
    });
  }

  rowHasValidationError(row: any): boolean {
    const budget = this.parseBudgetValue(row?.hlo_budget);
    return budget != null && budget > 0 && !String(row?.hlo_assumption ?? "").trim();
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

  export() {
    this.exportAsExcel(
      "pool-funding-hlo.xls",
      [
        "HLO Name",
        "Description",
        "Type",
        "Geo",
        "Target",
        "Budget",
      ],
      this.filteredRows.map((row) => [
        row.hlo_name,
        row.hlo_description,
        row.hlo_type,
        row.hlo_geo,
        row.hlo_target,
        row.hlo_budget,
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
      const saved = await this.porbService.updateHlo(row.id, {
        hlo_budget: this.parseBudgetValue(row.hlo_budget),
        hlo_assumption: row.hlo_assumption ?? "",
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
      if (row?.hlo_budget === 0) {
        row.hlo_budget = "";
      }
    });
  }
}
