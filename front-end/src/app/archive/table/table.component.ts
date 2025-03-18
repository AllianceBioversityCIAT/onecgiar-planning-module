import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Meta, Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { ArchiveService } from 'src/app/services/archive.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
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
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;


  constructor(
    private archiveService: ArchiveService,
    private authService: AuthService,
    private headerService: HeaderService,
    private title: Title,
    private meta: Meta,
    private toster: ToastrService,
  ) {
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundDeleteYes = "#5569dd";
    this.headerService.backgroundDeleteClose = "#808080";
    this.headerService.backgroundDeleteLr = "#5569dd";

    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
    this.headerService.logoutSvg =
      "brightness(0) saturate(100%) invert(43%) sepia(18%) saturate(3699%) hue-rotate(206deg) brightness(89%) contrast(93%)";
  }


  user: any;
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  allfilters: any;

  async ngOnInit() {
    if (this.authService.getLoggedInUser())
      await this.getArchivedInitiatives();
    else
      this.authService.goToLogin();

    this.user = this.authService.getLoggedInUser();

    this.title.setTitle("Archive");
    this.meta.updateTag({ name: "description", content: "Planning" });
  }

  async getArchivedInitiatives(filters = null) {
    if (this.authService.getLoggedInUser())
      await this.archiveService.getArchivedInitiatives(
        filters,
        this.pageIndex,
        this.pageSize
      ).then(
        (data) => {
          this.dataSource = new MatTableDataSource(data?.result);
          this.length = data.count;
        }, (error) => {
          this.toster.error('Connection Error', undefined, { disableTimeOut: true })
        }
      );
  }

  filter(filters: any) {
    this.allfilters = filters;
    this.pageIndex = 1;
    this.pageSize = 10;
    this.getArchivedInitiatives(filters);
    this.paginator.pageSize = 0;
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getArchivedInitiatives(this.allfilters);
  }

  myRoles(roles: any) {
    const roles_ = roles.filter((d: any) => d.user_id == this.user.id);
    if (roles_.length) return roles_.map((d: any) => d.role).join(", ");
    else return this.IsAdmin() ? "Admin" : "Guest";
  }

  IsAdmin() {
    return this.user.role == "admin" || false;
  }
}
