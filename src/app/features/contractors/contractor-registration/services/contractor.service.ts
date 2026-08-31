import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SunatContributorDTO } from '../../shared/sunatCompany.model';
import { ReniecPersonDTO } from '../../shared/reniecPerson.model';
import { ContractorPersonTypeDTO } from '../../shared/contractorPersonType.model';
import { ApiMessageDTO } from '../../../../core/dtos/api/ApiMessage.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ContractorService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/contractorRegistration`;

  constructor(private http: HttpClient) {}

  /**
   * Header Authorization SOLO si hay sesión activa. El contratista externo (ruta
   * pública) no tiene token → no se manda header → el backend lo ve como anónimo y
   * exige el logo. El personal del sistema (ruta interna) sí tiene token → el backend
   * lee su userId y exime el logo. El endpoint es [AllowAnonymous] de facto (sin
   * [Authorize]), así que mandar/no mandar el header nunca lo rechaza.
   */
  private authHeaders(): { headers: HttpHeaders } | {} {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  getPersonTypes(): Observable<ContractorPersonTypeDTO[]> {
    return this.http.get<ContractorPersonTypeDTO[]>(`${this.apiUrl}/person-types`);
  }

  getCompanyBySunat(ruc: string): Observable<SunatContributorDTO> {
    return this.http.get<SunatContributorDTO>(`${this.apiUrl}/ruc/${ruc}`);
  }

  /** Verifica si el RUC ya está registrado como contratista (para ofrecer solicitud de actualización). */
  checkRucExists(
    ruc: string,
  ): Observable<{ exists: boolean; contributorName: string | null; activeContractorStateId: number | null }> {
    return this.http.get<{ exists: boolean; contributorName: string | null; activeContractorStateId: number | null }>(
      `${this.apiUrl}/ruc-exists/${ruc}`,
    );
  }

  getPersonByDni(dni: string): Observable<ReniecPersonDTO> {
    return this.http.get<ReniecPersonDTO>(`${this.apiUrl}/dni/${dni}`);
  }

  register(formData: FormData): Observable<ApiMessageDTO> {
    return this.http.post<ApiMessageDTO>(`${this.apiUrl}`, formData, this.authHeaders());
  }
}
