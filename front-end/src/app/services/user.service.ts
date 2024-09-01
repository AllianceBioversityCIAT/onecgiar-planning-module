import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, firstValueFrom, map } from "rxjs";

import jwt_decode from "jwt-decode";
import { environment } from "src/environments/environment";
import { saveAs } from "file-saver";
@Injectable({
  providedIn: "root",
})
export class UserService {
  constructor(private http: HttpClient) {}

  searchUsers(term: string): Observable<any[]> {
    return this.http
      .get(environment.api_url+'/users/search/' + term)
      .pipe(map((d: any) => d));
  }

  getLogedInUser(): any {
    if (localStorage.getItem("access_token") as string)
      return jwt_decode(localStorage.getItem("access_token") as string);
    else return false;
  }

  async exportUsers(filters: any = null) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
    const data = await firstValueFrom(
      this.http
        .get(environment.api_url+`/users/export/all`, {
          responseType: "blob",
          params: finalFilters
        })
        .pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Users.xlsx')
  }

  async getAllUsers(filters: any = null, page: number, limit: number) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
    return firstValueFrom(
      this.http.get(environment.api_url+`/users?page=${page}&limit=${limit}`, {params: finalFilters}).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getUser(id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/users/" + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  submitUser(id: number = 0, data: {}) {
    if (id) {
      return firstValueFrom(
        this.http.patch(environment.api_url+"/users/" + id, data).pipe(map((d: any) => d))
      );
    } else {
      return firstValueFrom(
        this.http.post(environment.api_url+"/users", data).pipe(map((d: any) => d))
      );
    }
  }

  deleteUser(id: number) {
    return firstValueFrom(
      this.http.delete(environment.api_url+"/users/" + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
}
