import { Component, ViewEncapsulation } from "@angular/core";
import { LoaderService } from "../services/loader.service";

@Component({
    selector: "app-spinner",
    templateUrl: "./spinner.component.html",
    styleUrls: ["./spinner.component.scss"],
    encapsulation: ViewEncapsulation.ShadowDom,
    standalone: false
})
export class SpinnerComponent {
  constructor(public loader: LoaderService) {}

  ngOnInit() {}
}
