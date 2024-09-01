import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { PhasesService } from "src/app/services/phases.service";

export interface DialogData {
  id: number;
}

@Component({
  selector: "app-phase-dialog",
  templateUrl: "./phase-dialog.component.html",
  styleUrls: ["./phase-dialog.component.scss"],
})
export class PhaseDialogComponent implements OnInit {
  phaseId: number = 0;
  phaseForm: FormGroup;
  phases: any = [];
  tocPhases: any = [];

  constructor(
    private dialogRef: MatDialogRef<PhaseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private phasesService: PhasesService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.phaseId = data.id;
  }

  ngOnInit() {
    this.formInit();
  }

  private async formInit() {
    this.phaseForm = this.fb.group({
      name: [null, Validators.required],
      reportingYear: [null, Validators.required],
      tocPhase: [null, Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      previousPhase: [null, Validators.required],
      status: [null, Validators.required],
      show_eoi: [false],
    });
    this.phases = await this.phasesService.getPhases();
    this.phases = this.phases.filter((d:any) => d.id != this.phaseId);
    if(this.phases.length == 0)
      this.phaseForm.controls['previousPhase'].clearValidators();
      this.phaseForm.controls['previousPhase'].updateValueAndValidity();

    this.tocPhases = await this.phasesService.getTocPhases();
    if (this.phaseId) {
      let { id, previousPhase, active, ...phaseValues } =
        await this.phasesService.getPhase(this.phaseId);
      this.phaseForm.setValue({
        ...phaseValues,
        previousPhase: previousPhase ? previousPhase.id : null,
      });
    }
  }

  async submit() {
    this.phaseForm.markAllAsTouched();
    this.phaseForm.updateValueAndValidity();
    if (this.phaseForm.valid) {
      await this.phasesService
        .submitPhase(this.phaseId, this.phaseForm.value)
        .then(
          (data) => {
            if (this.phaseId == 0)
              this.toast.success("Phase added successfully");
            else this.toast.success("Phase updated successfully");

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
