import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { StanderdCrossCuttingService } from "src/app/services/standerd-cross-cutting.service";

export interface DialogData {
  id: number;
}

@Component({
  selector: "app-standerd-cross-cutting-dialog",
  templateUrl: "./standerd-cross-cutting-dialog.component.html",
  styleUrls: ["./standerd-cross-cutting-dialog.component.scss"],
})
export class StanderdCrossCuttingDialogComponent implements OnInit {
  itemId: number = 0;
  itemForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<StanderdCrossCuttingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private standerdCrossCuttingService: StanderdCrossCuttingService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.itemId = data.id;
  }

  ngOnInit() {
    this.formInit();
  }

  private async formInit() {
    this.itemForm = this.fb.group({
      name: [null, Validators.required],
    });

    if (this.itemId) {
      const item = await this.standerdCrossCuttingService.getOne(this.itemId);
      if (item) {
        this.itemForm.setValue({ name: item.name });
      }
    }
  }

  async submit() {
    this.itemForm.markAllAsTouched();
    this.itemForm.updateValueAndValidity();
    if (this.itemForm.valid) {
      await this.standerdCrossCuttingService
        .submit(this.itemId, this.itemForm.value)
        .then(
          (data) => {
            if (this.itemId == 0)
              this.toast.success(
                "Standard Cross Cutting item added successfully"
              );
            else
              this.toast.success(
                "Standard Cross Cutting item updated successfully"
              );

            this.dialogRef.close({ submitted: true });
          },
          (error) => {
            this.toast.error(error.error.message);
          }
        );
    }
  }

  onCloseDialog() {
    this.dialogRef.close();
  }
}
