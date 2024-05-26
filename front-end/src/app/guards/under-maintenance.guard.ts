import { Injectable } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from "@angular/router";
import { Observable } from "rxjs";
import { AuthService } from "../services/auth.service";
import { UnderMaintenanceService } from "../services/under-maintenance.service";

@Injectable({ providedIn: "root" })
export class UserGuard {
  constructor(
    private authService: AuthService,
    private router: Router,
    private underMaintenanceService: UnderMaintenanceService
  ) {}

  hold: any = [];
  k: any;

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<
    | boolean
    | UrlTree
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
  > {
    const isUser = this.authService.isUser();

    console.log(isUser);

    this.hold.push(await this.underMaintenanceService.getUnderMaintenance());
    for (let item of this.hold) console.log((this.k = item[0].status));

    // if (UserGuard)
    //   if (this.k === 0) return this.router.navigateByUrl("/under");
    //   else return this.router.navigateByUrl("/");

    // const loggedUser = this.authService.getLoggedInUser();
    if (isUser && this.k == 1) return this.router.navigateByUrl("/under");
    else return true;

    // if (isUser && this.underMaintenanceService.k === false) return true;
    // else this.router.navigateByUrl("/under");
    // if (this.underMaintenanceService.k === false) {
    //   return true;
    // } else {
    //   this.router.navigateByUrl("/under");
    // }
    // if (isUser) return true;
    // else this.authService.goToLogin();
    return false;
  }
}
