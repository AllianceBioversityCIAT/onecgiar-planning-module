import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SubmissionService } from "src/app/services/submission.service";
import { AppSocket } from "src/app/socket.service";

@Component({
  selector: "app-status",
  templateUrl: "./status.component.html",
  styleUrls: ["./status.component.scss"],
})
export class StatusComponent implements OnInit {
  constructor(
    public fb: FormBuilder,
    public socket: AppSocket,
    private dialogRef: MatDialogRef<StatusComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any = {},
    private submissionService: SubmissionService
  ) {}
  statusForm: FormGroup;
  statuses = ["Pending", "Approved", "Rejected"];
  ngOnInit() {
    this.statusForm = this.fb.group({
      status: [this.data.status, Validators.required],
      status_reason: [null],
    });
    if(this.data.status == 'Approved')
      this.statuses = ["Approved", "Rejected"]

    this.statusForm.setValidators([
      this.reasonsValidator()
    ]);
  }

  async submit() {
    this.statusForm.markAllAsTouched();
    this.statusForm.updateValueAndValidity();
    if (
      this.statusForm.valid &&
      this.statusForm.controls["status"].value != "Pending"
    ) {
      const submittion = await this.submissionService.updateSubmissionStatus(
        this.data.id,
        this.statusForm.value
      );
      this.socket.connect();
      this.socket.emit('changeSubmissionStatus', {
        newSubmittionStatus : this.statusForm.value,
      });
      if (submittion) this.dialogRef.close(submittion);
    }
  }


  public reasonsValidator = () => {
    return (controlGroup: any) => {
      let controls = controlGroup.controls;
      if (controls) {
        if (
          controls.status.value == "Rejected"
        ) {
          if(
          controls.status_reason.value == "" ||
          controls.status_reason.value == null
          )
          return {
            reasonsRequired: {
              text: "This field is mandatory",
            },
          };
        }
      }
      return null;
    };
  };

  // close() {
  //   this.dialogRef.close(false);
  // }

  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
