import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ArchiveService {

  constructor(private http: HttpClient) { }

  async getArchivedInitiatives(filters: any = null, page: any, limit: any) {
      let finalFilters: any = {};
      if (filters)
        Object.keys(filters).forEach((element) => {
          if (typeof filters[element] === "string")
            filters[element] = filters[element].trim();

          if (filters[element] != null && filters[element] != "")
            finalFilters[element] = filters[element];
        });
      return firstValueFrom(
        this.http
          .get(environment.api_url + `/archive?page=${page}&limit=${limit}`, { params: finalFilters })
          .pipe(map((d: any) => d))
      ).catch((e) => false);
  }
}
