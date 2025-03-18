import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { ArchiveService } from 'src/app/services/archive.service';

@Component({
  selector: 'app-team-member',
  templateUrl: './team-member.component.html',
  styleUrls: ['./team-member.component.scss']
})
export class TeamMemberComponent implements OnInit {

  constructor(
    private archiveService: ArchiveService,
    private headerService: HeaderService,
    private title: Title,
    private meta: Meta,
    private toster: ToastrService,
    private activatedRoute: ActivatedRoute,
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
  archived_id: number;
  dataSource = new MatTableDataSource<any>([]);
  data: any;
  displayedColumns: string[] = [
    "Email",
    "User",
    "Role",
    "organizations",
    "Creation Date",
    "Status",
  ];
  async ngOnInit() {
    const params: any = this.activatedRoute?.snapshot.params;
    this.archived_id = params.id;
    
     this.getArchivedInitiativesById();

    this.title.setTitle("Archive team member");
    this.meta.updateTag({ name: "description", content: "Planning" });
  }

  async getArchivedInitiativesById() {
      await this.archiveService.getArchivedInitiativesById(this.archived_id).then(
        (data) => {
          console.log(data)
          this.data = data;
          this.dataSource = new MatTableDataSource(data?.data);

        }, (error) => {
          this.toster.error('Connection Error', undefined, { disableTimeOut: true })
        }
      );
  }

  join(data: any) {
    return data.map((d: any) => d.name).join(", ");
  }
}
