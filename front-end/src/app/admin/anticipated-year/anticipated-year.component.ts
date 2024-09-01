import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { ToastrService } from "ngx-toastr";
import { HeaderService } from "src/app/header.service";
import { AnticipatedYearDialogComponent } from "./anticipated-year-dialog/anticipated-year-dialog.component";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { AnticipatedYearService } from "src/app/services/anticipated-year.service";

@Component({
  selector: "app-anticipated-year",
  templateUrl: "./anticipated-year.component.html",
  styleUrls: ["./anticipated-year.component.scss"],
})
export class AnticipatedYearComponent implements OnInit {
  // columnsToDisplay: string[] = ["id", "month", "year", "phase", "actions"];
  // dataSource: MatTableDataSource<any>;
  // anticipatedYear: any = [];
  // @ViewChild(MatPaginator) paginator: MatPaginator;
  // @ViewChild(MatSort) sort: MatSort;

  // constructor(
  //   private anticipatedYearService: AnticipatedYearService,
  //   private dialog: MatDialog,
  //   private headerService: HeaderService,
  //   private toastr: ToastrService,
  //   private title: Title,
  //   private meta: Meta,
  //   private fb: FormBuilder
  // ) {
  //   this.headerService.background =
  //     "linear-gradient(to  bottom, #04030F, #020106)";
  //   this.headerService.backgroundNavMain =
  //     "linear-gradient(to  top, #0F212F, #09151E)";
  //   this.headerService.backgroundUserNavButton =
  //     "linear-gradient(to  top, #0F212F, #09151E)";
  //   this.headerService.backgroundFooter =
  //     "linear-gradient(to  top, #0F212F, #09151E)";
  //   this.headerService.backgroundDeleteYes = "#FF5A54";
  //   this.headerService.backgroundDeleteClose = "#04030F";
  //   this.headerService.backgroundDeleteLr = "#04030F";
  //   this.headerService.logoutSvg="brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";

  // }

  // filterForm: FormGroup = new FormGroup({});
  // filters: any;
  // setForm() {
  //   this.filterForm.valueChanges.subscribe(() => {
  //     this.initTable(this.filterForm.value);
  //     this.filters = this.filterForm.value;
  //   });
  // }

  ngOnInit() {
    // this.filterForm = this.fb.group({
    //   search: [null],
    // });
    // this.initTable(this.filters);
    // this.setForm();
  }

  // async initTable(filter = null) {
  //   this.anticipatedYear = await this.anticipatedYearService.getAnticipatedYear(
  //     filter
  //   );
  //   this.dataSource = new MatTableDataSource(this.anticipatedYear);
  //   this.dataSource.paginator = this.paginator;
  //   this.dataSource.sort = this.sort;
  //   this.title.setTitle("Anticipated Year");
  //   this.meta.updateTag({ name: "description", content: "Anticipated Year" });
  // }

  // openDialog(id: number = 0): void {
  //   const dialogRef = this.dialog.open(AnticipatedYearDialogComponent, {
  //     data: { id: id },
  //   });

  //   dialogRef.afterClosed().subscribe((result) => {
  //     if (result && result.submitted) this.initTable(this.filters);
  //   });
  // }

  // delete(id: number) {
  //   this.dialog
  //     .open(DeleteConfirmDialogComponent, {
  //       data: {
  //         title: "Delete",
  //         message: `Are you sure you want to delete this Anticipated Year item?`,
  //       },
  //     })
  //     .afterClosed()
  //     .subscribe(async (dialogResult) => {
  //       if (dialogResult == true) {
  //         await this.anticipatedYearService.deleteAnticipatedYear(id).then(
  //           (data) => {
  //             this.initTable(this.filters);
  //             this.toastr.success("Deleted successfully");
  //           },
  //           (error) => {
  //             this.toastr.error(error.error.message);
  //           }
  //         );
  //       }
  //     });
  // }
}
