import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeleteConfirmDialogComponent } from 'src/app/delete-confirm-dialog/delete-confirm-dialog.component';
import { SubmissionService } from 'src/app/services/submission.service';
import { CenterStatusService } from '../center-status.service';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { AppSocket } from 'src/app/socket.service';

@Component({
  selector: 'app-center-validate',
  templateUrl: './center-validate.component.html',
  styleUrls: ['./center-validate.component.scss']
})
export class CenterValidateComponent {
  @Input('organization_code') organization_code: string;
  @Input('initiative_id') initiative_id: number;
  @Input('phase_id') phase_id: number;
  @Input('is_valid') is_valid: boolean;
  @Input('organization') organization: any;
  @Input('isDisabled') isDisabled: any;
  @Output() change = new EventEmitter<any>();
  @Output() clicked = new EventEmitter<any>();
  @Input('socket') socket: AppSocket;

  constructor(
    private submissionService: SubmissionService,
    public dialog: MatDialog,
    public activatedRoute: ActivatedRoute,
    public router: Router,
    private centerStatusService: CenterStatusService,
    private toast: ToastrService,
    private headerService: HeaderService
  ) {
    this.headerService.backgroundDeleteYes = '#5569dd';
    this.headerService.backgroundDeleteClose = '#808080';
    this.headerService.backgroundDeleteLr = '#5569dd';
  }

  loading = true;

  async ngOnInit(): Promise<void> {
    this.loading = true;
    console.log(this.is_valid)
    this.socket.on('validateOfCenter', (data: any) => {
      if (
        this.initiative_id == data.initiative_id &&
        this.phase_id == data.phase_id &&
        this.organization_code == data.organization_code
      ) {
        this.is_valid = data.is_valid;
      }
    });
  }

  complete() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: 'Mark as Complete',
          message: `Are you sure you want to Mark it as ${
            this.is_valid ? '' : 'In'
          }valid?`,
          svg: `../../../../assets/shared-image/${
            this.is_valid ? 'checked-center.png' : 'uncompleted.png'
          }`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          if (this.is_valid) this.clicked.emit();

          const valid = this.centerStatusService.validPartner.getValue();
          if (!this.is_valid || (this.is_valid && valid)) {
            let result = await this.submissionService.markValidate(
              this.organization_code,
              +this.initiative_id,
              this.phase_id,
              !!this.is_valid,
              this.organization
            );
            if (this.is_valid === false) {
              this.toast.success('mark as invalid');
              this.socket.emit('validateOfCenter', {
                organization_code: this.organization_code,
                initiative_id: this.initiative_id,
                phase_id: this.phase_id,
                is_valid: true,
              });
            } else {
              this.toast.success('marked as valid');
              this.socket.emit('validateOfCenter', {
                organization_code: this.organization_code,
                initiative_id: this.initiative_id,
                phase_id: this.phase_id,
                is_valid: false,
              });
            }
            if (result) this.change.emit(!!this.is_valid);
          }
        }
      });
  }
}
