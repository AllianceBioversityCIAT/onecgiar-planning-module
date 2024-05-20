import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class InitiativesService {
  constructor(private http: HttpClient) {}

  async getInitiative(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/initiatives/" + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiativeHistory(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/initiatives/" + id + "/history")
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiatives(filters: any = null, page: any, limit: any) {
    if (filters) {
      let finalFilters: any = {};
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === "string")
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != "")
          finalFilters[element] = filters[element];
      });
      return firstValueFrom(
        this.http
          .get(
            environment.api_url +
              `/initiatives/full?page=${page}&limit=${limit}`,
            { params: finalFilters }
          )
          .pipe(map((d: any) => d))
      );
    } else {
      return firstValueFrom(
        this.http
          .get(
            environment.api_url +
              `/initiatives/full?page=${page}&limit=${limit}`
          )
          .pipe(map((d: any) => d))
      );
    }
  }

  async getInitiativesOnly() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/getAll`)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getInitiativeUsers(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/${id}/roles`, {})
        .pipe(map((d) => d))
    );
  }

  getInitiativeRoles(initiativeId: number) {
    return this.http
      .get(environment.api_url + "/initiatives/" + initiativeId + "/roles", {})
      .toPromise();
  }

  createNewInitiativeRole(initiativeId: number, role: any): Observable<any> {
    return this.http.post<any>(
      environment.api_url + "/initiatives/" + initiativeId + "/roles",
      role
    );
  }

  updateInitiativeRole(
    initiativeId: number,
    roleId: number,
    role: any
  ): Observable<any> {
    return this.http.put(
      environment.api_url + "/initiatives/" + initiativeId + "/roles/" + roleId,
      role
    );
  }

  deleteInitiativeRole(initiativeId: number, roleId: number) {
    return this.http
      .delete(
        environment.api_url +
          "/initiatives/" +
          initiativeId +
          "/roles/" +
          roleId
      )
      .toPromise();
  }

  isAllowedToAccessChat(id: number) {
    return this.http.get<boolean>(
      environment.api_url + "/initiatives/" + id + "/is-allowed-to-access-chat"
    );
  }
}
