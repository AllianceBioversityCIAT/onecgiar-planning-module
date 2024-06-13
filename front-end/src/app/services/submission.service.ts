import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as saveAs from 'file-saver';
import { Observable, firstValueFrom, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  constructor(private http: HttpClient) {}
  async markStatus(
    organization_code: string,
    initiative_id: number,
    phase_id: number,
    status: boolean,
    organization: any
  ) {
    return firstValueFrom(
      this.http
        .patch(environment.api_url+'/submission/center/status', {
          organization_code,
          initiative_id,
          phase_id,
          status,
          organization
        })
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  async excel(id: any) {
    const data = await firstValueFrom(
      this.http.get(environment.api_url+'/submission/excel/' + id, { responseType: 'blob' }).pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Planning.xlsx');
  }

  async excelCurrent(id: any) {
    const data = await firstValueFrom(
      this.http.get(environment.api_url+'/submission/excelCurrent/' + id, { responseType: 'blob' }).pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Planning.xlsx');
  }

  async excelCurrentForCenter(initId: any , organization:any) {
    const data = {
      organization: organization,
      initId: initId
    }
    const result = await firstValueFrom(
      this.http.post(environment.api_url+'/submission/excelCurrentCenter/' , data, {responseType: 'blob'}).pipe(map((d: Blob) => d))
    );
    saveAs(result, 'Planning.xlsx');
  }

  async cancelSubmission(id: number, data: any) {
    return firstValueFrom(
      this.http.patch(environment.api_url+'/submission/cancellastsubmission/' + id, data).pipe(map((d: any) => d))
    );
  }


  async getToc(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/submission/toc/' + id).pipe(map((d: any) => d))
    );
  }

  async getSubmissionsByInitiativeId(id: number, filters: any = null, page: any = null, limit: any = null, withFilters: boolean) {
    if(withFilters == false) {
      return firstValueFrom(
        this.http
          .get(environment.api_url+'/submission/initiative_id/' + id, { params: { withFilters : false} })
          .pipe(map((d: any) => d))
      ).catch((e) => false);
    } else {
      let finalFilters: any = {};
      if (filters)
        Object.keys(filters).forEach((element) => {
          if (typeof filters[element] === 'string')
            filters[element] = filters[element].trim();
  
          if (filters[element] != null && filters[element] != '')
            finalFilters[element] = filters[element];
        });
        return firstValueFrom(
          this.http
            .get(environment.api_url+`/submission/initiative_id/${id}/?page=${page}&limit=${limit}`, { params: finalFilters })
            .pipe(map((d: any) => d))
        ).catch((e) => false);
    }
  }
  

  async getSubmissionsById(id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/submission/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getMeliaByInitiative(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/melia/initiative/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getMeliaBySubmission(id: any) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/melia/submission/' + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getIpsrs() {
    return firstValueFrom(
      this.http.get(environment.api_url+'/ipsr').pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async getIpsrByInitiative(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/ipsr-value/initiative/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getIpsrBySubmission(id: any) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/ipsr-value/submission/' + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getCrossByInitiative(id: any) {
    return firstValueFrom(
      this.http
        .get(environment.api_url+'/cross-cutting/initiative/' + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getCrossBySubmission(id: any) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + '/cross-cutting/submission/' + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async newMelia(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+'/melia', data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async saveIPSR(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+'/ipsr-value', data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getMeliaById(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/melia/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async updateMelia(id: number, data: any) {
    return firstValueFrom(
      this.http.patch(environment.api_url+'/melia/' + id, data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async deleteMelia(id: number) {
    return firstValueFrom(
      this.http.delete(environment.api_url+'/melia/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getCrossById(id: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/cross-cutting/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async newCross(data: any) {
    return firstValueFrom(
      this.http.post(environment.api_url+'/cross-cutting', data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async updateCross(id: number, data: any) {
    return firstValueFrom(
      this.http.patch(environment.api_url+'/cross-cutting/' + id, data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async deleteCross(id: number) {
    return firstValueFrom(
      this.http.delete(environment.api_url+'/cross-cutting/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiative(id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/initiatives/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getOrganizations() {
    return firstValueFrom(
      this.http.get(environment.api_url+'/organizations').pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getPeriods(phase_id: number) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/periods/phase/' + phase_id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async submit(id: number, data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url+'/submission/save/' + id, data)
        .pipe(map((d: any) => d))
    );
  }

  async getSavedData(id: number, phaseId: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/submission/save/' + id + '/phaseId/' + phaseId).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async saveResultValues(id: number, data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url+'/submission/save_result_values/' + id, data)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async saveAllResultValues(id: number, data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url+'/submission/save_all_result_values/' + id, data)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async saveResultValue(id: number, data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url+'/submission/save_result_value/' + id, data)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async updateSubmissionStatus(id: number, data: any) {
    return firstValueFrom(
      this.http
        .patch(environment.api_url+'/submission/status/' + id, data)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async saveWpBudget(id: number, data: any) {
    return firstValueFrom(
      this.http
        .post(environment.api_url+'/submission/save_wp_budget/' + id, data)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getWpBudgets(id: number, phaseId: any) {
    return firstValueFrom(
      this.http.get(environment.api_url+'/submission/wp_budgets/' + id + '/phase/' + phaseId).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getBudgets(id: number, phase_id: any) {
    return firstValueFrom(
      this.http
        .get(environment.api_url+'/submission/submission_budgets/' + id + '/phase_id/' + phase_id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getMeliaTypes() {
    return firstValueFrom(
      this.http.get(environment.api_url+'/melia/types').pipe(map((d: any) => d))
    ).catch((e) => false);
  }




}
