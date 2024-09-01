import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { HeaderService } from 'src/app/header.service';
import { EmailsService } from 'src/app/services/emails.service';
import { ToastrService } from "ngx-toastr";
import { Meta, Title } from '@angular/platform-browser';
import { EmailBodyComponent } from './email-body/email-body.component';
@Component({
  selector: 'app-emails',
  templateUrl: './emails.component.html',
  styleUrls: ['./emails.component.scss']
})
export class EmailsComponent {
  @ViewChild(MatPaginator) paginator: MatPaginator;

  columnsToDisplay: string[] = ["id", "name", "email", "subject", "status", "created At", "actions"];
  dataSource: MatTableDataSource<any>;
  emails: any = [];
  length!: number;
  pageSize: number = 10;
  pageIndex: number = 1;
  filterForm: FormGroup = new FormGroup({});
  filters: any = null;

  constructor(
    private emailsService: EmailsService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private title: Title,
    private meta: Meta,
    private fb: FormBuilder
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

  sort = [
    { name: "ID (lowest first)", value: "id,ASC" },
    { name: "ID (highest first)", value: "id,DESC" },
    { name: "Name (A to Z)", value: "name,ASC" },
    { name: "Name (Z to A)", value: "name,DESC" },
  ];

  status = [
    { name: "All", value: "" },
    { name: "Sent", value: "true" },
    { name: "Not Sent", value: "false" },
  ];

  async ngOnInit() {
    this.filterForm = this.fb.group({
      search: [null],
      status: [this.status[0]],
      sort: [null],
    });
    await this.initTable();
    this.setForm();
  }

  setForm() {
    this.filterForm.valueChanges.subscribe(() => {
      this.filters = this.filterForm.value;
      this.pageIndex = 1;
      this.pageSize = 10;
      this.initTable(this.filters);
      this.paginator.pageSize = 0;
    });
  }

  async pagination(event: PageEvent) {
    this.pageIndex = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.initTable(this.filters);
  }

  async initTable(filters = null) {
    this.emails = await this.emailsService.getAllEmails(
      filters,
      this.pageIndex,
      this.pageSize
    );
    this.dataSource = new MatTableDataSource(this.emails?.result);
    this.length = this.emails?.count;
    this.title.setTitle("Emails management");
    this.meta.updateTag({ name: "description", content: "Emails management" });
  }

  openEmailBodyDialog(element: any): void {
    const dialogRef = this.dialog.open(EmailBodyComponent, {
      width: '600px',
      data: element
    });

  }

  resetForm() {
    this.filterForm.reset();
    this.filterForm.markAsUntouched();
  }
}
