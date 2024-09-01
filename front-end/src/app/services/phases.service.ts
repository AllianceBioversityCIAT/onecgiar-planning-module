import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class PhasesService {
  constructor(private http: HttpClient) {}

  async getPhases(filters: any = null) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
    return firstValueFrom(
      this.http.get(environment.api_url+"/phases", { params: finalFilters }).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getPhase(id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/phases/" + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  submitPhase(id: number = 0, data: {}) {
    if (id) {
      return firstValueFrom(
        this.http.patch(environment.api_url+"/phases/" + id, data).pipe(map((d: any) => d))
      ).catch((e) => false);
    } else {
      return firstValueFrom(
        this.http.post(environment.api_url+"/phases", data).pipe(map((d: any) => d))
      ).catch((e) => false);
    }
  }

  deletePhase(id: number) {
    return firstValueFrom(
      this.http.delete(environment.api_url+"/phases/" + id).pipe(map((d: any) => d))
    );
  }

  getTocPhases() {
    return firstValueFrom(
      this.http
        .get(environment.api_url+"/phases/toc-phases")
        .pipe(map((d: any) => d.data))
    ).catch((e) => false);
  }

  activatePhase(id: number) { 
    return firstValueFrom(
      this.http.get(environment.api_url+"/phases/activate/" + id).pipe(map((d: any) => d))
    );
  }

  deactivatePhase(id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/phases/deactivate/" + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getActivePhase() {
    return firstValueFrom(
      this.http.get(environment.api_url+"/phases/active").pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getInitiatives(phase_id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url+"/phases/" + phase_id + "/initiatives")
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  assignPhaseInitOrgs(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+"/phases/assign-orgs", data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getAssignedOrgs(phase_id: number, initiative_id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url+"/phases/assigned-orgs/" + phase_id + "/" + initiative_id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }
}
