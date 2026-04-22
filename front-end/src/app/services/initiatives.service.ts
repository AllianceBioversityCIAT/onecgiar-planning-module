import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { saveAs } from "file-saver";
import { Observable, firstValueFrom, map } from "rxjs";
import { environment } from "src/environments/environment";

export interface BudgetMatrixCenter {
  code: string;
  acronym: string;
  name: string;
  kind: 'center' | 'so' | 'unknown';
}

export interface BudgetMatrixProgram {
  id: number;
  official_code: string;
  name: string;
}

export interface BudgetMatrixAowRow {
  aow_id: number;
  aow_name: string;
  aow_acrnum: string;
  cells: Record<string, number>;
  subtotal: number;
}

export interface UnknownBreakdownRow {
  aowLeads: number;
  pmuCosts: number;
  consultants: number;
  discretionary: number;
  research: number;
  travel: number;
  total: number;
}

export interface MatrixResponse {
  centers: BudgetMatrixCenter[];
  alliance: { bioversityCode: string | null; ciatCode: string | null };
  programs: BudgetMatrixProgram[];
  byCenter: Record<number, Record<string, number>>;
  byAow: Record<number, BudgetMatrixAowRow[]>;
  bilateral: Record<number, BudgetMatrixAowRow[]>;
  unknownBreakdown: Record<number, UnknownBreakdownRow>;
}

@Injectable({
  providedIn: "root",
})
export class InitiativesService {
  constructor(private http: HttpClient) { }

  async getInitiative(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/initiatives/" + id)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiativeHistory(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/initiatives/" + id + "/history")
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiativeForExport(phase_id: number, status?: string | string[]) {
    const params: Record<string, string | string[]> = {};
    if (status && (Array.isArray(status) ? status.length : true)) {
      params['status'] = status;
    }
    return firstValueFrom(
      this.http
        .get(environment.api_url + "/initiatives/export/" + phase_id, {
          params,
        })
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getInitiatives(filters: any = null, page: any, limit: any) {
    if (filters) {
      let finalFilters: any = {};
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === "string")
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != "")
          finalFilters[element] = filters[element];
      });
      return firstValueFrom(
        this.http
          .get(
            environment.api_url +
            `/initiatives/full?page=${page}&limit=${limit}`,
            { params: finalFilters }
          )
          .pipe(map((d: any) => d))
      );
    } else {
      return firstValueFrom(
        this.http
          .get(
            environment.api_url +
            `/initiatives/full?page=${page}&limit=${limit}`
          )
          .pipe(map((d: any) => d))
      );
    }
  }

  async exportInitiativesForTrackPORBs() {
    const data = await firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/track`, {
          responseType: "blob",
        })
        .pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Initiatives.xlsx')
  }

  async exportExcel(filters: any = null) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === "string")
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != "")
          finalFilters[element] = filters[element];
      });
    const data = await firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/budgetSummary/excel`, {
          responseType: "blob",
          params: finalFilters
        })
        .pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Budget-Summary.xlsx')
  }

  async exportBudgetSummaryBulk(programIds: number[], status: string, phaseId?: number): Promise<any> {
    const body: Record<string, any> = { program_ids: programIds, status };
    if (phaseId != null) body['phase_id'] = phaseId;
    return firstValueFrom(
      this.http.post(environment.api_url + '/initiatives/budgetSummary/excel-bulk', body, {
        observe: 'response',
        responseType: 'blob',
      })
    );
  }

  async exportAnaplanSummary(filters: any = null) {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === "string")
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != "")
          finalFilters[element] = filters[element];
      });
    const data = await firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/anaplanSummary/excel`, {
          responseType: "blob",
          params: finalFilters
        })
        .pipe(map((d: Blob) => d))
    );
    saveAs(data, 'Anaplan-Summary.xlsx')
  }

  async exportAnaplanSummaryBulk(programIds: number[], status: string, phaseId?: number): Promise<any> {
    const body: Record<string, any> = { program_ids: programIds, status };
    if (phaseId != null) body['phase_id'] = phaseId;
    return firstValueFrom(
      this.http.post(environment.api_url + '/initiatives/anaplanSummary/excel-bulk', body, {
        observe: 'response',
        responseType: 'blob',
      })
    );
  }

  async getBudgetMatrix(filters: any = null): Promise<MatrixResponse> {
    let finalFilters: any = {};
    if (filters)
      Object.keys(filters).forEach((element) => {
        if (typeof filters[element] === "string")
          filters[element] = filters[element].trim();

        if (filters[element] != null && filters[element] != "")
          finalFilters[element] = filters[element];
      });
    return firstValueFrom(
      this.http
        .get<MatrixResponse>(environment.api_url + `/initiatives/budgetSummary/matrix`, {
          params: finalFilters
        })
    );
  }


  async getInitiativesOnly() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/getAll`)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }


  async findAllInitiatives() {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives`)
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  async getBudgetsForEachPartner(filters: any = null) {
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
        .get(environment.api_url + `/initiatives/getInitPartnersBudget`, { params: finalFilters })
        .pipe(map((d: any) => d))
    ).catch((e) => false);
  }

  getInitiativeUsers(id: number) {
    return firstValueFrom(
      this.http
        .get(environment.api_url + `/initiatives/${id}/roles`, {})
        .pipe(map((d) => d))
    );
  }

  getInitiativeRoles(initiativeId: number) {
    return this.http
      .get(environment.api_url + "/initiatives/" + initiativeId + "/roles", {})
      .toPromise();
  }

  createNewInitiativeRole(initiativeId: number, role: any): Observable<any> {
    return this.http.post<any>(
      environment.api_url + "/initiatives/" + initiativeId + "/roles",
      role
    );
  }

  updateInitiativeRole(
    initiativeId: number,
    roleId: number,
    role: any
  ): Observable<any> {
    return this.http.put(
      environment.api_url + "/initiatives/" + initiativeId + "/roles/" + roleId,
      role
    );
  }

  deleteInitiativeRole(initiativeId: number, roleId: number) {
    return this.http
      .delete(
        environment.api_url +
        "/initiatives/" +
        initiativeId +
        "/roles/" +
        roleId
      )
      .toPromise();
  }

  isAllowedToAccessChat(id: number) {
    return this.http.get<boolean>(
      environment.api_url + "/initiatives/" + id + "/is-allowed-to-access-chat"
    );
  }

  async getClarisaPrograms() {
    return await firstValueFrom(
      this.http
        .get(environment.api_url + '/initiatives/clarisa-programs')
        .pipe(map((d: any) => d))
    );
  }
  async syncInit(initIds: string[]) {
    return await firstValueFrom(
      this.http
        .post(
          environment.api_url + '/initiatives/sync-clarisa',
          {
            ids: initIds
          }
        )
        .pipe(map((d: any) => d))
    );
  }


  async archiveInit(initIds: string[]) {
    return await firstValueFrom(
      this.http
        .post(
          environment.api_url + '/initiatives/archive',
          {
            ids: initIds
          }
        )
        .pipe(map((d: any) => d))
    );
  }

  getInitiativesWithoutTocData() {
    return firstValueFrom(
      this.http
        .get(
          environment.api_url +
          `/initiatives`
        )
        .pipe(map((d: any) => d))
    );
  }
}
