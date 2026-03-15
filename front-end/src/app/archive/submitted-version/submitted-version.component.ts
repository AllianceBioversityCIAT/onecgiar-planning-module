import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { HeaderService } from 'src/app/header.service';
import { ArchiveService } from 'src/app/services/archive.service';
import { InitiativesService } from 'src/app/services/initiatives.service';
import { LoaderService } from 'src/app/services/loader.service';
import { SubmissionService } from 'src/app/services/submission.service';

@Component({
    selector: 'app-submitted-version',
    templateUrl: './submitted-version.component.html',
    styleUrls: ['./submitted-version.component.scss'],
    standalone: false
})
export class SubmittedVersionComponent implements OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns: string[] = [
    "id",
    "phase",
    "created_by",
    "created_at",
    "status",
    "status_reason",
    "toc_version_id",
    "actions",
  ];
  dataSource: MatTableDataSource<any>;
  submissions: any = [];
  user: any;
  params: any;
  initiativeId: any;
  allfilters: any;
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  archived_id: number;
  archivedData: any;

  constructor(
    private submissionService: SubmissionService,
    private activatedRoute: ActivatedRoute,
    private headerService: HeaderService,
    private title: Title,
    private meta: Meta,
    public loader: LoaderService,
    private archiveService: ArchiveService,

  ) {
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";

    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
  }

  async ngOnInit() {
    this.params = this.activatedRoute?.snapshot.params;
    this.archived_id = this.params.id;
    await this.initData();
  }

  async initData(filters = null) {
    await this.archiveService.getArchivedInitiativesById(this.archived_id).then(
      (data) => {
        this.archivedData = data;
      }
    );

    this.initiativeId = this.archivedData.initiative.id;

    this.submissions =
      await this.submissionService.getSubmissionsByInitiativeId(
        this.initiativeId,
        filters,
        this.pageIndex,
        this.pageSize,
        true
      );


    this.dataSource = new MatTableDataSource(this.submissions?.result);
    this.length = this.submissions?.result.length;

    this.title.setTitle("Archived submitted versions");
    this.meta.updateTag({ name: "description", content: "Submitted versions" });
  }

  filter(filters: any) {
    this.allfilters = filters;
    this.pageIndex = 1;
    this.pageSize = 10;
    this.initData(filters);
    this.paginator.pageSize = 0;
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.initData(this.allfilters);
  }
}
