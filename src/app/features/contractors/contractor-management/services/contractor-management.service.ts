import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResponseDTO } from '../../../../core/dtos/api/pagedResponse.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { ContractorManagementDTO } from '../dtos/contractor-management.dto';
import { SunatContributorDTO } from '../../shared/sunatCompany.model';
import { ReniecPersonDTO } from '../../shared/reniecPerson.model';
import { ContractorPersonTypeDTO } from '../../shared/contractorPersonType.model';

@Injectable({
  providedIn: 'root',
})
export class ContractorManagementService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/ContractorManagement`;
  private readonly registrationApiUrl = `${environment.apiUrl}api/v1/contractorRegistration`;

  constructor(private http: HttpClient) {}

  // Consultas RUC (SUNAT) y DNI (RENIEC) reutilizando los endpoints de registro.
  getCompanyBySunat(ruc: string): Observable<SunatContributorDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<SunatContributorDTO>(
      `${this.registrationApiUrl}/ruc/${ruc}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  getPersonTypes(): Observable<ContractorPersonTypeDTO[]> {
    return this.http.get<ContractorPersonTypeDTO[]>(`${this.registrationApiUrl}/person-types`);
  }

  getPersonByDni(dni: string): Observable<ReniecPersonDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.get<ReniecPersonDTO>(
      `${this.registrationApiUrl}/dni/${dni}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  getPaged(
    page: number,
    contributorName?: string,
    contributorRuc?: string,
    contractorStateId?: number | null,
    legalRepresentativeDni?: string,
    legalRepresentativeName?: string,
    legalEntityRegistryNumber?: string,
  ): Observable<PagedResponseDTO<ContractorManagementDTO>> {
    const token = localStorage.getItem('access_token');
    let params = new HttpParams().set('page', page.toString());
    if (contributorName)           params = params.set('contributorName',           contributorName);
    if (contributorRuc)            params = params.set('contributorRuc',            contributorRuc);
    if (contractorStateId)         params = params.set('contractorStateId',         contractorStateId.toString());
    if (legalRepresentativeDni)    params = params.set('legalRepresentativeDni',    legalRepresentativeDni);
    if (legalRepresentativeName)   params = params.set('legalRepresentativeName',   legalRepresentativeName);
    if (legalEntityRegistryNumber) params = params.set('legalEntityRegistryNumber', legalEntityRegistryNumber);
    return this.http.get<PagedResponseDTO<ContractorManagementDTO>>(
      this.apiUrl,
      { params, headers: { Authorization: `Bearer ${token}` } },
    );
  }

  approve(contractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  reject(contractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}/reject`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  approveUpdate(contractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}/update-request/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  rejectUpdate(contractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.patch<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}/update-request/reject`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  sendCredentials(contractorId: number): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.post<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}/send-credentials`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  update(contractorId: number, form: FormData): Observable<ApiMessageDTO> {
    const token = localStorage.getItem('access_token');
    return this.http.put<ApiMessageDTO>(
      `${this.apiUrl}/${contractorId}`,
      form,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }
}
