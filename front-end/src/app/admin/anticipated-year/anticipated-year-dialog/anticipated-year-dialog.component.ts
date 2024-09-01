import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { AnticipatedYearService } from 'src/app/services/anticipated-year.service';
import { PhasesService } from 'src/app/services/phases.service';
export interface DialogData {
  id: number;
}
@Component({
  selector: 'app-anticipated-year-dialog',
  templateUrl: './anticipated-year-dialog.component.html',
  styleUrls: ['./anticipated-year-dialog.component.scss']
})
export class AnticipatedYearDialogComponent {
  // anticipatedYearId: number = 0;
  // anticipatedYearForm: FormGroup;
  // phases: any;
  // constructor(
  //   private dialogRef: MatDialogRef<AnticipatedYearDialogComponent>,
  //   @Inject(MAT_DIALOG_DATA) private data: DialogData,
  //   private AnticipatedYearService: AnticipatedYearService,
  //   private toast: ToastrService,
  //   private fb: FormBuilder,
  //   private phaseService: PhasesService
  // ) {
  //   this.anticipatedYearId = this.data.id;
  // }

  // months = [
  //   { value: 'Jan', layout: 'January' },
  //   { value: 'Feb', layout: 'February' },
  //   { value: 'Mar', layout: 'March' },
  //   { value: 'Apr', layout: 'April' },
  //   { value: 'May', layout: 'May' },
  //   { value: 'Jun', layout: 'June' },
  //   { value: 'Jul', layout: 'July' },
  //   { value: 'Aug', layout: 'August' },
  //   { value: 'Sep', layout: 'September' },
  //   { value: 'Oct', layout: 'October' },
  //   { value: 'Nov', layout: 'November' },
  //   { value: 'Dec', layout: 'December' },

  // ]

  // async ngOnInit() {
  //   this.formInit();
  //   this.phases = await this.phaseService.getPhases();
  // }

  // private async formInit() {
  //   this.anticipatedYearForm = this.fb.group({
  //     month: [null, Validators.required],
  //     year: [null, Validators.required],
  //     phase: [null],
  //   });
  //   if (this.anticipatedYearId) {
  //     let { id, ...anticipatedYearValues } = await this.AnticipatedYearService.getAnticipatedYearById(
  //       this.anticipatedYearId
  //     );
  //     this.anticipatedYearForm.patchValue({
  //         month: anticipatedYearValues.month,
  //         year: anticipatedYearValues.year,
  //         phase: anticipatedYearValues.phase.id
  //     });
  //   }
  // }

  // async submit() {
  //   this.anticipatedYearForm.markAllAsTouched();
  //   this.anticipatedYearForm.updateValueAndValidity();
  //   if (this.anticipatedYearForm.valid) {
  //     await this.AnticipatedYearService.submitAnticipatedYear(
  //       this.anticipatedYearId,
  //       this.anticipatedYearForm.value
  //     ).then(
  //       (data) => {
  //         if (this.anticipatedYearId == 0) this.toast.success("Anticipated Year added successfully");
  //         else this.toast.success("Anticipated Year updated successfully");

  //         this.dialogRef.close({ submitted: true });
  //       },
  //       (error) => {
  //         this.toast.error(error.error.message);
  //       }
  //     );
  //   }
  // }

  // onCloseDialog() {
  //   this.dialogRef.close();
  // }
}
 