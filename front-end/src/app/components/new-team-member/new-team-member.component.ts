import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import {
  Observable,
  Subject,
  catchError,
  concat,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from "rxjs";
import { PhasesService } from "src/app/services/phases.service";
import { SubmissionService } from "src/app/services/submission.service";
import { UserService } from "src/app/services/user.service";

export enum ROLES {
  LEAD = "Leader",
  COORDINATOR = "Coordinator",
  CONTRIBUTOR = "Contributor",
  CoLeader = "Co-leader",
}

@Component({
  selector: "app-new-team-member",
  templateUrl: "./new-team-member.component.html",
  styleUrls: ["./new-team-member.component.scss"],
})
export class NewTeamMemberComponent implements OnInit {

  constructor(
    public fb: FormBuilder,
    private dialogRef: MatDialogRef<NewTeamMemberComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any = {},
    private usersService: UserService,
    private phasesService: PhasesService,
    private submissionService: SubmissionService
  ) {}

  confirmation: any = "";
  organizations: any = [];
  users: Observable<any[]>;
  usersInput = new Subject<string>();
  usersLoading = false;

  Roles: any[] = [
    { value: ROLES.LEAD, viewValue: ROLES.LEAD },
    { value: ROLES.CoLeader, viewValue: ROLES.CoLeader },
    { value: ROLES.COORDINATOR, viewValue: ROLES.COORDINATOR },
    { value: ROLES.CONTRIBUTOR, viewValue: ROLES.CONTRIBUTOR },
  ];
  private atLeastOneValidator = () => {
    return (controlGroup: any) => {
      let controls = controlGroup.controls;
      if (controls) {
        if (
          controls.email.value == "" &&
          (controls.user.value == "" || controls.user.value == null)
        ) {
          return {
            atLeastOneRequired: {
              text: "At least one should be selected",
            },
          };
        }
      }
      return null;
    };
  };

  private organizationValidator = () => {
    return (controlGroup: any) => {
      let controls = controlGroup.controls;
      if (controls) {
        if (
          controls.userRole.value == ROLES.CONTRIBUTOR &&
          (!controls.organizations.value ||
            controls.organizations.value.length < 1)
        ) {
          return {
            organizationsRequired: true,
          };
        } else if (controls.userRole.value != ROLES.CONTRIBUTOR) {
          controls.organizations.value = null;
        }
      }
      return null;
    };
  };

  memberForm: any;
  async populateMemberForm() {
    const activePhase = await this.phasesService.getActivePhase();
    this.organizations = await this.phasesService.getAssignedOrgs(
      activePhase.id,
      this.data.initiative_id
    );
    if (this.organizations.length < 1) {
      this.organizations = await this.submissionService.getOrganizations();
    }
    this.memberForm = this.fb.group({
      email: [
        this.data.role == "add" ? "" : this.data.member.email,
        [Validators.email],
      ],
      userRole: [
        this.data.role == "add" ? "" : this.data.member.role,
        Validators.required,
      ],
      user: [this.data?.member?.user ? this.data?.member?.user : null],
      organizations: [
        this.data?.member?.organizations
          ? this.data?.member?.organizations
          : null,
      ],
    });
    this.loadUsers();
    this.memberForm.setValidators([
      this.atLeastOneValidator(),
      this.organizationValidator(),
    ]);
  }

  showerror: boolean = false;
  submit() {
    this.memberForm.markAllAsTouched();
    this.memberForm.updateValueAndValidity();
    if (this.memberForm.valid) {
      this.showerror = false;
      this.dialogRef.close({
        role: this.data.role,
        formValue: this.memberForm.value,
      });
    } else {
      this.showerror = true;
    }
  }


  compareOrganization(o1: any, o2: any) {
    if(o1.name == o2.name && o1.id == o2.id )
    return true;
    else return false
  }

  private loadUsers() {
    this.users = concat(
      of([]), // default items
      this.usersInput.pipe(
        distinctUntilChanged(),
        tap(() => (this.usersLoading = true)),
        switchMap((term) =>
          this.usersService.searchUsers(term).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.usersLoading = false))
          )
        )
      )
    );
  }

  compareUsers(item: any, selected: any) {
    return item === selected.id;
  }
  loading: boolean = false;

  items$!: Observable<any>;
  peopleInputSearch$ = new Subject<any>();

  async ngOnInit() {
    this.populateMemberForm();
  }

  onCloseDialog() {
    this.dialogRef.close();
  }



  onToppingRemoved(organization: any) {
    const toppings = this.memberForm?.value?.organizations as any[];
    this.removeFirst(toppings, organization);
    this.memberForm.controls?.['organizations'].setValue(toppings); // To trigger change detection
  }

  private removeFirst<T>(array: T[], toRemove: T): void {
    const index = array.indexOf(toRemove);
    if (index !== -1) {
      array.splice(index, 1);
    }
  }


}
