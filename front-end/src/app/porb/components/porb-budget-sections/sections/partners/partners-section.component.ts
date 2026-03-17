import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { ClarisaCountryService } from "src/app/services/clarisa-country.service";
import { PorbService } from "src/app/services/porb.service";
import { ConfirmComponent, ConfirmDialogModel } from "src/app/confirm/confirm.component";
import { PartnerResolveDialogComponent } from "./partner-resolve-dialog.component";

type CountryOption = {
  code: number;
  name: string;
};

@Component({
    selector: "app-partners-section",
    templateUrl: "./partners-section.component.html",
    styleUrls: ["./partners-section.component.scss"],
    standalone: false
})
export class PartnersSectionComponent implements OnInit, OnChanges {
  @Input() rows: any[] = [];
  @Input() selectedCenterId: number | undefined;
  @Input() canEdit: boolean = true;
  @Input() programId: number | undefined;
  @Input() porbAowId: number | undefined;
  @Output() budgetUpdated = new EventEmitter<void>();
  @Output() rowAdded = new EventEmitter<void>();

  search = "";
  filterContracted = "";
  filterCountry = "";
  savingIds = new Set<number>();
  errorIds = new Set<number>();
  savedIds = new Set<number>();
  countryOptions: CountryOption[] = [];
  addingUnknown = false;
  deletingIds = new Set<number>();

  constructor(
    private porbService: PorbService,
    private clarisaCountryService: ClarisaCountryService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  async ngOnInit() {
    const countries = await this.clarisaCountryService.getAll();
    this.countryOptions = Array.isArray(countries)
      ? countries
          .map((country: any) => ({
            code: Number(country?.code),
            name: String(country?.name || "").trim(),
          }))
          .filter((country: CountryOption) => Number.isFinite(country.code) && country.name.length > 0)
          .sort((a: CountryOption, b: CountryOption) => a.name.localeCompare(b.name))
      : [];
    this.normalizeRows();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["rows"]) {
      this.normalizeRows();
    }
  }

  get contractedOptions(): string[] {
    return ["Contracted", "Not Contracted"];
  }

  get countryFilterOptions(): CountryOption[] {
    const codesInData = new Set<number>();
    this.rows.forEach((row) => {
      this.getCountryCodes(row).forEach((code) => codesInData.add(code));
    });
    return this.countryOptions.filter((c) => codesInData.has(c.code));
  }

  get filteredRows() {
    const search = this.search.trim().toLowerCase();
    const filterCountryCode = this.filterCountry ? Number(this.filterCountry) : null;
    return this.rows.filter((row) => {
      const geoLabel = this.getCountryNamesLabel(row);
      const matchesSearch =
        !search ||
        String(row.partner_name || "").toLowerCase().includes(search) ||
        String(row.partner_outputs || "").toLowerCase().includes(search) ||
        geoLabel.toLowerCase().includes(search);
      const contracted = this.isContracted(row);
      const matchesContracted =
        !this.filterContracted ||
        (this.filterContracted === "Contracted" && contracted) ||
        (this.filterContracted === "Not Contracted" && !contracted);
      const matchesCountry =
        !filterCountryCode ||
        this.getCountryCodes(row).includes(filterCountryCode);
      return matchesSearch && matchesContracted && matchesCountry;
    });
  }

  isContracted(row: any): boolean {
    return (
      row?.partner_is_contracted === true ||
      row?.partner_is_contracted === "true" ||
      row?.partner_is_contracted === "1" ||
      row?.partner_is_contracted === 1
    );
  }

  get subtotal(): string {
    const total = this.filteredRows.reduce((sum, r) => sum + (Number(r.partner_budget) || 0), 0);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(total);
  }

  rowHasValidationError(row: any): boolean {
    const budget = this.parseBudgetValue(row?.partner_budget);
    const hasBudget = budget != null && budget > 0;
    const hasAssumption = String(row?.partner_assumption ?? "").trim().length > 0;
    if (hasBudget && !hasAssumption) {
      return true;
    }
    if (this.isContracted(row)) {
      return !hasBudget || !hasAssumption;
    }
    return false;
  }

  rowErrorMessage(row: any): string {
    if (this.isContracted(row)) {
      const budget = this.parseBudgetValue(row?.partner_budget);
      const hasBudget = budget != null && budget > 0;
      const hasAssumption = String(row?.partner_assumption ?? "").trim().length > 0;
      if (!hasBudget && !hasAssumption) {
        return "Contracted partner requires budget and assumption";
      }
      if (!hasBudget) {
        return "Contracted partner requires budget";
      }
      if (!hasAssumption) {
        return "Contracted partner requires assumption";
      }
    }
    return "Budget requires assumption";
  }

  compareCountryCodes = (left: any, right: any): boolean => Number(left) === Number(right);

  getCountryNamesLabel(row: any): string {
    const codeSet = new Set(this.getCountryCodes(row));
    if (!codeSet.size) {
      return "";
    }
    return this.countryOptions
      .filter((country) => codeSet.has(country.code))
      .map((country) => country.name)
      .join(", ");
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

  isRecentlyUpdated(row: any): boolean {
    if (!row?.updated_at) return false;
    return (Date.now() - new Date(row.updated_at).getTime()) < 20 * 60 * 1000;
  }

  async deleteRow(row: any) {
    if (!row?.id) return;
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: new ConfirmDialogModel(
        "Delete TOC-Deleted Item",
        `Are you sure you want to delete "${row.partner_name}"? This row no longer exists in TOC. Any budget data will be lost.`
      ),
    });
    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;
      this.deletingIds.add(row.id);
      try {
        const result = await this.porbService.deleteUnknownPartner(row.id);
        if (result) {
          this.rows = this.rows.filter(r => r.id !== row.id);
          this.budgetUpdated.emit();
        } else {
          this.toastr.error("Failed to delete item. Please try again.");
        }
      } finally {
        this.deletingIds.delete(row.id);
      }
    });
  }

  async addUnknownPartner() {
    if (!this.programId || !this.porbAowId || !this.selectedCenterId) return;
    this.addingUnknown = true;
    try {
      const result = await this.porbService.createUnknownPartner({
        program_id: this.programId,
        porb_aow_id: this.porbAowId,
        center_id: this.selectedCenterId,
      });
      if (result) {
        this.toastr.success(
          `"${result.partner_name}" added. Set contracted, countries, and budget to complete it.`,
          "Unknown Partner Added"
        );
        this.rowAdded.emit();
      } else {
        this.toastr.error("Failed to add unknown partner. Please try again.");
      }
    } finally {
      this.addingUnknown = false;
    }
  }

  openResolveDialog(row: any) {
    const dialogRef = this.dialog.open(PartnerResolveDialogComponent, {
      width: '500px',
      data: { partnerId: row.id },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.resolved) {
        this.rowAdded.emit();
      }
    });
  }

  deleteUnknownPartner(row: any) {
    if (!row?.id) return;
    const dialogRef = this.dialog.open(ConfirmComponent, {
      data: new ConfirmDialogModel(
        "Delete Unknown Partner",
        `Are you sure you want to delete "${row.partner_name}"? Any budget data entered for this partner will be lost.`
      ),
    });
    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (!confirmed) return;
      this.deletingIds.add(row.id);
      try {
        const result = await this.porbService.deleteUnknownPartner(row.id);
        if (result) {
          this.toastr.success(`"${row.partner_name}" deleted.`);
          this.rowAdded.emit();
        } else {
          this.toastr.error("Failed to delete partner. Please try again.");
        }
      } finally {
        this.deletingIds.delete(row.id);
      }
    });
  }

  export() {
    this.exportAsExcel(
      "partners-pooled-funding.xls",
      ["Partner Name", "Outputs", "Contracted", "Geo", "Budget"],
      this.filteredRows.map((row) => [
        row.partner_name,
        row.partner_outputs,
        this.isContracted(row) ? "Yes" : "No",
        this.getCountryNamesLabel(row),
        row.partner_budget,
      ])
    );
  }

  async saveRow(row: any) {
    if (!row?.id) {
      return;
    }
    const contracted = this.isContracted(row);
    const countryCodes = this.getCountryCodes(row);
    if (contracted && !countryCodes.length) {
      return;
    }

    const geoLabel = this.getCountryNamesLabel(row);
    row.partner_geo = geoLabel;

    this.errorIds.delete(row.id);
    this.savedIds.delete(row.id);
    this.savingIds.add(row.id);
    try {
      const saved = await this.porbService.updatePartner(row.id, {
        partner_is_contracted: contracted,
        center_id: this.selectedCenterId ?? row.center_id,
        partner_geo: geoLabel,
        partner_country_codes: countryCodes,
        partner_budget: contracted ? this.parseBudgetValue(row.partner_budget) : null,
        partner_assumption: row.partner_assumption ?? "",
      });
      this.savingIds.delete(row.id);
      if (saved && typeof saved === "object") {
        row.partner_geo = saved.partner_geo ?? row.partner_geo;
        row.partner_budget = saved.partner_budget ?? null;
        row.partner_assumption = saved.partner_assumption ?? row.partner_assumption ?? "";
        row.partner_is_contracted = saved.partner_is_contracted ?? row.partner_is_contracted;
        row.partner_country_codes = this.normalizeCountryCodes(saved.partner_country_codes);
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
    geoField: string
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
      if (cells[1] != null && cells[1] !== "") {
        const countryCodes = this.parseCountrySelectionText(cells[1]);
        if (countryCodes.length) {
          row.partner_country_codes = countryCodes;
          row[geoField] = this.getCountryNamesLabel(row);
        }
      }
      changedRows.push(row);
    });

    await Promise.all(changedRows.map((row) => this.saveRow(row)));
  }

  private normalizeRows() {
    if (!Array.isArray(this.rows)) {
      this.rows = [];
      return;
    }
    this.rows.forEach((row) => {
      row.partner_country_codes = this.normalizeCountryCodes(row?.partner_country_codes);
      if (row?.partner_budget === 0) {
        row.partner_budget = "";
      }
      row.partner_assumption = row.partner_assumption ?? "";
      row.partner_geo = this.getCountryNamesLabel(row) || row.partner_geo || "";
    });
  }

  private getCountryCodes(row: any): number[] {
    if (!row) {
      return [];
    }
    if (Array.isArray(row.partner_country_codes)) {
      return this.normalizeCountryCodes(row.partner_country_codes);
    }
    return [];
  }

  private normalizeCountryCodes(rawCodes: Array<number | string>): number[] {
    if (!Array.isArray(rawCodes)) {
      return [];
    }
    const normalized = [...new Set(
      rawCodes
        .map((code) => Number(code))
        .filter((code) => Number.isFinite(code))
    )];
    if (!this.countryOptions.length) {
      return normalized;
    }
    const validCodes = new Set(this.countryOptions.map((country) => country.code));
    return normalized.filter((code) => validCodes.has(code));
  }

  private parseCountrySelectionText(text: string): number[] {
    const tokens = String(text || "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.length) {
      return [];
    }

    const byCode = new Map<number, CountryOption>();
    const byName = new Map<string, CountryOption>();
    this.countryOptions.forEach((country) => {
      byCode.set(country.code, country);
      byName.set(country.name.toLowerCase(), country);
    });

    const selected: number[] = [];
    tokens.forEach((token) => {
      const numericCode = Number(token);
      if (Number.isFinite(numericCode) && byCode.has(numericCode)) {
        selected.push(numericCode);
        return;
      }
      const country = byName.get(token.toLowerCase());
      if (country) {
        selected.push(country.code);
      }
    });

    return [...new Set(selected)];
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
