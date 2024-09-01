import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class HeaderService {
  background: string = "#0f212f";

  backgroundNavMain: string = "#436280";

  backgroundUserNavButton: string = "#436280";
  backgroundFooter: string = "#436280";
  backgroundHeaderDialog: string = "#436280";

  backgroundDeleteLr: string = "";

  backgroundDeleteYes: string = "";

  backgroundDeleteClose: string = "";

  logoutSvg:string ="brightness(0) saturate(100%) invert(43%) sepia(18%) saturate(3699%) hue-rotate(206deg) brightness(89%) contrast(93%)";

  constructor() {}
}
