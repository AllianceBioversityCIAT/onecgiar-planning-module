import { Component } from "@angular/core";
import { ContactUsDialogComponent } from "./contact-us-dialog/contact-us-dialog.component";
import { MatDialog } from "@angular/material/dialog";
import { HeaderService } from "../header.service";

@Component({
    selector: "app-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"],
    standalone: false
})
export class FooterComponent {
  constructor(private dialog: MatDialog, public headerService: HeaderService) {}

  openDialogContactUs() {
    this.dialog.open(ContactUsDialogComponent, {});
  }
}
