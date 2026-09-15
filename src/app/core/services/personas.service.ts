import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LbAuthService } from './lb-auth.service';

export interface PersonaListItem {
  id: number;
  nombreCompleto: string;
  numeroDocumento: string;
  tipoVinculoNombre: string | null;
  cargoNombre: string | null;
  estadoVinculo: string;
  tieneUsuario: boolean;
}

export interface PersonaListResponse {
  data: PersonaListItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
}

export interface CatalogosPersonas {
  tiposVinculo: CatalogoItem[];
  cargos: CatalogoItem[];
  empresasContratistas: CatalogoItem[];
  roles: CatalogoItem[];
  proyectos: CatalogoItem[];
}

export interface PersonaCreate {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  emailPersonal?: string;
  tipoVinculoId: number;
  empresaContratistaId?: number | null;
  cargoId?: number | null;
  fechaInicio: string; // YYYY-MM-DD
}

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/personas`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  list(search: string, page: number, pageSize: number): Observable<PersonaListResponse> {
    const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
    return this.http.get<PersonaListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  create(dto: PersonaCreate): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto, { headers: this.headers() });
  }

  getCatalogos(): Observable<CatalogosPersonas> {
    return this.http.get<CatalogosPersonas>(`${this.apiUrl}/catalogos`, { headers: this.headers() });
  }
}
