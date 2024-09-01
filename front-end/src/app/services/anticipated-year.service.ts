import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnticipatedYearService {

  // constructor(private http: HttpClient) {}

  // submitAnticipatedYear(id: number = 0, data: {}) {
  //   if (id) {
  //     return firstValueFrom(
  //       this.http.put(environment.api_url+"/anticipated-year/" + id, data).pipe(map((d: any) => d))
  //     ).catch((e) => false);
  //   } else {
  //     return firstValueFrom(
  //       this.http.post(environment.api_url+"/anticipated-year", data).pipe(map((d: any) => d))
  //     ).catch((e) => false);
  //   }
  // }

  // async getAnticipatedYearById(id: any) {
  //   return firstValueFrom(
  //     this.http.get(environment.api_url+'/anticipated-year/' + id).pipe(map((d: any) => d))
  //   ).catch((e) => false);
  // }

  // async getAnticipatedYear(filters: any = null) {
  //   let finalFilters: any = {};
  //   if (filters)
  //     Object.keys(filters).forEach((element) => {
  //       if (typeof filters[element] === 'string')
  //         filters[element] = filters[element].trim();

  //       if (filters[element] != null && filters[element] != '')
  //         finalFilters[element] = filters[element];
  //     });
  //     return firstValueFrom(
  //       this.http.get(environment.api_url+'/anticipated-year', { params: finalFilters }).pipe(map((d: any) => d))
  //     ).catch((e) => false);
  // }

  // async deleteAnticipatedYear(id: number) {
  //   return firstValueFrom(
  //     this.http.delete(environment.api_url+'/anticipated-year/' + id).pipe(map((d: any) => d))
  //   );
  // }
}
