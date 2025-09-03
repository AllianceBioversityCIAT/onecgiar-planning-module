import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConstantService {

  constructor(private http: HttpClient) { }

  async getSubmitStatus() {
    return firstValueFrom(this.http.get(environment.api_url+'/constants/system-submit').pipe(map(d=>d))).catch((e) => false);
  }

  async updateSubmitStatus(status: any) {
    const data = {status: status};
    return firstValueFrom(this.http.patch(environment.api_url+`/constants/update-system-submit`, data ).pipe(map(d=>d))).catch((e) => false);
  }

  async getShowIndicatorValues() {
    return firstValueFrom(this.http.get(environment.api_url+'/constants/indicator-values').pipe(map(d=>d))).catch((e) => false);
  }

  async updateShowIndicatorValues(status: any) {
    const data = {status: status};
    return firstValueFrom(this.http.patch(environment.api_url+`/constants/update-indicator-values`, data ).pipe(map(d=>d))).catch((e) => false);
  }

  // async editConstantsVariable(data:any) { 
  //   return firstValueFrom(this.http.put(`/constant`, data).pipe(map(d=>d))).catch((e) => false);
  // }

  // async getConstantsVariable() {
  //   return firstValueFrom(this.http.get(`/constant`).pipe(map(d=>d))).catch((e) => false);
  // }
}
