import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";
import { saveAs } from "file-saver";

@Injectable({
  providedIn: "root",
})
export class PorbService {
  constructor(private http: HttpClient) {}

  async getAows(programId: number) {
    const response = await firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/aow/${programId}`)
        .pipe(map((d: any) => d))
    ).catch(() => []);

    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray((response as any)?.data)) {
      return (response as any).data;
    }
    if (Array.isArray((response as any)?.results)) {
      return (response as any).results;
    }
    return [];
  }

  async getHlos(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("hlo", programId, porbAowId, centerId);
  }

  async getPartners(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("partner", programId, porbAowId, centerId);
  }

  async getBilaterals(
    programId: number,
    centerId?: number,
    excludeZero = false
  ) {
    let params = new HttpParams().set("program_id", String(programId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    if (excludeZero) params = params.set("exclude_zero", "true");
    return firstValueFrom(
      this.http.get(`${environment.api_url}/porb/bilateral`, { params }).pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async getMelia(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("melia", programId, porbAowId, centerId);
  }

  async getAnaplan(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("anaplan", programId, porbAowId, centerId);
  }

  async getCross(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("cross", programId, porbAowId, centerId);
  }

  async getConsolidation(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("consolidation", programId, porbAowId, centerId);
  }

  async getSummaryConsolidation(programId: number, centerId?: number) {
    let params = new HttpParams().set("program_id", String(programId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/summary-consolidation`, { params })
        .pipe(map((d: any) => d))
    ).catch(() => ({ rows: [], totals: {} }));
  }

  async getSummaryAowDetail(programId: number, porbAowId: number) {
    let params = new HttpParams()
      .set("program_id", String(programId))
      .set("porb_aow_id", String(porbAowId));
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/summary-aow-detail`, { params })
        .pipe(map((d: any) => d))
    ).catch(() => ({ hlos: [], partners: [], melia: [], bilateral: [], subtotals: {}, synergies: [], outcomes: [] }));
  }

  async getValidation(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("validation", programId, porbAowId, centerId);
  }

  async getValidationSummary(
    programId: number,
    centerId?: number
  ) {
    return this.getByFilter("validation-summary", programId, undefined, centerId);
  }

  async updateHlo(id: number, data: { hlo_budget?: number | null; hlo_assumption?: string }) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/hlo/${id}`, data).pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async updatePartner(
    id: number,
    data: {
      partner_is_contracted?: boolean | string;
      center_id?: number | string;
      partner_geo?: string;
      partner_country_codes?: Array<number | string>;
      partner_budget?: number | null;
      partner_assumption?: string;  // sent as partner_assumption, stored on contracted partner
    }
  ) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/partner/${id}`, data).pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async createUnknownPartner(data: { program_id: number; porb_aow_id: number; center_id: number }) {
    return firstValueFrom(
      this.http.post(`${environment.api_url}/porb/partner`, data).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async searchClarisaPartners(query: string) {
    const params = new HttpParams().set('q', query);
    return firstValueFrom(
      this.http.get(`${environment.api_url}/porb/partner/search-clarisa`, { params }).pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async resolvePartner(id: number, clarisa_partner_code: number) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/partner/${id}/resolve`, { clarisa_partner_code }).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteUnknownPartner(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/partner/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async searchClarisaCountries(query: string) {
    const params = new HttpParams().set('q', query);
    return firstValueFrom(
      this.http.get<any[]>(`${environment.api_url}/porb/country-percentage/search-clarisa`, { params }).pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async addManualCountry(data: { program_id: number; porb_aow_id: number; center_id: number; country_name: string }) {
    return firstValueFrom(
      this.http.post<any>(`${environment.api_url}/porb/country-percentage`, data).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteManualCountry(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/country-percentage/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteHlo(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/hlo/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteMelia(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/melia/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteBilateral(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/bilateral/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async updateBilateral(
    id: number,
    data: { bilateral_budget?: number | null; bilateral_assumption?: string }
  ) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/bilateral/${id}`, data)
        .pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async updateMelia(id: number, data: { melia_budget?: number | null; melia_assumption?: string }) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/melia/${id}`, data).pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async updateAnaplan(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    anaplan_id: number;
    budget?: number | null;
  }) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/anaplan`, data).pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async updateCross(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    standerd_cross_cutting_id: number;
    budget?: number | null;
    assumption?: string;
  }) {
    return firstValueFrom(
      this.http.patch(`${environment.api_url}/porb/cross`, data).pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async getSubmissionStatus(programId: number) {
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/submission/${programId}`)
        .pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async submitPorb(programId: number) {
    return firstValueFrom(
      this.http
        .post(`${environment.api_url}/porb/submit/${programId}`, {})
        .pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async updateSubmissionStatus(id: number, data: { status: string; status_reason?: string }) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/status/${id}`, data)
        .pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async cancelSubmission(id: number) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/cancel/${id}`, {})
        .pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async markStatus(
    organization_code: string,
    initiative_id: number,
    phase_id: number,
    status: boolean,
    organization: any
  ) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/center/status`, {
          organization_code,
          initiative_id,
          phase_id,
          status,
          organization,
        })
        .pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async markValidate(
    organization_code: string,
    initiative_id: number,
    phase_id: number,
    is_valid: boolean,
    organization: any
  ) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/center/validate`, {
          organization_code,
          initiative_id,
          phase_id,
          is_valid,
          organization,
        })
        .pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async exportExcel(programId: number) {
    const response = await firstValueFrom(
      this.http.get(`${environment.api_url}/porb/excel/${programId}`, {
        responseType: "blob",
        observe: "response",
      })
    );

    const blob = response.body as Blob;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "PORB.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    saveAs(blob, filename);
  }

  async exportZip(programId: number) {
    const response = await firstValueFrom(
      this.http.get(`${environment.api_url}/porb/excel/${programId}/zip`, {
        responseType: "blob",
        observe: "response",
      })
    );

    const blob = response.body as Blob;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "PORB.zip";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    saveAs(blob, filename);
  }

  async exportExcelForCenter(programId: number, centerId: number) {
    const response = await firstValueFrom(
      this.http.post(
        `${environment.api_url}/porb/excel/${programId}/center`,
        { center_id: centerId },
        {
          responseType: "blob",
          observe: "response",
        }
      )
    );

    const blob = response.body as Blob;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "PORB.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    saveAs(blob, filename);
  }

  getAnaplanConsolidated(programId: number, centerId?: number) {
    let params = new HttpParams().set("program_id", String(programId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    return this.http.get<any>(`${environment.api_url}/porb/anaplan-consolidated`, { params });
  }

  getW3Consolidated(programId: number) {
    const params = new HttpParams().set("program_id", String(programId));
    return this.http.get<any>(`${environment.api_url}/porb/w3-consolidated`, { params });
  }

  getCountryPercentageConsolidated(programId: number, centerId?: number) {
    let params = new HttpParams().set("program_id", String(programId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    return this.http.get<any>(`${environment.api_url}/porb/country-percentage-consolidated`, { params });
  }

  async exportAnaplanExcel(programId: number) {
    const response = await firstValueFrom(
      this.http.get(`${environment.api_url}/porb/excel/${programId}/anaplan`, {
        responseType: "blob",
        observe: "response",
      })
    );

    const blob = response.body as Blob;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "PORB_Anaplan.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    saveAs(blob, filename);
  }

  async exportAnaplanExcelForCenter(programId: number, centerId: string) {
    const response = await firstValueFrom(
      this.http.post(
        `${environment.api_url}/porb/excel/${programId}/center-anaplan`,
        { center_id: centerId },
        {
          responseType: "blob",
          observe: "response",
        }
      )
    );

    const blob = response.body as Blob;
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "PORB_Anaplan.xlsx";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    saveAs(blob, filename);
  }

  async getCountryPercentage(
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    return this.getByFilter("country-percentage", programId, porbAowId, centerId);
  }

  async updateCountryPercentage(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    country_name: string;
    percentage?: number | null;
  }) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/country-percentage`, data)
        .pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async getLocationBenefit(programId: number, porbAowId?: number, centerId?: number) {
    let params = new HttpParams().set("program_id", String(programId));
    if (porbAowId != null) params = params.set("porb_aow_id", String(porbAowId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    return firstValueFrom(
      this.http.get(`${environment.api_url}/porb/location-benefit`, { params }).pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async updateLocationBenefit(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    location_name: string;
    location_type: string;
    percentage?: number | null;
  }) {
    return firstValueFrom(
      this.http
        .patch(`${environment.api_url}/porb/location-benefit`, data)
        .pipe(map((d: any) => d))
    ).catch(() => false);
  }

  async addManualLocation(data: {
    program_id: number;
    porb_aow_id: number;
    center_id: number;
    location_name: string;
    location_type: string;
  }) {
    return firstValueFrom(
      this.http.post<any>(`${environment.api_url}/porb/location-benefit`, data).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async deleteManualLocation(id: number) {
    return firstValueFrom(
      this.http.delete(`${environment.api_url}/porb/location-benefit/${id}`).pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async searchLocations(query: string, type?: string) {
    let params = new HttpParams().set("q", query);
    if (type) params = params.set("type", type);
    return firstValueFrom(
      this.http.get<any[]>(`${environment.api_url}/porb/location-benefit/search`, { params }).pipe(map((d: any) => d))
    ).catch(() => []);
  }

  getLocationBenefitConsolidated(programId: number, centerId?: number) {
    let params = new HttpParams().set("program_id", String(programId));
    if (centerId != null) params = params.set("center_id", String(centerId));
    return this.http.get<any>(`${environment.api_url}/porb/location-benefit-consolidated`, { params });
  }

  private async getByFilter(
    section: "hlo" | "partner" | "bilateral" | "melia" | "anaplan" | "cross" | "consolidation" | "validation" | "validation-summary" | "country-percentage",
    programId: number,
    porbAowId?: number,
    centerId?: number
  ) {
    let params = new HttpParams().set("program_id", String(programId));
    if (porbAowId != null) {
      params = params.set("porb_aow_id", String(porbAowId));
    }
    if (centerId != null) {
      params = params.set("center_id", String(centerId));
    }

    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/${section}`, { params })
        .pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async clearAllPorbData(programId?: number | null): Promise<any> {
    let params = new HttpParams();
    if (programId) {
      params = params.set('program_id', String(programId));
    }
    return firstValueFrom(
      this.http
        .delete(`${environment.api_url}/porb/clear-all-data`, { params })
        .pipe(map((d: any) => d))
    );
  }

  async resetAllToDraft(): Promise<any> {
    return firstValueFrom(
      this.http
        .post(`${environment.api_url}/porb/reset-all-to-draft`, {})
        .pipe(map((d: any) => d))
    );
  }

  async backfillHloOutputId(programId: number): Promise<any> {
    return firstValueFrom(
      this.http
        .post(
          `${environment.api_url}/porb/backfill-hlo-output-id/${programId}`,
          {},
        )
        .pipe(map((d: any) => d))
    );
  }

  async backfillHloOutputIdAll(): Promise<any> {
    return firstValueFrom(
      this.http
        .post(
          `${environment.api_url}/porb/backfill-hlo-output-id-all`,
          {},
        )
        .pipe(map((d: any) => d))
    );
  }

  async clearEmails(): Promise<any> {
    return firstValueFrom(
      this.http
        .delete(`${environment.api_url}/porb/clear-emails`)
        .pipe(map((d: any) => d))
    );
  }

  async clearHistory(): Promise<any> {
    return firstValueFrom(
      this.http
        .delete(`${environment.api_url}/porb/clear-history`)
        .pipe(map((d: any) => d))
    );
  }

  async getExportList(phaseId?: number, status?: string): Promise<any> {
    let params = new HttpParams();
    if (phaseId) params = params.set('phase_id', String(phaseId));
    if (status) params = params.set('status', status);
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/export-list`, { params })
        .pipe(map((d: any) => d))
    ).catch(() => []);
  }

  async exportBulkZip(programIds: number[]): Promise<any> {
    return firstValueFrom(
      this.http.post(`${environment.api_url}/porb/export-bulk`, { program_ids: programIds }, {
        observe: 'response',
        responseType: 'blob',
        headers: new HttpHeaders({ skipLoading: 'true' }),
      })
    );
  }

  async getTocLastUpdates(): Promise<any> {
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/toc-last-updates`)
        .pipe(map((d: any) => d))
    );
  }

  async getTocAutoSync(): Promise<{ enabled: boolean }> {
    return firstValueFrom(
      this.http
        .get<{ enabled: boolean }>(`${environment.api_url}/porb/toc-auto-sync`)
    );
  }

  async setTocAutoSync(enabled: boolean): Promise<{ enabled: boolean }> {
    return firstValueFrom(
      this.http
        .patch<{ enabled: boolean }>(`${environment.api_url}/porb/toc-auto-sync`, { enabled })
    );
  }

  async bulkImportToc(programIds: number[]): Promise<any> {
    return firstValueFrom(
      this.http
        .post(`${environment.api_url}/porb/bulk-import-toc`, { program_ids: programIds })
        .pipe(map((d: any) => d))
    );
  }

  async getSubmissionVersion(submissionId: number): Promise<any> {
    return firstValueFrom(
      this.http
        .get(`${environment.api_url}/porb/version/${submissionId}`)
        .pipe(map((d: any) => d))
    ).catch(() => null);
  }

  async exportVersionZip(submissionId: number): Promise<any> {
    return firstValueFrom(
      this.http.get(`${environment.api_url}/porb/version/${submissionId}/zip`, {
        responseType: 'blob',
        observe: 'response',
      })
    ).catch(() => null);
  }
}
