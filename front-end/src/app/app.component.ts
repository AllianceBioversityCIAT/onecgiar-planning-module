import { Component, OnInit } from "@angular/core";
import { AuthService } from "./services/auth.service";
import {
  ConfirmComponent,
  ConfirmDialogModel,
} from "./confirm/confirm.component";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { ClarityService } from "./services/clarity.service";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
    standalone: false
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    public dialog: MatDialog,
    public router: Router,
    private clarity: ClarityService
  ) {
    const faviconTag: any = document.getElementById("faviconTag");

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      faviconTag.href = "/assets/shared-image/mask-group.svg";
    } else faviconTag.href = "/assets/shared-image/cgiar-logo.png";
  }
  user: any;
  ngOnInit(): void {
    this.router.events.subscribe((e) => {
      this.user = this.authService.getLoggedInUser();
    });
  }
  login() {
    this.authService.goToLogin();
  }

  logout() {
    this.dialog
      .open(ConfirmComponent, {
        maxWidth: "400px",
        data: new ConfirmDialogModel(
          "Logout",
          `Are you sure you want to logout?`
        ),
      })
      .afterClosed()
      .subscribe((dialogResult) => {
        if (dialogResult) {
          localStorage.removeItem("access_token");
          this.user = null;
          window.location.href = window.location.href;
        }
      });
  }
}
