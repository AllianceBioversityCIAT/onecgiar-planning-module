import { AfterViewInit, Component, OnInit, ViewChild } from "@angular/core";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatSort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { InitiativesService } from "../services/initiatives.service";
import { AuthService } from "../services/auth.service";
import { ROLES } from "../components/new-team-member/new-team-member.component";
import { AssignOrganizationsComponent } from "../assign-organizations/assign-organizations.component";
import { PhasesService } from "../services/phases.service";
import { MatDialog } from "@angular/material/dialog";
import { HeaderService } from "../header.service";
import { Meta, Title } from "@angular/platform-browser";

/**
 * @title Data table with sorting, pagination, and filtering.
 */
@Component({
  selector: "app-initiatives",
  templateUrl: "./initiatives.component.html",
  styleUrls: ["./initiatives.component.scss"],
})
export class InitiativesComponent implements OnInit {
  displayedColumns: string[] = [
    "id",
    "official_code",
    "name",
    "short_name",
    "my_role",
    "last_update_at",
    "status",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  initiatives: any = [];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private initiativesService: InitiativesService,
    private authService: AuthService,
    private headerService: HeaderService,
    private phasesService: PhasesService,
    private dialog: MatDialog,
    private title: Title,
    private meta: Meta
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #0F212F, #0E1E2B)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  bottom, #436280, #30455B)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  bottom, #436280, #30455B)";

    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #0f212f, #0f212f)";
  }
  user: any;
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  allfilters: any;
  async ngOnInit() {
    if (this.authService.getLoggedInUser()) await this.getInitiatives();
    this.user = this.authService.getLoggedInUser();

    this.title.setTitle("Planning");
    this.meta.updateTag({ name: "description", content: "Planning" });
  }

  async getInitiatives(filters = null) {
    if (this.authService.getLoggedInUser())
      this.initiatives = await this.initiativesService.getInitiatives(
        filters,
        this.pageIndex,
        this.pageSize
      );
    this.dataSource = new MatTableDataSource(this.initiatives?.result);
    this.length = this.initiatives.count;
  }

  filter(filters: any) {
    this.allfilters = filters;
    this.pageIndex = 1;
    this.pageSize = 10;
    this.getInitiatives(filters);
    this.paginator.pageSize = 0;
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getInitiatives(this.allfilters);
  }

  myRoles(roles: any) {
    const roles_ = roles.filter((d: any) => d.user_id == this.user.id);
    if (roles_.length) return roles_.map((d: any) => d.role).join(", ");
    else return this.IsAdmin() ? "Admin" : "Guest";
  }

  isLeader(roles: any) {
    const roles_ = roles.filter((d: any) => d.user_id == this.user.id);
    if (roles_.length)
      return roles_.map((d: any) => d.role)[0] == ROLES.LEAD || this.IsAdmin();
    else return this.IsAdmin();
  }

  IsAdmin() {
    return this.user.role == "admin" || false;
  }

  isCoordinator(roles: any) {
    const roles_ = roles.filter((d: any) => d.user_id == this.user.id);
    if (roles_.length)
      return roles_.map((d: any) => d.role)[0] == ROLES.COORDINATOR || false;
    else return false;
  }

  isContributor(roles: any) {
    const roles_ = roles.filter((d: any) => d.user_id == this.user.id);
    if (roles_.length)
      return roles_.map((d: any) => d.role)[0] == ROLES.CONTRIBUTOR || false;
    else return false;
  }

  async openDialog(id: number = 0) {
    const activePhase = await this.phasesService.getActivePhase();
    this.dialog.open(AssignOrganizationsComponent, {
      data: { phase_id: activePhase.id, initiative_id: id },
    });
  }
}
