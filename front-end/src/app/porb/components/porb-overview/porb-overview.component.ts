import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-porb-overview",
  templateUrl: "./porb-overview.component.html",
  styleUrls: ["./porb-overview.component.scss"],
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

  @Output() exportOverview = new EventEmitter<void>();
}
