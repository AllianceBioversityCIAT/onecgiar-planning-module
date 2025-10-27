import { Injectable } from '@angular/core';
import { environment } from "src/environments/environment";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class AnaplanService {

  constructor(private http: HttpClient) {}

  async getAll() {
    return firstValueFrom(
      this.http.get(environment.api_url+"/anaplan/all").pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getAllValues(initiative_id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/anaplan/all-values/" + initiative_id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getAllValuesVersion(initiative_id: number, version_id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/anaplan/all-values/" + initiative_id + "/version/" + version_id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  createOrUpdate(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+"/anaplan", data).pipe(map((d: any) => d))
    );
  }
}
