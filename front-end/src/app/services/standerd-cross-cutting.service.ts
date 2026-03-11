import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class StanderdCrossCuttingService {
  constructor(private http: HttpClient) {}

  getAll() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/standerd-cross-cutting")
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getOne(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/standerd-cross-cutting/" + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  submit(id: number = 0, data: {}) {
    if (id) {
      return firstValueFrom(
        this.http
          .patch(environment.api_url + "/standerd-cross-cutting/" + id, data)
          .pipe(map((d: any) => d))
      ).catch((e) => false);
    } else {
      return firstValueFrom(
        this.http
          .post(environment.api_url + "/standerd-cross-cutting", data)
          .pipe(map((d: any) => d))
      ).catch((e) => false);
    }
  }

  delete(id: number) {
    return firstValueFrom(
      this.http
        .delete(environment.api_url + "/standerd-cross-cutting/" + id)
        .pipe(map((d: any) => d))
    );
  }

  seed() {
    return firstValueFrom(
      this.http
        .post(environment.api_url + "/standerd-cross-cutting/seed", {})
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }
}
