import { Injectable } from '@angular/core';
import { environment } from "src/environments/environment";
import { firstValueFrom, map } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class BudgetAssumptionsService {

  constructor(private http: HttpClient) {}

  createOrUpdate(data: {}) {
    return firstValueFrom(
      this.http.post(environment.api_url+"/budget-assumptions", data).pipe(map((d: any) => d))
    );
  }


  async getOne(data: any) {  
    return firstValueFrom(
      this.http.get(environment.api_url + "/budget-assumptions", {
        params: data, 
      }).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getAllByItem(item_id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/budget-assumptions/" + item_id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  async getAll(phase_id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+"/budget-assumptions/all/" + phase_id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
}
