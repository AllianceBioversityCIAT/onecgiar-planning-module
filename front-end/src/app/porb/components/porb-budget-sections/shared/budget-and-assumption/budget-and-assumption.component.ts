import { Component, EventEmitter, Input, Output } from "@angular/core";

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

  @Output() valueChange = new EventEmitter<string>();
  @Output() assumptionChange = new EventEmitter<string>();
  @Output() assumptionCommit = new EventEmitter<string>();
  @Output() commit = new EventEmitter<void>();
  @Output() pasteBudget = new EventEmitter<ClipboardEvent>();

  showAssumptionModal = false;
  draftAssumption = "";

  onValueChange(next: string) {
    this.valueChange.emit(next ?? "");
  }

  onBlur() {
    this.commit.emit();
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
