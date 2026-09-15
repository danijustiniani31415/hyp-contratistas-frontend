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

export interface RolCatalogoItem extends CatalogoItem {
  esGlobal: boolean;
}

export interface AlmacenCatalogoItem extends CatalogoItem {
  proyectoId: number | null;
}

export interface CatalogosPersonas {
  tiposVinculo: CatalogoItem[];
  cargos: CatalogoItem[];
  empresasContratistas: CatalogoItem[];
  roles: RolCatalogoItem[];
  proyectos: CatalogoItem[];
  almacenes: AlmacenCatalogoItem[];
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

export interface VinculoLaboral {
  id: number;
  tipoVinculoNombre: string;
  empresaContratistaNombre: string | null;
  cargoNombre: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  motivoCese: string | null;
}

export interface AsignacionDetalle {
  id: number;
  rolNombre: string;
  esGlobal: boolean;
  proyectoNombre: string | null;
  almacenNombre: string | null;
  fechaInicio: string;
}

export interface PersonaDetalle {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string | null;
  emailPersonal: string | null;
  activo: boolean;
  vinculos: VinculoLaboral[];
  usuarioSistemaId: number | null;
  emailLogin: string | null;
  asignaciones: AsignacionDetalle[];
}

export interface NuevaAsignacion {
  rolId: number;
  proyectoId?: number | null;
  almacenId?: number | null;
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

  getById(id: number): Observable<PersonaDetalle> {
    return this.http.get<PersonaDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  /** Da acceso al sistema — solo pide el correo, la persona activa su cuenta por enlace. */
  crearUsuario(personaId: number, emailLogin: string): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/usuario`, { emailLogin }, { headers: this.headers() });
  }

  nuevaAsignacion(personaId: number, dto: NuevaAsignacion): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/asignaciones`, dto, { headers: this.headers() });
  }

  revocarAsignacion(personaId: number, asignacionId: number): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/asignaciones/${asignacionId}/revocar`, {}, { headers: this.headers() });
  }
}
