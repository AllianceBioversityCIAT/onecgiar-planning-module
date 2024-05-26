import { Component, OnInit } from "@angular/core";
import { async } from "rxjs";
import { AuthService } from "src/app/services/auth.service";
import { UnderMaintenanceService } from "src/app/services/under-maintenance.service";

@Component({
  selector: "app-under-maintenance-page",
  templateUrl: "./under-maintenance-page.component.html",
  styleUrls: ["./under-maintenance-page.component.scss"],
})
export class UnderMaintenancePageComponent implements OnInit {
  data: string;
  constants: any;
  constructor(private underMaintenanceService: UnderMaintenanceService) {}

  async ngOnInit() {
    await this.getUnderMaintenance();
    // for (const item of this.constants)
    console.log(this.constants);
  }

  async getUnderMaintenance() {
    this.constants = await this.underMaintenanceService.getUnderMaintenance();
  }
}
