import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-porb-sidebar",
  templateUrl: "./porb-sidebar.component.html",
  styleUrls: ["./porb-sidebar.component.scss"],
})
export class PorbSidebarComponent {
  @Input() centers: any[] = [];
  @Input() aows: any[] = [];
  @Input() extraNavigationItems: string[] = [];

  @Input() selectedCenter: any = null;
  @Input() selectedCenterKey: string | null = null;
  @Input() selectedAow: any = null;
  @Input() selectedExtraNavigation: string | null = null;

  @Input() centersCollapsed = false;
  @Input() aowsCollapsed = false;

  @Input() consolidationIndicators: Array<{
    title: string;
    target: number;
    budget: string;
  }> = [];

  @Input() consolidationBudgetSummary: any = null;
  @Input() completedCenterCodes: string[] = [];
  @Input() selectedCenterCompleted = false;
  @Input() centerStatusUpdating = false;
  @Input() sectionValidation: Record<string, { hasError: boolean; message: string }> = {};
  @Input() centerErrorCodes: string[] = [];
  @Input() aowErrorIds: number[] = [];

  @Output() toggleCenters = new EventEmitter<void>();
  @Output() toggleAows = new EventEmitter<void>();
  @Output() selectCenter = new EventEmitter<any>();
  @Output() selectAow = new EventEmitter<any>();
  @Output() selectExtra = new EventEmitter<string>();
  @Output() toggleSelectedCenterCompletion = new EventEmitter<void>();

  getCenterLabel(center: any, compact = false): string {
    if (!center) {
      return "";
    }
    if (compact) {
      return center?.acronym || center?.code || center?.name || "";
    }
    return center?.name || center?.acronym || center?.code || "";
  }

  getAowLabel(aow: any, compact = false): string {
    if (!aow) {
      return "";
    }
    const code = aow?.code || aow?.wpCode || "AOW";
    if (compact) {
      return code;
    }
    return aow?.title ? `${code} - ${aow.title}` : code;
  }

  isCenterCompleted(center: any): boolean {
    const key = this.getCenterKey(center);
    if (!key) {
      return false;
    }
    return this.completedCenterCodes.includes(key);
  }

  hasCenterError(center: any): boolean {
    const key = this.getCenterKey(center);
    return !!key && this.centerErrorCodes.includes(key);
  }

  canShowCenterCompleteAction(center: any): boolean {
    if (!this.isCenterActive(center)) {
      return false;
    }
    if (this.selectedCenterCompleted) {
      return true;
    }
    return !this.hasCenterError(center);
  }

  isCenterActive(center: any): boolean {
    const key = this.getCenterKey(center);
    return !!key && !!this.selectedCenterKey && key === this.selectedCenterKey;
  }

  private getCenterKey(center: any): string | null {
    const raw = center?.code ?? center?.id ?? center?.organization_code;
    if (raw == null) {
      return null;
    }
    if (typeof raw === "object") {
      const nested = raw?.code ?? raw?.id ?? raw?.organization_code;
      return nested != null ? String(nested) : null;
    }
    return String(raw);
  }

  hasSectionError(section: string): boolean {
    return !!this.sectionValidation?.[section]?.hasError;
  }

  getSectionError(section: string): string {
    return this.sectionValidation?.[section]?.message || "";
  }

  hasAowError(aow: any): boolean {
    const aowId = Number(aow?.id);
    return Number.isFinite(aowId) && this.aowErrorIds.includes(aowId);
  }
}
