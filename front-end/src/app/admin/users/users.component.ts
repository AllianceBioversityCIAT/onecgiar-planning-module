import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { UserService } from "src/app/services/user.service";
import { UserDialogComponent } from "./user-dialog/user-dialog.component";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "src/app/confirm/confirm.component";
import { HeaderService } from "src/app/header.service";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { ToastrService } from "ngx-toastr";
import { Meta, Title } from "@angular/platform-browser";
import { FormBuilder, FormGroup } from "@angular/forms";
import { SortPipe } from "src/app/share/pipes/sort.pipe";

@Component({
  selector: "app-users",
  templateUrl: "./users.component.html",
  styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  columnsToDisplay: string[] = [
    "id",
    "name",
    "email",
    "role",
    "Initiatives and Roles",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  users: any = [];
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  filterForm: FormGroup = new FormGroup({});
  filters: any = null;

  constructor(
    private sortPipe: SortPipe,
    private usersService: UserService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private title: Title,
    private meta: Meta,
    private fb: FormBuilder
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundFooter =
      "linear-gradient(to  top, #0F212F, #09151E)";

    this.headerService.backgroundDeleteYes = "#FF5A54";
    this.headerService.backgroundDeleteClose = "#04030F";
    this.headerService.backgroundDeleteLr = "#04030F";
    this.headerService.logoutSvg =
      "brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";
  }

  sort = [
    { name: "ID (lowest first)", value: "id,ASC" },
    { name: "ID (highest first)", value: "id,DESC" },
    { name: "Name (A to Z)", value: "full_name,ASC" },
    { name: "Name (Z to A)", value: "full_name,DESC" },
  ];

  async ngOnInit() {
    this.filterForm = this.fb.group({
      email: [null],
      role: [null],
      sort: [null],
    });
    await this.initTable();
    this.setForm();
  }

  setForm() {
    this.filterForm.valueChanges.subscribe(() => {
      this.filters = this.filterForm.value;
      this.pageIndex = 1;
      this.pageSize = 10;
      this.initTable(this.filters);
      this.paginator.pageSize = 0;
    });
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.initTable(this.filters);
  }

  async initTable(filters = null) {
    this.users = await this.usersService.getAllUsers(
      filters,
      this.pageIndex,
      this.pageSize
    );
    this.dataSource = new MatTableDataSource(this.users?.result);
    this.length = this.users?.count;
    this.title.setTitle("User management");
    this.meta.updateTag({ name: "description", content: "User management" });
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: { id: id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted) this.initTable(this.filters);
    });
  }

  delete(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Delete",
          message: `Are you sure you want to delete this User?`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          let result = await this.usersService.deleteUser(id);
          console.log(result);
          if (result != false) {
            this.initTable();
            this.toastr.success("Deleted successfully");
          }
        }
      });
  }

  getInitRoles(initRoles: any[]) {
    console.log(initRoles);
    initRoles = initRoles.sort((a: any, b: any) =>
      a?.initiative.official_code
        ?.toLowerCase()
        .localeCompare(b?.initiative.official_code?.toLowerCase())
    );
    console.log(initRoles);

    let str =
      "<div style ='display: flex; flex-direction: column; align-items: center;'>";
    initRoles.forEach(
      (d) =>
        (str +=
          "<div style='padding-bottom: 3px; padding-top: 3px;'><span>" +
          d.initiative.official_code +
          "</span> / <span>" +
          d.role +
          "</span> </div>")
    );

    str += "</div>";

    return str;
  }

  async exportExcel() {
    await this.usersService.exportUsers(this.filters);
  }
  resetForm() {
    this.filterForm.reset();
    this.filterForm.markAsUntouched();
  }
}
