import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { ToastrService } from "ngx-toastr";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { HeaderService } from "src/app/header.service";
import { StanderdCrossCuttingService } from "src/app/services/standerd-cross-cutting.service";
import { StanderdCrossCuttingDialogComponent } from "./standerd-cross-cutting-dialog/standerd-cross-cutting-dialog.component";

@Component({
    selector: "app-standerd-cross-cutting",
    templateUrl: "./standerd-cross-cutting.component.html",
    styleUrls: ["./standerd-cross-cutting.component.scss"],
    standalone: false
})
export class StanderdCrossCuttingComponent implements OnInit {
  columnsToDisplay: string[] = ["id", "name", "actions"];
  dataSource: MatTableDataSource<any>;
  items: any[] = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private standerdCrossCuttingService: StanderdCrossCuttingService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private title: Title,
    private meta: Meta
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

  async ngOnInit() {
    await this.initTable();
  }

  async initTable() {
    this.items = (await this.standerdCrossCuttingService.getAll()) || [];
    this.dataSource = new MatTableDataSource(this.items);
    this.title.setTitle("Standard Cross Cutting");
    this.meta.updateTag({
      name: "description",
      content: "Standard Cross Cutting",
    });
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(StanderdCrossCuttingDialogComponent, {
      data: { id: id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted) this.initTable();
    });
  }

  delete(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Delete",
          message: `Are you sure you want to delete this Standard Cross Cutting item?`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          await this.standerdCrossCuttingService.delete(id).then(
            (data) => {
              this.initTable();
              this.toastr.success("Deleted successfully");
            },
            (error) => {
              this.toastr.error(error.error.message);
            }
          );
        }
      });
  }

  async seed() {
    const result = await this.standerdCrossCuttingService.seed();
    if (result !== false) {
      this.toastr.success("Default data seeded successfully");
      await this.initTable();
    } else {
      this.toastr.error("Failed to seed default data");
    }
  }
}
