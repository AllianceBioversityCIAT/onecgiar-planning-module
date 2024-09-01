import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { HeaderService } from "src/app/header.service";

@Component({
  selector: "app-cross-cutting",
  templateUrl: "./cross-cutting.component.html",
  styleUrls: ["./cross-cutting.component.scss"],
})
export class CrossCuttingComponent implements OnInit {
  crossForm: FormGroup<any> = new FormGroup([]);
  constructor(
    private fb: FormBuilder,
    public headerService: HeaderService,
    public dialogRef: MatDialogRef<any>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.headerService.backgroundHeaderDialog =
      "linear-gradient(to top right, #436280, #263749)";
  }

  submit() {
    if (this.crossForm.valid) this.dialogRef.close(this.crossForm.value);
  }
  ngOnInit() {
    this.crossForm = this.fb.group({
      title: [this.data?.title, Validators.required],
      description: [this.data?.description],
      initiative_id: [this.data?.initiative_id, Validators.required],
    });
  }
  onNoClick(): void {
    this.dialogRef.close(false);
  }

  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
