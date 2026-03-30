import { Component, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { Meta, Title } from "@angular/platform-browser";
import { ActivatedRoute, Params } from "@angular/router";
import { AssignOrganizationsComponent } from "src/app/assign-organizations/assign-organizations.component";
import { HeaderService } from "src/app/header.service";
import { PhasesService } from "src/app/services/phases.service";

@Component({
    selector: "app-phase-initiatives",
    templateUrl: "./phase-initiatives.component.html",
    styleUrls: ["./phase-initiatives.component.scss"],
    standalone: false
})
export class PhaseInitiativesComponent {
  columnsToDisplay: string[] = [
    "id",
    "official_code",
    "name",
    "organizations",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  initiatives: any = [];
  phaseId: number;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private phasesService: PhasesService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private headerService: HeaderService,
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
  }

  ngAfterViewInit() {
    this.route.params.subscribe((params: Params) => {
      this.phaseId = +params["id"];
      this.initTable();
    });
  }

  async initTable() {
    this.initiatives = await this.phasesService.getInitiatives(this.phaseId);
    this.dataSource = new MatTableDataSource(this.initiatives);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.title.setTitle("Phases Initiatives");
    this.meta.updateTag({ name: "description", content: "Phases Initiatives" });
  }

  openDialog(id: number = 0): void {
    const dialogRef = this.dialog.open(AssignOrganizationsComponent, {
      data: { phase_id: this.phaseId, initiative_id: id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.submitted) this.initTable();
    });
  }
}
