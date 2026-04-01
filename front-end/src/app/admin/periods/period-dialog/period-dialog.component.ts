import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { PeriodsService } from "src/app/services/periods.service";
import { PhasesService } from "src/app/services/phases.service";

export interface DialogData {
  id: number;
}

@Component({
    selector: "app-period-dialog",
    templateUrl: "./period-dialog.component.html",
    styleUrls: ["./period-dialog.component.scss"],
    standalone: false
})
export class PeriodDialogComponent implements OnInit {
  periodId: number = 0;
  periodForm: FormGroup;
  phases: any = [];

  constructor(
    private dialogRef: MatDialogRef<PeriodDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private periodsService: PeriodsService,
    private phasesService: PhasesService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.periodId = data.id;
  }

  ngOnInit() {
    this.formInit();
  }

  private async formInit() {
    this.periodForm = this.fb.group({
      phase: [null, Validators.required],
      year: [null, Validators.required],
      quarter: [null, Validators.required],
    });
    this.phases = await this.phasesService.getPhases();
    if (this.periodId) {
      let { id, phase, ...periodValues } = await this.periodsService.getPeriod(
        this.periodId
      );
      this.periodForm.setValue({
        ...periodValues,
        phase: phase ? phase.id : null,
      });
    }
  }

  async submit() {
    this.periodForm.markAllAsTouched();
    this.periodForm.updateValueAndValidity();
    if (this.periodForm.valid) {
      await this.periodsService
        .submitPeriod(this.periodId, this.periodForm.value)
        .then(
          (data) => {
            if (this.periodId == 0)
              this.toast.success("Period added successfully");
            else this.toast.success("Period updated successfully");

            this.dialogRef.close({ submitted: true });
          },
          (error) => {
            this.toast.error(error.error.message);
          }
        );
    }
  }

  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
