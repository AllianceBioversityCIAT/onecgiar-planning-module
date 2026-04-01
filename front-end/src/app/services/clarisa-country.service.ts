import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ClarisaCountryService {
  private cachedCountries: any[] | null = null;
  private pendingRequest: Promise<any> | null = null;

  constructor(private http: HttpClient) {}

  async getAll() {
    if (this.cachedCountries) {
      return this.cachedCountries;
    }
    if (this.pendingRequest) {
      return this.pendingRequest;
    }
    this.pendingRequest = firstValueFrom(
      this.http
        .get(environment.api_url + '/clarisa-country/all')
        .pipe(map((d: any) => d))
    )
      .then((result) => {
        this.cachedCountries = Array.isArray(result) ? result : [];
        this.pendingRequest = null;
        return this.cachedCountries;
      })
      .catch((e) => {
        this.pendingRequest = null;
        return false;
      });
    return this.pendingRequest;
  }

  createOrUpdate(data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url + '/clarisa-country', {
          initiative_id: data.initiative_id,
          wp_official_code: data.wp.ost_wp.wp_official_code,
          partner_code:data.partner.code,
          selectedCountries:data.partner.selectedCountries.map((c: any) => c.code),
          result_id:String(data.result_id),
        })
        .pipe(map((d: any) => d))
    );
  }

  findOne(data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url + '/clarisa-country/byItem', data)
        .pipe(map((d: any) => d))
    );
  }

  getAllValues(phase_id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/clarisa-country/values/' + phase_id)
        .pipe(map((d: any) => d))
    );
  }
}
