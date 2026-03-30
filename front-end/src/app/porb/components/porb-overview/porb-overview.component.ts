import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: "app-porb-overview",
    templateUrl: "./porb-overview.component.html",
    styleUrls: ["./porb-overview.component.scss"],
    standalone: false
})
export class PorbOverviewComponent {
  @Input() initiative: any = null;
  @Input() onlineProgramUsers: Array<{
    userId: number;
    name: string;
    email: string;
    initials: string;
    connectedAt?: string;
  }> = [];
  @Input() submissionStatus: string = "Draft";
  @Input() submissionId: number | null = null;
  @Input() canSubmit: boolean = false;
  @Input() submitting: boolean = false;
  @Input() exportingZip: boolean = false;

  @Output() exportOverview = new EventEmitter<void>();
  @Output() exportAllZip = new EventEmitter<void>();
  @Output() submitClicked = new EventEmitter<void>();
  @Output() cancelSubmissionClicked = new EventEmitter<void>();
  @Output() historyClicked = new EventEmitter<void>();

  get statusClass(): string {
    switch (this.submissionStatus) {
      case "Pending": return "status-pending";
      case "Approved": return "status-approved";
      case "Rejected": return "status-rejected";
      default: return "status-draft";
    }
  }
}
