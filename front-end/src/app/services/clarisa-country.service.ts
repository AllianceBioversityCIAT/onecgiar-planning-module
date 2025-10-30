import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { firstValueFrom, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ClarisaCountryService {
  constructor(private http: HttpClient) {}

  async getAll() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/clarisa-country/all')
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  createOrUpdate(data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url + '/clarisa-country', {
          initiative_id: data.initiative_id,
          wp_official_code: data.wp.ost_wp.wp_official_code,
          partner_code:data.partner.code,
          selectedCountries:data.partner.selectedCountries.map((c: any) => c.code),
          result_id:data.result_id,
        })
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
