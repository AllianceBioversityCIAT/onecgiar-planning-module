import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { OrganizationsService } from "src/app/services/organizations.service";
import { OrganizationDialogComponent } from "./organization-dialog/organization-dialog.component";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "src/app/confirm/confirm.component";
import { HeaderService } from "src/app/header.service";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { ToastrService } from "ngx-toastr";
import { Meta, Title } from "@angular/platform-browser";
import { FormBuilder, FormGroup } from "@angular/forms";

@Component({
  selector: "app-organizations",
  templateUrl: "./organizations.component.html",
  styleUrls: ["./organizations.component.scss"],
})
export class OrganizationsComponent implements OnInit {
  columnsToDisplay: string[] = ["name", "acronym", "code", "actions"];
  dataSource: MatTableDataSource<any>;
  organizations: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private organizationsService: OrganizationsService,
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
    this.headerService.logoutSvg="brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";
  }

  filterForm: FormGroup = new FormGroup({});
  filters: any;
  setForm() {
    this.filterForm.valueChanges.subscribe(() => {
      this.initTable(this.filterForm.value);
      this.filters = this.filterForm.value;
      console.log(this.filters);
    });
  }

  ngOnInit() {
    this.filterForm = this.fb.group({
      name: [null],
    });
    this.initTable(this.filters);
    this.setForm();
  }

  async initTable(filter = null) {
    this.organizations = await this.organizationsService.getOrganizations(
      filter
    );
    this.dataSource = new MatTableDataSource(this.organizations);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.title.setTitle("Organizations");
    this.meta.updateTag({ name: "description", content: "Organizations" });

    console.log(this.organizations);
  }

  openDialog(code: string = "0"): void {
    const dialogRef = this.dialog.open(OrganizationDialogComponent, {
      data: { code: code },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted) this.initTable(this.filters);
    });
  }

  delete(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: new ConfirmDialogModel(
          "Delete",
          `Are you sure you want to delete this Organization?`
        ),
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          await this.organizationsService.deleteOrganization(id).then(
            (data) => {
              this.initTable(this.filters);
              this.toastr.success("Deleted successfully");
            },
            (error) => {
              this.toastr.error(error.error.message);
            }
          );
        }
      });
  }
}
