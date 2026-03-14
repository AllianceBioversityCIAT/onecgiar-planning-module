import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { firstValueFrom } from "rxjs";
import { ClearBudgetConfirmDialogComponent } from "../clear-budget-confirm-dialog.component";

@Component({
  selector: "app-budget-and-assumption",
  templateUrl: "./budget-and-assumption.component.html",
  styleUrls: ["./budget-and-assumption.component.scss"],
})
export class BudgetAndAssumptionComponent {
  @Input() value: string | number | null = "";
  @Input() assumption = "";
  @Input() assumptionEnabled = true;
  @Input() disabled = false;
  @Input() isSaving = false;
  @Input() isError = false;
  @Input() isSaved = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() assumptionChange = new EventEmitter<string>();
  @Output() assumptionCommit = new EventEmitter<string>();
  @Output() commit = new EventEmitter<void>();
  @Output() pasteBudget = new EventEmitter<ClipboardEvent>();

  showAssumptionModal = false;
  draftAssumption = "";
  private previousValue: string | number | null = "";

  constructor(private dialog: MatDialog) {}

  onValueChange(next: string) {
    this.valueChange.emit(next ?? "");
  }

  onFocus() {
    this.previousValue = this.value;
  }

  async onBlur() {
    const currentIsEmpty = !this.isNonZeroBudget(this.value);
    const previousWasNonEmpty = this.isNonZeroBudget(this.previousValue);
    const hasAssumption = String(this.assumption || "").trim().length > 0;

    if (currentIsEmpty) {
      this.valueChange.emit("");

      if (!previousWasNonEmpty) {
        return;
      }

      if (hasAssumption) {
        const ref = this.dialog.open(ClearBudgetConfirmDialogComponent, {
          width: "400px",
        });
        const confirmed = await firstValueFrom(ref.afterClosed());
        if (confirmed) {
          this.assumptionChange.emit("");
          this.commit.emit();
        } else {
          this.valueChange.emit(String(this.previousValue ?? ""));
        }
        return;
      }

      this.commit.emit();
      return;
    }

    this.commit.emit();
  }

  private isNonZeroBudget(val: string | number | null): boolean {
    const s = String(val ?? "").replace(/,/g, "").trim();
    if (!s) return false;
    const n = Number(s);
    return Number.isFinite(n) && n !== 0;
  }

  onPaste(event: ClipboardEvent) {
    this.pasteBudget.emit(event);
  }

  get hasBudget(): boolean {
    return String(this.value ?? "").trim().length > 0;
  }

  get hasAssumption(): boolean {
    return String(this.assumption || "").trim().length > 0;
  }

  get iconState(): "disabled" | "active" | "completed" {
    if (!this.hasBudget || this.disabled || !this.assumptionEnabled) {
      return "disabled";
    }
    if (this.hasAssumption) {
      return "completed";
    }
    return "active";
  }

  openAssumptionModal() {
    if (this.iconState === "disabled") {
      return;
    }
    this.draftAssumption = this.assumption || "";
    this.showAssumptionModal = true;
  }

  closeAssumptionModal() {
    this.showAssumptionModal = false;
  }

  saveAssumption() {
    const next = String(this.draftAssumption || "");
    this.assumptionChange.emit(next);
    this.assumptionCommit.emit(next);
    this.showAssumptionModal = false;
  }
}
