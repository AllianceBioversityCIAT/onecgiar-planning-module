import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { DeleteConfirmDialogComponent } from 'src/app/delete-confirm-dialog/delete-confirm-dialog.component';
import { SubmissionService } from 'src/app/services/submission.service';
import { CenterStatusService } from '../center-status.service';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { AppSocket } from 'src/app/socket.service';
import { SubmitMessageComponent } from '../submit-message/submit-message.component';

@Component({
  selector: 'app-center-status',
  templateUrl: './center-status.component.html',
  styleUrls: ['./center-status.component.scss'],
})
export class CenterStatusComponent implements OnInit {
  @Input('organization_code') organization_code: string;
  @Input('initiative_id') initiative_id: number;
  @Input('phase_id') phase_id: number;
  @Input('status') status: boolean;
  @Input('notes') notes: Array<string>;
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
  a: any;
  async ngOnInit(): Promise<void> {
    this.loading = true;
    this.socket.on('statusOfCenter', (data: any) => {
      if (
        this.initiative_id == data.initiative_id &&
        this.phase_id == data.phase_id &&
        this.organization_code == data.organization_code
      ) {
        this.status = data.status;
      }
    });
  }

  complete2(){
          this.dialog
          .open(DeleteConfirmDialogComponent, {
            data: {
              title: 'Mark as Complete',
              message: `Are you sure you want to Mark it as ${
                this.status ? '' : 'In'
              }complete?`,
              svg: `../../../../assets/shared-image/${
                this.status ? 'checked-center.png' : 'uncompleted.png'
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
                  !!this.status,
                  this.organization
                );
                if (this.status === false) {
                  this.toast.success('mark as incompleted');
                  this.socket.emit('statusOfCenter', {
                    organization_code: this.organization_code,
                    initiative_id: this.initiative_id,
                    phase_id: this.phase_id,
                    status: true,
                    is_valid: true
                  });
                } else {
                  this.toast.success('marked as completed');
                  this.socket.emit('statusOfCenter', {
                    organization_code: this.organization_code,
                    initiative_id: this.initiative_id,
                    phase_id: this.phase_id,
                    status: false,
                    is_valid: true
                  });
                }
                if (result) this.change.emit(!!this.status);
              }
            }
          });
        }
  
  complete() {
    if(this.status && this.notes?.length) 
      this.dialog
      .open(SubmitMessageComponent, {
        data: {
          message:this.notes[0]?this.notes[0]:'' ,//'Note that your program has not specified any “Partners” in the TOC. In case this is not correct please update the TOC before submission. In submitting your PORB you confirm that your program does not intend to contract any partner. ',
          message2:this.notes[1] ?this.notes[1]:''// "Note that your program has not specified any “Bilateral projects” in the TOC linked to HLOs/Outcomes. In case this is not correct please update the TOC before submission. In submitting your PORB you confirm that your program does not rely on Bilateral projects mapped to realise its TOC.",
        },
        width: '600px'
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        this.complete2()
      });
      else
        this.complete2()

   
   

}
}
