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

  async getAllValues() {
    return firstValueFrom(
      this.http.get(environment.api_url+"/anaplan/all-values").pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  createOrUpdate(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+"/anaplan", data).pipe(map((d: any) => d))
    );
  }
}
