import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ToastrService } from "ngx-toastr";
import { OrganizationsService } from "src/app/services/organizations.service";
import { PhasesService } from "src/app/services/phases.service";
import { SortPipe } from "src/app/share/pipes/sort.pipe";

export interface DialogData {
  phase_id: number;
  initiative_id: number;
}

@Component({
  selector: "app-assign-organizations",
  templateUrl: "./assign-organizations.component.html",
  styleUrls: ["./assign-organizations.component.scss"],
})
export class AssignOrganizationsComponent implements OnInit {
  phaseId: number;
  initiativeId: number;
  assignOrgsForm: FormGroup;
  organizations: any = [];
  a: any = [];

  constructor(
    private sortPipe: SortPipe,
    private dialogRef: MatDialogRef<AssignOrganizationsComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private organizationsService: OrganizationsService,
    private phasesService: PhasesService,
    private toast: ToastrService,
    private fb: FormBuilder
  ) {
    this.phaseId = data.phase_id;
    this.initiativeId = data.initiative_id;
  }

  ngOnInit() {
    this.formInit();
  }

  private async formInit() {
    this.assignOrgsForm = this.fb.group({
      organizations: [null, Validators.required],
    });

    this.organizations = await this.organizationsService.getOrganizations();

    let AssignedOrganizations: any = await this.phasesService.getAssignedOrgs(
      this.phaseId,
      this.initiativeId
    );

    let OrganizationsCodes: string[] = [];
    if (AssignedOrganizations.length > 0) {
      AssignedOrganizations.forEach((organization: any) => {
        OrganizationsCodes.push(organization.code);
      });

      this.assignOrgsForm.setValue({
        organizations: OrganizationsCodes,
      });
    }

    const sortedArr = this.sortPipe.transform(
      AssignedOrganizations,
      "asc",
      "acronym"
    );

    console.log(sortedArr);

    // console.log(AssignedOrganizations);
    // for (let i = 0; i < AssignedOrganizations.length; i++) {
    //   console.log(AssignedOrganizations[i].acronym.sort());
    // }
  }

  // compareFn() {
  //   return item.value === selected.value;
  // }

  // onChange($event: any) {
  //   console.log($event);
  //   this.assignOrgsForm.setValue({ organizations: "" });

  //   console.log($event);
  //   return this.assignOrgsForm.patchValue({
  //     organizations: this.sortPipe.transform($event, "asc", "acronym"),
  //   });
  // }

  // onChange($event: any) {
  //   // for (let i = 0; i < $event.length; i++) {
  //   //   console.log($event[i].acronym);
  //   //   const sortedArr = this.sortPipe.transform($event, "asc", "acronym");
  //   //   console.log(sortedArr);
  //   //   return sortedArr;
  //   //   // $event.sort((a, b) => {
  //   //   //   a = $event[i].acronym;
  //   //   //   b = $event[i].name;
  //   //   //   if (a > b) return 1;
  //   //   //   if (a < b) return -1;
  //   //   // });
  //   // }
  //   // $event.selected.sort((a: any, b: any) => a.name.localeCompare(b.acronym));
  // }

  async submit() {
    if (this.assignOrgsForm.valid) {
      const organizations = this.assignOrgsForm.value.organizations;

      const data = {
        phase_id: this.phaseId,
        initiative_id: this.initiativeId,
        organizations: organizations,
      };

      await this.phasesService.assignPhaseInitOrgs(data);
      this.toast.success("Organizations assigned successfully");
      this.dialogRef.close({ submitted: true });
    }
  }

  //Close-Dialog
  onCloseDialog() {
    this.dialogRef.close();
  }
}
