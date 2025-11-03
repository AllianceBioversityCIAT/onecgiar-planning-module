import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class PopoverManagementService {
  constructor(private http: HttpClient) {}

  async find() {
    return firstValueFrom(
      this.http.get(environment.api_url + "/popover").pipe(map((d: any) => d))
    );
  }

  async get(id: string) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/popover/" + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getByName(name: string) {
    return firstValueFrom(
      this.http
        .post(environment.api_url + "/popover/byName" , {name})
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getByToken(token: string) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/popover/token/" + token)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  update(id: string, data: {}) {
    return firstValueFrom(
      this.http
        .patch(environment.api_url + "/popover/" + id, data)
        .pipe(map((d: any) => d))
    );
  }

  create(data: {}) {
    return firstValueFrom(
      this.http
        .post(environment.api_url + "/popover", data)
        .pipe(map((d: any) => d))
    );
  }
}
