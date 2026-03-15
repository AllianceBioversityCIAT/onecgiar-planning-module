import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { PopoverManagementService } from "src/app/services/popover-management.service";
export interface DialogData {
  id: string;
  hint?: string;
  description?: string;
}

@Component({
    selector: "app-popover-dialog",
    templateUrl: "./popover-dialog.component.html",
    styleUrls: ["./popover-dialog.component.scss"],
    standalone: false
})
export class PopoverDialogComponent implements OnInit {
  id: string;
  form: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<PopoverDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private popoverManagementService: PopoverManagementService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.id = data.id;
  }

  ngOnInit() {
    this.initForm();
    if (this.id) this.patchForm();
  }

  private async initForm() {
    this.form = this.fb.group({
      description: [null, Validators.required],
      name: [null, Validators.required],
    });
  }

  private async patchForm() {
    let value = await this.popoverManagementService.get(this.id);
    this.form.patchValue({ ...value });
  }

  submit() {
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();
    console.log(this.form.valid, this.form.value);
    if (this.form.valid) {
      const api = this.id
        ? this.popoverManagementService.update(this.id, this.form.value)
        : this.popoverManagementService.create(this.form.value);
      api.then(
        () => {
          this.toast.success(this.id ? "Updated" : "Added" + " successfully");
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
