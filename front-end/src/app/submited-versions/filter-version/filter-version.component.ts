import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { SubmissionService } from "src/app/services/submission.service";
@Component({
    selector: "app-filter-version",
    templateUrl: "./filter-version.component.html",
    styleUrls: ["./filter-version.component.scss"],
    standalone: false
})
export class FilterVersionComponent implements OnInit {
  constructor(
    private fb: FormBuilder,
    private submissionService: SubmissionService,
    private activatedRoute: ActivatedRoute
  ) {}
  filterForm: FormGroup = new FormGroup({});

  @Output() filters: EventEmitter<any> = new EventEmitter<any>();

  sort = [
    { name: "ID (lowest first)", value: "id,ASC" },
    { name: "ID (highest first)", value: "id,DESC" },
    { name: "Created on (Oldest)", value: "created_at,ASC" },
    { name: "Created on (Newest)", value: "created_at,DESC" },
  ];

  status = [
    { name: "Approved", value: "Approved" },
    { name: "Rejected", value: "Rejected" },
    { name: "Pending", value: "Pending" },
  ];
  submissions: any[] = [];
  phases: any[] = [];
  users: any[] = [];
  params: any;
  reportingYear: any;

  async ngOnInit() {
    this.setForm();
    this.params = this.activatedRoute?.snapshot.params;

    this.submissions =
      await this.submissionService.getSubmissionsByInitiativeId(
        this.params.id,
        null,
        null,
        null,
        false
      );

    this.submissions.map((d) => {
      this.phases.push(d.phase);
    });
    this.phases = this.phases.filter(
      (value, index, self) =>
        index ===
        self.findIndex((t) => t.id === value.id && t.name === value.name)
    );

    this.reportingYear = this.phases
      .filter(
        (value, index, self) =>
          index ===
          self.findIndex((t) => t.reportingYear === value.reportingYear)
      )
      .map((d: any) => {
        return d.reportingYear;
      });

    this.submissions.map((d) => {
      this.users.push(d.user);
    });
    this.users = this.users.filter(
      (value, index, self) =>
        index ===
        self.findIndex((t) => t.id === value.id && t.email === value.email)
    );
  }

  setForm() {
    let time: any = null;
    this.filterForm = this.fb.group({
      sort: [null],
      phase: [null],
      createdBy: [null],
      status: [null],
      reportingYear: [null],
    });
    this.filterForm.valueChanges.subscribe(() => {
      console.log(this.filterForm.value);
      if (time) clearTimeout(time);
      time = setTimeout(() => {
        this.filters.emit(this.filterForm.value);
      }, 500);
    });
  }

  resetForm() {
    this.filterForm.reset();
    this.filterForm.markAsUntouched();
  }
}
