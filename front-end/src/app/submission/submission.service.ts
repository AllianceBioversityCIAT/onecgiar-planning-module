import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubmissionService {
  constructor(private http: HttpClient) {}

  async getToc() {
    return firstValueFrom(
      this.http
        .get(
          '/api/submission/toc/cbf435de-b727-425f-a941-68915c869328'
        )
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  async getMeliaByInitiative(id: any) {
    return firstValueFrom(
      this.http.get('/api/melia/initiative/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async getCrossByInitiative(id: any) {
    return firstValueFrom(
      this.http.get('/api/cross-cutting/initiative/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async newMelia(data: any) {
    return firstValueFrom(
      this.http.post('/api/melia', data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async getMeliaById(id: any) {
    return firstValueFrom(
      this.http.get('/api/melia/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async updateMelia(id: number, data: any) {
    return firstValueFrom(
      this.http.patch('/api/melia/' + id, data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async deleteMelia(id: number) {
    return firstValueFrom(
      this.http.delete('/api/melia/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getCrossById(id: any) {
    return firstValueFrom(
      this.http.get('/api/cross-cutting/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async newCross(data: any) {
    return firstValueFrom(
      this.http.post('/api/cross-cutting', data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async updateCross(id: number, data: any) {
    return firstValueFrom(
      this.http.patch('/api/cross-cutting/' + id, data).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  async deleteCross(id: number) {
    return firstValueFrom(
      this.http.delete('/api/cross-cutting/' + id).pipe(map((d: any) => d))
    ).catch((e) => false);
  }
  
}
