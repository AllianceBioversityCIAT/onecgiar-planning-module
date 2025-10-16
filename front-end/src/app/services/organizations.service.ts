import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrganizationsService {
  constructor(private http: HttpClient) {}

  async getOrganizations(filters: any = null,admin:boolean=false) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
     const adminPath=admin? '/admin':'';
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/organizations'+ adminPath, { params: finalFilters })
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }
 

  async getOrganization(code: string) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/organizations/' + code)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  submitOrganization(code: string = '0', data: {}) {
    if (code != '0') {
      return firstValueFrom(
        this.http
          .patch(environment.api_url + '/organizations/' + code, data)
          .pipe(map((d: any) => d))
      );
    } else {
      return firstValueFrom(
        this.http
          .post(environment.api_url + '/organizations', data)
          .pipe(map((d: any) => d))
      );
    }
  }

  deleteOrganization(id: number) {
    return firstValueFrom(
      this.http
        .delete(environment.api_url + '/organizations/' + id)
        .pipe(map((d: any) => d))
    );
  }
}
