import { Component, EventEmitter, Output } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { ROLES } from "../components/new-team-member/new-team-member.component";

@Component({
  selector: "app-search-init",
  templateUrl: "./search-init.component.html",
  styleUrls: ["./search-init.component.scss"],
})
export class SearchInitComponent {
  constructor(private fb: FormBuilder) {}
  filterForm: FormGroup = new FormGroup({});

  @Output() filters: EventEmitter<any> = new EventEmitter<any>();

  roles = [ROLES.COORDINATOR, ROLES.LEAD,  ROLES.CoLeader, ROLES.CONTRIBUTOR]; 

  sort = [
    { name: "Official code (lowest first)", value: "official_code,ASC" },
    { name: "Official code (highest first)", value: "official_code,DESC" },
    { name: "Initiative Name (A to Z)", value: "name,ASC" },
    { name: "Initiative Name (Z to A)", value: "name,DESC" },
    { name: "Updated on (Oldest)", value: "last_update_at,ASC" },
    { name: "Updated on (Newest)", value: "last_update_at,DESC" },
    { name: "Initiative ID (lowest first)", value: "id,ASC" },
    { name: "Initiative ID (highest first)", value: "id,DESC" },
  ];

  status = [
    { name: "Draft", value: "Draft" },
    { name: "Pending", value: "Pending" },
    { name: "Approved", value: "Approved" },
    { name: "Rejected", value: "Rejected" },
  ];

  myIni: boolean = false;
  myIniChange() {
    this.filterForm.controls["my_ini"].setValue(this.myIni);
  }
  setForm() {
    let time: any = null;
    this.filterForm = this.fb.group({
      initiative_id: [null],
      name: [null],
      my_role: [null],
      sort: [null],
      my_ini: [false],
      status: [null],
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
    this.myIni = false;
    this.filterForm.reset();
    this.filterForm.markAsUntouched();
  }
  async export() {
    // await this.initiativeService.getExport(this.filterForm.value);
  }
  async ngOnInit() {
    this.setForm();
  }
}
