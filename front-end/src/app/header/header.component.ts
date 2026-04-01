import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { MatMenuTrigger } from "@angular/material/menu";
import { MatDialog } from "@angular/material/dialog";
import { LoadingService } from "../services/loading.service";
import jwt_decode from "jwt-decode";
import { delay } from "rxjs";

import { HeaderService } from "../header.service";
import { ConfirmComponent } from "../confirm/confirm.component";
import { AuthService } from "../services/auth.service";
import { DeleteConfirmDialogComponent } from "../delete-confirm-dialog/delete-confirm-dialog.component";
import { VersionCheckService } from "../services/version-check.service";
import { TawkService } from "../services/tawk.service";
import { environment } from "../../environments/environment";
declare global {
  interface Window { clarity: any; }
}
@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"],
    standalone: false
})
export class HeaderComponent implements OnInit {
  notificationNumberCount: number;
  isAdmin = false;
  isTestEnv = !environment.production;

  increment() {
    this.notificationNumberCount++;
  }
  clear() {
    this.notificationNumberCount = 0;
  }

  @ViewChild("menuBtn1", { read: MatMenuTrigger, static: false })
  menu1: MatMenuTrigger | any;

  foo() {
    this.menu1.openMenu(); // also closeMenu()
  }

  public url1: string = "";
  componentName: any = {
    userManagement: "user-management",
    parametersSettings: "parameters-settings",
    announcements: "announcements",
  };

  // @Output() clickEvent = new EventEmitter<{ userManagement: string }>();

  // public adminUrl = '/admin';

  // adminUrl for animation navlist of header when click admin-module the background-color of navlist will be change when click

  public adminUrl = {
    admin: "/admin",
    userManagement: "/admin/user-management",
    parameterSetttings: "/admin/parameters-settings",
    categories: "/admin/category",
    mitigation: "/admin/mitigation-status",
    settings: "/admin/parameters-settings/settings",
    announcements: "/admin/announcements",
    posted: "/admin/announcements/posted",
    drafts: "/admin/announcements/drafts",
    glossary: "/admin/glossary",
    faq: "/admin/faq",
    pageNotFounds: "/404",
  };

  // riskUrl for animation navlist of header when cilick all list nav than admin-module will be change background-color when click on any navlist than without admin-module

  public riskUrl = {
    home: "/home",
    riskManagement: "/home/risk-management/risk-report",
    riskReport: "/home/risk-management/risk-report/risk-report-form",
    submitted: "/home/risk-management/risk-report/submitted-versions",
    teamMembers: "/home/risk-management/risk-report/team-members",
    accelerated:
      "/home/risk-management/risk-report/submitted-versions/accelerated-breeding-version",
    about: "/about",
    glossary: "/glossary",
    faq: "/faq",
    dashboard: "/dashboard",
    pageNotFound: "/404",
  };

  k: any;

  constructor(
    public dialog: MatDialog,
    private loadingService: LoadingService,
    public router: Router,
    public headerService: HeaderService,
    private authService: AuthService,
    public versionCheck: VersionCheckService,
    private tawkService: TawkService
  ) {
    this.notificationNumberCount = 5;
    this.headerService.background =
      "linear-gradient(to right, #04030F, #04030F)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to right, #2A2E45, #212537)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to right, #2A2E45, #212537)";

    this.headerService.backgroundFooter =
      "linear-gradient(to top right, #2A2E45, #212537)";
    this.headerService.backgroundDeleteYes = "#5569dd";
    this.headerService.backgroundDeleteClose = "#808080";
    this.headerService.backgroundDeleteLr = "#5569dd";
  }

  user_info: any;
  loading = true;
  ngOnInit() {
    this.router.events.subscribe((e) => {
      this.user_info = this.authService.getLoggedInUser();
       if (window.clarity) {
          window.clarity('set', 'userId', this.user_info.id);
          window.clarity('set', 'username', this.user_info.full_name);
        }
       if (this.user_info?.full_name || this.user_info?.email) {
          this.tawkService.setVisitor(this.user_info.full_name || '', this.user_info.email || '');
        }
      this.isAdmin = this.authService.isAdmin();
    });
    this.loadingService.loadingSub.pipe(delay(0)).subscribe((d) => {
      this.loading = d;
    });
  }

  logout() {
    this.dialog
      .open(DeleteConfirmDialogComponent, {
        data: {
          title: "Logout",
          message: "Are you sure you want to logout?",
          svg: `../../assets/shared-image/logout.png`,
        },
      })
      .afterClosed()
      .subscribe((dialogResult) => {
        if (dialogResult) {
          localStorage.removeItem("access_token");
          this.user_info = null;
          this.authService.goToLogin()
        }
      });
  }
  login() {
    if (this.user_info) this.logout();
    else {
      this.authService.goToLogin();
    }
  }
  reloadPage() {
    window.location.reload();
  }

  homeRoute: any = "./home";
  accessHome() {
    if (this.user_info) {
      this.homeRoute = "./home";
    } else {
      this.login();
    }
  }
}
