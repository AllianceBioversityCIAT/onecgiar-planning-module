import { Component } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Meta, Title } from "@angular/platform-browser";
import { ToastrService } from "ngx-toastr";
import { HeaderService } from "src/app/header.service";
import { ConstantService } from "src/app/services/constant.service";
import { EditUnderMaintenanceComponent } from "./edit-under-maintenance/edit-under-maintenance.component";
import { UnderMaintenanceService } from "src/app/services/under-maintenance.service";
@Component({
  selector: "app-parameters-settings",
  templateUrl: "./parameters-settings.component.html",
  styleUrls: ["./parameters-settings.component.scss"],
})
export class ParametersSettingsComponent {
  canSubmit!: boolean;
  publishValue: any;
  activeValue: any;
  Messages: any;
  value: any;
  isActivateToggled!: boolean;

  constructor(
    private constantService: ConstantService,
    private underMaintenanceService: UnderMaintenanceService,
    private dialog: MatDialog,
    private toster: ToastrService,
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
    this.headerService.backgroundDeleteYes = "#FF5A54";
    this.headerService.backgroundDeleteClose = "#04030F";
    this.headerService.backgroundDeleteLr = "#04030F";
    this.headerService.logoutSvg =
      "brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";
  }

  async ngOnInit() {
    await this.getPublishStatus();
    await this.getUnderMaintenance();

    await this.getActivateStatus();

    this.title.setTitle("Parameter settings");
    this.meta.updateTag({ name: "description", content: "Parameter settings" });
  }

  async getUnderMaintenance() {
    this.Messages = await this.underMaintenanceService.getUnderMaintenance();
    console.log(this.Messages);
  }

  async getPublishStatus() {
    this.publishValue = await this.constantService.getSubmitStatus();
    if (this.publishValue.value == "0") {
      this.canSubmit = false;
    } else {
      this.canSubmit = true;
    }
  }

  editUnderMaintenance($event: any) {
    const _popup = this.dialog.open(EditUnderMaintenanceComponent, {
      width: "auto",
      maxHeight: "auto",
      data: {
        element: $event,
      },
    });
    _popup.afterClosed().subscribe(async (response) => {
      await this.getUnderMaintenance();
    });
  }

  async toggle() {
    this.canSubmit = !this.canSubmit;
    this.constantService.updateSubmitStatus(this.canSubmit);
  }

  async getActivateStatus() {
    this.publishValue = await this.underMaintenanceService.getStatus();
    if (this.publishValue.status == "0") {
      this.isActivateToggled = false;
    } else {
      this.isActivateToggled = true;
    }
  }

  async onActivateChecked() {
    this.isActivateToggled = !this.isActivateToggled;
    this.underMaintenanceService.updateStatus(this.isActivateToggled);
  }
}
