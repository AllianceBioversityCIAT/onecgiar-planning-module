import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { PorbService } from "src/app/services/porb.service";

@Component({
  selector: "app-cross-add-dialog",
  templateUrl: "./cross-add-dialog.component.html",
  styleUrls: ["./cross-add-dialog.component.scss"],
})
export class CrossAddDialogComponent {
  form: FormGroup;
  saving = false;

  constructor(
    private dialogRef: MatDialogRef<CrossAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { program_id: number; porb_aow_id: number; center_id: number },
    private fb: FormBuilder,
    private porbService: PorbService
  ) {
    this.form = this.fb.group({
      title: ["", Validators.required],
      description: [""],
    });
  }

  async save() {
    if (this.form.invalid || this.saving) return;

    this.saving = true;
    try {
      const created = await this.porbService.createCross({
        program_id: this.data.program_id,
        porb_aow_id: this.data.porb_aow_id,
        center_id: this.data.center_id,
        title: this.form.value.title.trim(),
        description: (this.form.value.description || "").trim(),
        budget: null,
        assumption: "",
      });
      if (created) {
        this.dialogRef.close({ created: true });
      }
    } finally {
      this.saving = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
