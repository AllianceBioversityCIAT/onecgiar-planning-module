import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { Observable, firstValueFrom, map } from "rxjs";
import { AuthGuard } from "../guards/auth.guard";
import { UserGuard } from "../guards/under-maintenance.guard";

@Injectable({
  providedIn: "root",
})
export class UnderMaintenanceService {
  // static onActive(): any {
  //   throw new Error("Method not implemented.");
  // }
  constructor(private http: HttpClient) {}

  // async updateSubmitStatus(status: any) {
  //   const data = { status: status };
  //   return firstValueFrom(
  //     this.http
  //       .patch(environment.api_url + `/constants/update-system-submit`, data)
  //       .pipe(map((d) => d))
  //   ).catch((e) => false);
  // }

  async getUnderMaintenance() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/under-maintenance`)
        .pipe(map((d) => d))
    ).catch((e) => false);
  }

  async editUnderMaintenance(data: any) {
    return firstValueFrom(
      this.http
        .put(environment.api_url + `/under-maintenance`, data)
        .pipe(map((d) => d))
    ).catch((e) => false);
  }

  async getStatus() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/under-maintenance/status")
        .pipe(map((d) => d))
    ).catch((e) => false);
  }

  async updateStatus(status: any) {
    const data = { status: status };
    return firstValueFrom(
      this.http
        .patch(environment.api_url + `/under-maintenance/update-status`, data)
        .pipe(map((d) => d))
    ).catch((e) => false);
  }
}
