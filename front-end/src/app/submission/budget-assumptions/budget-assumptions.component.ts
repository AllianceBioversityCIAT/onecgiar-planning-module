import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { BudgetAssumptionsService } from "src/app/services/budget-assumptions.service";

@Component({
  selector: "app-budget-assumptions",
  templateUrl: "./budget-assumptions.component.html",
  styleUrls: ["./budget-assumptions.component.scss"],
})
export class BudgetAssumptionsComponent implements OnInit {
  Form: FormGroup;
  budget_assumptions: any;
  allbudget_assumptions: any;
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BudgetAssumptionsComponent>,
    private service: BudgetAssumptionsService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private toast: ToastrService
  ) {}
    disabled: boolean = false;
  async ngOnInit() {
    this.disabled=this.data.data.disbaled;
   
    this.setForm();
    await this.getData();
    if (this.budget_assumptions) {
      this.Form.patchValue({
        budget_assumptions: this.budget_assumptions.budget_assumptions,
      });
    }
    if(this.disabled)
    this.Form.get('budget_assumptions')?.disable();
    else
     this.Form.get('budget_assumptions')?.enable();
     
  }

  async getData() {
    this.budget_assumptions = await this.service.getOne(this.data.data);
  }

  setForm() {
    this.Form = this.fb.group({
      budget_assumptions: ["", Validators.required],
      item_budget: [this.data.data.item_budget, Validators.required],
      item_id: [this.data.data.item_id, Validators.required],
      organization_code: [
        this.data.data.organization_code,
        Validators.required,
      ],
      wp_id: [this.data.data.wp_id, Validators.required],
      type: [this.data.data.type, Validators.required],
    });
  }
  async onSubmit() {
    if (this.Form.valid) {
      await this.service.createOrUpdate(this.Form.value).then(
        () => {
          if (!this.budget_assumptions)
            this.toast.success("Added successfully");
          else this.toast.success("Updated successfully");


          this.dialogRef.close(this.data);
        },
        (error) => {
          this.toast.error(error.error.message);
        }
      );
    }
  }
   onClose(): void {
    this.dialogRef.close();
  }
}
