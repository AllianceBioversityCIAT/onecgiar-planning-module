import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { OrganizationsService } from 'src/app/services/organizations.service';

export interface DialogData {
  code: string;
}

@Component({
  selector: 'app-organization-dialog',
  templateUrl: './organization-dialog.component.html',
  styleUrls: ['./organization-dialog.component.scss'],
})
export class OrganizationDialogComponent implements OnInit {
  organizationCode: string = '0';
  organizationForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<OrganizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private organizationsService: OrganizationsService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.organizationCode = data.code;
  }

  ngOnInit() {
    this.formInit();
  }

  private async formInit() {
    this.organizationForm = this.fb.group({
      name: [null, Validators.required],
      acronym: [null, Validators.required],
      code: [null, Validators.required],
      disabled: [false, Validators.required],
    });
    if (this.organizationCode != '0') {
      let organizationValues = await this.organizationsService.getOrganization(
        this.organizationCode
      );
      this.organizationForm.setValue({
        ...organizationValues,
      });
    }
  }

  async submit() {
    this.organizationForm.markAllAsTouched();
    this.organizationForm.updateValueAndValidity();
    if (this.organizationForm.valid) {
      await this.organizationsService
        .submitOrganization(this.organizationCode, this.organizationForm.value)
        .then(
          (data) => {
            if (this.organizationCode == '0')
              this.toast.success('Organization added successfully');
            else this.toast.success('Organization updated successfully');

            this.dialogRef.close({ submitted: true });
          },
          (error) => {
            this.toast.error(error.error.message);
          }
        );
    }
  }

  // async submit() {
  //   this.organizationForm.markAllAsTouched();
  //   this.organizationForm.updateValueAndValidity();
  //   if (this.organizationForm.valid) {
  //     await this.organizationsService.submitOrganization(
  //       this.organizationId,
  //       this.organizationForm.value
  //     );
  //     this.toast.success("Organization added Successfully");
  //     this.dialogRef.close({ submitted: true });
  //   }
  // }

  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
