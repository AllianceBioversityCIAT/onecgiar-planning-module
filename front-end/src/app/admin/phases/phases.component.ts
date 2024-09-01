import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
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
import { HeaderService } from "src/app/header.service";
import { DeleteConfirmDialogComponent } from "src/app/delete-confirm-dialog/delete-confirm-dialog.component";
import { ToastrService } from "ngx-toastr";
import { Meta, Title } from "@angular/platform-browser";
import { FormBuilder, FormGroup } from "@angular/forms";
@Component({
  selector: "app-phases",
  templateUrl: "./phases.component.html",
  styleUrls: ["./phases.component.scss"],
})
export class PhasesComponent implements OnInit {
  columnsToDisplay: string[] = [
    "id",
    "name",
    "reporting_year",
    "toc_phase",
    "start_date",
    "end_date",
    "previous_phase",
    "status",
    "active",
    "show_eoi",
    "actions",
  ];

  dataSource: MatTableDataSource<any>;
  phases: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private phasesService: PhasesService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private Toastr: ToastrService,
    private fb: FormBuilder,
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
    this.headerService.logoutSvg="brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";
    
  }
  showManageInit: boolean = false;
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
    this.initTable();
    this.setForm();
  }

  async initTable(filter = null) {
    this.phases = await this.phasesService.getPhases(filter);
    this.dataSource = new MatTableDataSource(this.phases);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.title.setTitle("Phases");
    this.meta.updateTag({ name: "description", content: "Phases" });
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(PhaseDialogComponent, {
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
          message: `Are you sure you want to delete this Phase item?`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          await this.phasesService.deletePhase(id).then(
            (data) => {
              this.Toastr.success("Deleted successfully");
              this.initTable(this.filters);
            },
            (error) => {
              this.Toastr.error(error.error.message);
            }
          );
        }
      });
  }

  activate(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Deactivate",
          message: `Activating phase item will deactivate other active phases.
          Are you sure you want to activate this Phase item?`,
          svg: `../../../../assets/shared-image/disabled.png`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          await this.phasesService.activatePhase(id).then((res) => {
            this.initTable(this.filters);
            this.Toastr.success("activated successfully");
          }, (error) => {
            this.Toastr.error(error.error.message);

          })
        }
      });
  }

  deactivate(id: number) {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Activate",
          message: `Are you sure you want to deactivate this Phase item?`,
          svg: `../../../../assets/shared-image/checked-2.png`,
        },
      })
      .afterClosed()
      .subscribe(async (dialogResult) => {
        if (dialogResult == true) {
          let result = await this.phasesService.deactivatePhase(id);
          if (result) this.initTable(this.filters);
          this.Toastr.success("deactivated successfully");
        }
      });
  }
}
