import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class PeriodsService {
  constructor(private http: HttpClient) {}

  async getPeriods(filters: any = null, page: number, limit: number) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
    return firstValueFrom(
      this.http.get(`api/periods?page=${page}&limit=${limit}`, {params: finalFilters}).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getPeriod(id: number) {
    return firstValueFrom(
      this.http.get("api/periods/" + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  submitPeriod(id: number = 0, data: {}) {
    if (id) {
      return firstValueFrom(
        this.http.patch("api/periods/" + id, data).pipe(map((d: any) => d))
      ).catch((e) => false);
    } else {
      return firstValueFrom(
        this.http.post("api/periods", data).pipe(map((d: any) => d))
      ).catch((e) => false);
    }
  }

  deletePeriod(id: number) {
    return firstValueFrom(
      this.http.delete("api/periods/" + id).pipe(map((d: any) => d))
    );
  }
}
