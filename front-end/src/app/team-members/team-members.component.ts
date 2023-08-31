import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from 'src/app/confirm/confirm.component';
import {
  NewTeamMemberComponent,
  ROLES,
} from 'src/app/components/new-team-member/new-team-member.component';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-team-members',
  templateUrl: './team-members.component.html',
  styleUrls: ['./team-members.component.scss'],
})
export class TeamMembersComponent {
  initiativeId: any;
  constructor(
    public router: Router,
    public dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    private initiativeService: InitiativesService,
    private toastrService: ToastrService,
    private userService: UserService
  ) {}
  user_info: any;
  my_roles: any;
  InitiativeUsers: any;

  id: number = 0;
  async ngOnInit() {
    const params: any = this.activatedRoute?.snapshot.params;
    this.initiativeId = params.id;
    this.id = params.id;
    console.log('this.id',this.id)
    this.loadInitiativeRoles();
    this.user_info = this.userService.getLogedInUser();
    this.InitiativeUsers = await this.initiativeService.getInitiativeUsers(this.id);
    this.my_roles = this.InitiativeUsers
      .filter((d: any) => d?.user?.id == this?.user_info?.id)
      .map((d: any) => d.role);
   // if (this.canEdit())
    this.displayedColumns.push('Actions');
  }

  async init() {}
  canEdit() {
    return (
      this.user_info.role == 'admin' ||
      this.my_roles?.includes(ROLES.LEAD) ||
      this.my_roles?.includes(ROLES.COORDINATOR)
    );
  }
  async deleteMember(roleId: number) {
    this.dialog
      .open(ConfirmComponent, {
        maxWidth: '400px',
        data: new ConfirmDialogModel(
          'Delete',
          `Are you sure you want to delete user role ?`
        ),
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult) {
          await this.initiativeService.deleteInitiativeRole(
            this.initiativeId,
            roleId
          );
          this.loadInitiativeRoles();
          this.toastrService.success('Success', `User role has been deleted`);
        }
      });
  }

  async openNewTeamMemberDialog() {
    const dialogRef = this.dialog.open(NewTeamMemberComponent, {
      width: '600px',
      data: { role: 'add', member: null },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.role == 'add') {
        // access new data => result.formValue
        const email = result.formValue.email;
        const userRole = result.formValue.userRole;
        console.log({ email, userRole });
        // handel add memeber API service
        this.initiativeService.createNewInitiativeRole(
          this.initiativeId,
          {
            initiative_id: this.initiativeId,
            email: result.formValue.email,
            role: result.formValue.userRole,
            user_id: result.formValue.user_id,
            organizations: result.formValue.organizations,
          }
        ).subscribe(data => {
          if (data) {
            this.toastrService.success('Success', `User role has been added`);
            this.loadInitiativeRoles();
          }
        }, error => {
          this.toastrService.error(error.error.message);
        })
      }
    });
  }

  openEditTeamMemberDialog(roleId: number, role: any) {
    const dialogRef = this.dialog.open(NewTeamMemberComponent, {
      width: '600px',
      data: { role: 'edit', member: role },
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.role == 'edit') {
        console.log('edit');
        console.log(result.formValue)
        // access edited data => result.formValue
        await this.initiativeService.updateInitiativeRole(
          this.initiativeId,
          roleId,
          {
            initiative_id: this.initiativeId,
            id: roleId,
            user_id: result.formValue.user_id,
            email: result.formValue.email,
            role: result.formValue.userRole,
            organizations: result.formValue.organizations,
          }
        );
        this.toastrService.success('Success', `User role has been updated`);
        this.loadInitiativeRoles();
      }
    });
  }

  displayedColumns: string[] = [
    /*'User Name',*/ 'Email',
    'User',
    'Role',
    'organizations',
    'Creation Date',
    'Status',
  ];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator: any;

  join(data:any){
   return data.map((d:any)=>d.name).join(', ')
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  async loadInitiativeRoles() {
    var data: any = await this.initiativeService.getInitiativeRoles(
      this.initiativeId
    );
    this.dataSource = new MatTableDataSource<any>(data);
  }
}
