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

export interface ReniecPersona {
  nombres: string;
  apellidos: string;
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

export interface TipoVinculoCatalogoItem extends CatalogoItem {
  codigo: string;
}

export interface CatalogosPersonas {
  tiposVinculo: TipoVinculoCatalogoItem[];
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
  proyectoId?: number | null;
  fechaInicio: string; // YYYY-MM-DD

  planilla?: PersonaPlanilla;
}

/** Fase 1 del motor de Planillas — todo opcional, se completa cuando se tenga la info. */
export interface PersonaPlanilla {
  /** Correlativo autogenerado (H&P-E001...) — nunca se envía, solo se muestra. */
  codigoTrabajador?: string | null;
  banco?: string | null;
  numeroCuenta?: string | null;
  cusp?: string | null;
  tipoAfpOnp?: string | null;
  categoriaLaboral?: string | null; // OBRERO | EMPLEADO
  sueldoBase?: number | null;
  jornal?: number | null;
  asignacionFamiliar: boolean;
  sctr: boolean;
}

export interface CargoDetalle {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface CargoCreate {
  nombre: string;
}

export interface CargoUpdate {
  nombre: string;
  activo: boolean;
}

export interface VinculoLaboral {
  id: number;
  tipoVinculoNombre: string;
  empresaContratistaNombre: string | null;
  cargoNombre: string | null;
  proyectoNombre: string | null;
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
  planilla: PersonaPlanilla | null;
  vinculos: VinculoLaboral[];
  usuarioSistemaId: number | null;
  emailLogin: string | null;
  asignaciones: AsignacionDetalle[];
}

export interface PersonaUpdate {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string | null;
  emailPersonal?: string | null;
}

export interface NuevaAsignacion {
  rolId: number;
  proyectoId?: number | null;
  almacenId?: number | null;
}

export interface PersonaDatoFaltante {
  personaId: number;
  nombreCompleto: string;
  cargoNombre: string | null;
  proyectoNombre: string | null;
  camposFaltantes: string[];
}

export interface DashboardPlanilla {
  totalPersonasActivas: number;
  totalConDatosCompletos: number;
  totalConDatosFaltantes: number;
  faltantes: PersonaDatoFaltante[];
}

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/personas`;

  constructor(private http: HttpClient, private authService: LbAuthService) {}

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  list(
    search: string,
    page: number,
    pageSize: number,
    filters?: { cargoId?: number | null; tipoVinculoId?: number | null; estado?: string | null },
  ): Observable<PersonaListResponse> {
    const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) });
    if (filters?.cargoId) params.set('cargoId', String(filters.cargoId));
    if (filters?.tipoVinculoId) params.set('tipoVinculoId', String(filters.tipoVinculoId));
    if (filters?.estado) params.set('estado', filters.estado);
    return this.http.get<PersonaListResponse>(`${this.apiUrl}?${params}`, { headers: this.headers() });
  }

  create(dto: PersonaCreate): Observable<any> {
    return this.http.post(`${this.apiUrl}`, dto, { headers: this.headers() });
  }

  actualizarDatos(personaId: number, dto: PersonaUpdate): Observable<PersonaDetalle> {
    return this.http.put<PersonaDetalle>(`${this.apiUrl}/${personaId}`, dto, { headers: this.headers() });
  }

  buscarPorDni(dni: string): Observable<ReniecPersona> {
    return this.http.get<ReniecPersona>(`${this.apiUrl}/reniec/${dni}`, { headers: this.headers() });
  }

  listCargos(): Observable<CargoDetalle[]> {
    return this.http.get<CargoDetalle[]>(`${this.apiUrl}/cargos`, { headers: this.headers() });
  }

  crearCargo(dto: CargoCreate): Observable<CargoDetalle> {
    return this.http.post<CargoDetalle>(`${this.apiUrl}/cargos`, dto, { headers: this.headers() });
  }

  actualizarCargo(id: number, dto: CargoUpdate): Observable<CargoDetalle> {
    return this.http.put<CargoDetalle>(`${this.apiUrl}/cargos/${id}`, dto, { headers: this.headers() });
  }

  actualizarPlanilla(personaId: number, dto: PersonaPlanilla): Observable<PersonaDetalle> {
    return this.http.put<PersonaDetalle>(`${this.apiUrl}/${personaId}/planilla`, dto, { headers: this.headers() });
  }

  getCatalogos(): Observable<CatalogosPersonas> {
    return this.http.get<CatalogosPersonas>(`${this.apiUrl}/catalogos`, { headers: this.headers() });
  }

  getDashboardPlanilla(): Observable<DashboardPlanilla> {
    return this.http.get<DashboardPlanilla>(`${this.apiUrl}/dashboard-planilla`, { headers: this.headers() });
  }

  getById(id: number): Observable<PersonaDetalle> {
    return this.http.get<PersonaDetalle>(`${this.apiUrl}/${id}`, { headers: this.headers() });
  }

  /** Da acceso al sistema — solo pide el correo, la persona activa su cuenta por enlace. */
  crearUsuario(personaId: number, emailLogin: string): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/usuario`, { emailLogin }, { headers: this.headers() });
  }

  /** Cambia el correo de login de un usuario ya activo; avisa por correo a la dirección anterior. */
  cambiarEmail(personaId: number, nuevoEmail: string): Observable<PersonaDetalle> {
    return this.http.put<PersonaDetalle>(`${this.apiUrl}/${personaId}/usuario/email`, { nuevoEmail }, { headers: this.headers() });
  }

  nuevaAsignacion(personaId: number, dto: NuevaAsignacion): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/asignaciones`, dto, { headers: this.headers() });
  }

  revocarAsignacion(personaId: number, asignacionId: number): Observable<PersonaDetalle> {
    return this.http.post<PersonaDetalle>(`${this.apiUrl}/${personaId}/asignaciones/${asignacionId}/revocar`, {}, { headers: this.headers() });
  }
}
