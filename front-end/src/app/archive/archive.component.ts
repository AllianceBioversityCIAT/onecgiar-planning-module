import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ArchiveService } from '../services/archive.service';
import { AuthService } from '../services/auth.service';
import { HeaderService } from '../header.service';
import { Meta, Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss']
})
export class ArchiveComponent implements OnInit {
  displayedColumns: string[] = [
    "id",
    "official_code",
    "name",
    "short_name",
    "last_update_at",
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

    this.title.setTitle("Planning");
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
}
