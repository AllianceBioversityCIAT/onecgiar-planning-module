import { Component, ElementRef, Inject, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";

@Component({
  selector: "app-ipsr",
  templateUrl: "./ipsr.component.html",
  styleUrls: ["./ipsr.component.scss"],
})
export class IpsrComponent implements OnInit {
  ipsrForm: FormGroup<any> = new FormGroup([]);
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<any>,
    private toast: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  ipsrs: any;
  values: any;
  submit() {
    this.ipsrForm.markAllAsTouched();
    this.ipsrForm.updateValueAndValidity();
    if (this.ipsrForm.valid) {
      this.dialogRef.close(this.ipsrForm.value);
    }
    else {
      this.toast.error(this.getFormValidationErrors(this.ipsrForm)[0].value);
    }
  }
  ngOnInit() {
    this.ipsrs = this.data.ipsrs;
    this.values = this.data.values;
    let obj: any = {};
    let obj2: any = {};
    this.ipsrs.forEach((item: any) => {
      let ipsrValueArr = this.values.length
        ? this.values.filter((d: any) => d.ipsr_id == item.id)
        : [];
      let ipsrValue = ipsrValueArr.length ? ipsrValueArr[0].value : null;
      obj["value-" + item.id] = [ipsrValue];

      let ipsrDescription = ipsrValueArr.length ? ipsrValueArr[0].description : null;
      obj2["description-" + item.id] = [ipsrDescription];
    });
    this.ipsrForm = this.fb.group({
      ...obj,
      initiative_id: [this.data?.initiative_id, Validators.required],
      ...obj2
      
    });
    const ipsrIds = this.ipsrs.map((item: any) => item.id);

    this.ipsrForm.setValidators([
      this.customValueValidator(ipsrIds),
    ])
  }
  onNoClick(): void {
    this.dialogRef.close(false);
  }
  ids: any[] = [];
  arrError: any[] = [];
  change(item:any) {
    if(!this.arrError.includes(item.id)) {
      this.arrError.push(item.id)
    }

    if(item.need_in_description) {
      if(!this.ids.includes(item.id)) {
        this.ids.push(item.id)
      }
    }

    this.ipsrForm.setValidators([
      this.otherDescriptionValidator(this.ids),
      this.customValueValidator(this.arrError),
    ])
    this.getFormValidationErrors(this.ipsrForm);
  }

  private customValueValidator = (ids:any[]) => {
    return (controlGroup: any) => {
      for(const id of ids){
        let controls = controlGroup.controls;
        if (controls) {
          let arrError: any[] = [];
          let controlsValue: any[] = controls['value-' + id]?.value?.split("")
          if(controlsValue?.length){
            for(let char of controlsValue) {
              if (
                Number(+char) || char == '-' || char == '0'
              ) {
                arrError.push('yes')
              } else {
                arrError.push('no')
              }
            }
          }
          if(arrError.includes('no')) {
            controls['value-' + id].setErrors({'text': "You can insert the numbers and range (X-Y) only."});
            return {
              ['value' + id]: {
                text: "You can insert the numbers and range (X-Y) only.",
              },
            };
          }
        }
      }
      return null;
    };
  };






  private otherDescriptionValidator = (ids:any[]) => {
    return (controlGroup: any) => {
      for(const id of ids){
        let controls = controlGroup.controls;
        if (controls) {
          if (
            controls['value-' + id].value != "" &&
            controls['value-' + id].value != null
          ) {
            if (
              controls['description-' + id].value == "" ||
              controls['description-' + id].value == null
            ) {
              controls['description-' + id].setErrors({'text': "This field is mandatory"});
              return {
                ['descriptionRequired' + id]: {
                  text: "This field is mandatory",
                },
              };
            }
          }
        }
      }
      return null;
    };
  };




  getFormValidationErrors(form: FormGroup) {
    const result:any[] = [];
    Object.keys(form.controls).forEach(key => {
      const controlErrors: ValidationErrors | null = this.ipsrForm.controls[key].errors;
      if (controlErrors) {
        Object.keys(controlErrors).forEach(keyError => {
          if(controlErrors[keyError] == true){
            controlErrors[keyError] = 'This field is mandatory'
            result.push({
              'control': key,
              'error': keyError,
              'value': controlErrors[keyError]
            });
          } else {
            result.push({
              'control': key,
              'error': keyError,
              'value': controlErrors[keyError]
            });
          }
        });
      }
    });
    return result;
  }
  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
