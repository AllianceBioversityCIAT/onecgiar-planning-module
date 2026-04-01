import { Component, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { HeaderService } from "../header.service";

@Component({
    selector: "app-admin",
    templateUrl: "./admin.component.html",
    styleUrls: ["./admin.component.scss"],
    standalone: false
})
export class AdminComponent {
  container!: ViewContainerRef;

  componentName: any = {
    userManagement: "user-management",
    parametersSettings: "parameters-settings",
    announcements: "announcements",
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private headerService: HeaderService
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  top, #0F212F, #09151E)";
  }

  ngOnInit(): void {}
}
