import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { HeaderService } from "src/app/header.service";
import { Meta, Title } from "@angular/platform-browser";
import { FormBuilder, FormGroup } from "@angular/forms";
import { PopoverDialogComponent } from "./popover-dialog/popover-dialog.component";
import { PopoverManagementService } from "src/app/services/popover-management.service";

@Component({
  selector: "app-popover-management",
  templateUrl: "./popover-management.component.html",
  styleUrls: ["./popover-management.component.scss"],
})
export class PopoverManagementComponent implements OnInit {
  columnsToDisplay: string[] = ["id", "description", "actions"];
  dataSource: MatTableDataSource<any>;
  list: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private popoverManagementService: PopoverManagementService,
    private dialog: MatDialog,
    private headerService: HeaderService,
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
      this.initTable();
      this.filters = this.filterForm.value;
      console.log(this.filters);
    });
  }

  ngOnInit() {
    this.filterForm = this.fb.group({
      name: [null],
    });
    this.initTable();
    this.setForm();
  }

  async initTable() {
    this.list = await this.popoverManagementService.find();
    this.dataSource = new MatTableDataSource(this.list);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.title.setTitle("Popover management");
    this.meta.updateTag({ name: "description", content: "Popover management" });

    console.log(this.list);
  }

  openDialog(id?: string): void {
    const dialogRef = this.dialog.open(PopoverDialogComponent, {
      data: { id: id },
      width: "100%",
      maxWidth: "750px",
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted) this.initTable();
    });
  }
}
