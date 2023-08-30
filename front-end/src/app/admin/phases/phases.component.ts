import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { PhasesService } from "src/app/services/phases.service";
import { PhaseDialogComponent } from "./phase-dialog/phase-dialog.component";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "src/app/confirm/confirm.component";

@Component({
  selector: "app-phases",
  templateUrl: "./phases.component.html",
  styleUrls: ["./phases.component.scss"],
})
export class PhasesComponent implements AfterViewInit {
  columnsToDisplay: string[] = [
    "id",
    "name",
    "reporting_year",
    "toc_phase",
    "start_date",
    "end_date",
    "previous_phase",
    "status",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  phases: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private phasesService: PhasesService,
    private dialog: MatDialog
  ) {}

  ngAfterViewInit() {
    this.initTable();
  }

  async initTable() {
    this.phases = await this.phasesService.getPhases();
    this.dataSource = new MatTableDataSource(this.phases);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(PhaseDialogComponent, {
      data: { id: id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted)
        this.initTable();
    });
  }

  delete(id: number) {
    this.dialog
      .open(ConfirmComponent, {
        maxWidth: "400px",
        data: new ConfirmDialogModel(
          "Delete",
          `Are you sure you want to delete this Phase item?`
        ),
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          let result = await this.phasesService.deletePhase(id);
          if (result) this.initTable();
        }
      });
  }
}