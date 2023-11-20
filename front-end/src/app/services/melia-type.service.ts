import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MeliaTypeService {

  constructor(private http: HttpClient) {}

  submitMeliaType(id: number = 0, data: {}) {
    if (id) {
      return firstValueFrom(
        this.http.put(environment.api_url+"/melia-type/" + id, data).pipe(map((d: any) => d))
      ).catch((e) => false);
    } else {
      return firstValueFrom(
        this.http.post(environment.api_url+"/melia-type", data).pipe(map((d: any) => d))
      ).catch((e) => false);
    }
  }

  async getMeliaTypeById(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/melia-type/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getMeliaTypes(filters: any = null) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === 'string')
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != '')
          finalFilters[element] = filters[element];
      });
      return firstValueFrom(
        this.http.get(environment.api_url+'/melia-type', { params: finalFilters }).pipe(map((d: any) => d))
      ).catch((e) => false);
  }

  async deleteMeliaType(id: number) {
    return firstValueFrom(
      this.http.delete(environment.api_url+'/melia-type/' + id).pipe(map((d: any) => d))
    );
  }
}
