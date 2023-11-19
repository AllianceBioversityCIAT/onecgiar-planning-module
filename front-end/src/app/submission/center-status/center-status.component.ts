import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { SubmissionService } from "src/app/services/submission.service";
import { CenterStatusService } from "../center-status.service";
import { ToastrService } from "ngx-toastr";
import { HeaderService } from "src/app/header.service";

@Component({
  selector: "app-center-status",
  templateUrl: "./center-status.component.html",
  styleUrls: ["./center-status.component.scss"],
})
export class CenterStatusComponent implements OnInit {
  @Input("organization_code") organization_code: string;
  @Input("initiative_id") initiative_id: number;
  @Input("phase_id") phase_id: number;
  @Input("status") status: boolean;
  @Input("organization") organization: any;
  @Output() change = new EventEmitter<any>();
  @Output() clicked = new EventEmitter<any>();

  constructor(
    private submissionService: SubmissionService,
    public dialog: MatDialog,
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private centerStatusService: CenterStatusService,
    private toast: ToastrService,
    private headerService: HeaderService
  ) {
    this.headerService.backgroundDeleteYes = "#5569dd";
    this.headerService.backgroundDeleteClose = "#808080";
    this.headerService.backgroundDeleteLr = "#5569dd";
  }

  loading = true;
  a: any;
  async ngOnInit(): Promise<void> {
    this.loading = true;
  }

  complete() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Mark as Complete",
          message: `Are you sure you want to Mark it as ${
            this.status ? "" : "In"
          }complete?`,
          svg: `../../../../assets/shared-image/${
            this.status ? "checked-center.png" : "uncompleted.png"
          }`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          if (this.status) this.clicked.emit();

          const valid = this.centerStatusService.validPartner.getValue();
          if (!this.status || (this.status && valid)) {
            let result = await this.submissionService.markStatus(
              this.organization_code,
              +this.initiative_id,
              this.phase_id,
              !!this.status
            );
            if (this.status === false) {
              this.toast.success("mark as incompleted");
            } else {
              this.toast.success("marked as completed");
            }
            if (result) this.change.emit(!!this.status);
          }
        }
      });
  }
}
