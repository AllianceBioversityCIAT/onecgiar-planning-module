import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { IpsrService } from "src/app/services/ipsr.service";
import { IpsrDialogComponent } from "./ipsr-dialog/ipsr-dialog.component";
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
  selector: "app-admin-ipsr",
  templateUrl: "./admin-ipsr.component.html",
  styleUrls: ["./admin-ipsr.component.scss"],
})
export class AdminIpsrComponent implements OnInit {
  columnsToDisplay: string[] = ["id", "title", "description", "actions"];
  dataSource: MatTableDataSource<any>;
  ipsrs: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private ipsrService: IpsrService,
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
      title: [null],
    });
    this.initTable(this.filters);
    this.setForm();
  }

  async initTable(filter = null) {
    this.ipsrs = await this.ipsrService.getIpsrs(filter);
    this.dataSource = new MatTableDataSource(this.ipsrs);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.title.setTitle("IPSR");
    this.meta.updateTag({ name: "description", content: "IPSR" });
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(IpsrDialogComponent, {
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
          message: `Are you sure you want to delete this IPSR item?`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          await this.ipsrService.deleteIpsr(id).then(
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
