import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ImportConsumoResultDto,
  ConsumoCargaResumenDto,
  MaterialPendienteDto,
  RevisionDecisionDto,
  RevisionResultDto,
  BuscarItemDto,
  CrearItemCatalogoDto,
  CrearFamiliaCatalogoDto,
  DriverProyectoDto,
  ActualizarDriversDto,
  ActualizarDriversResultDto,
  GenerarPresupuestoDto,
  ActualizarLineaPresupuestoDto,
  PresupuestoResumenDto,
  PresupuestoDetalleDto,
  AbrirSemanaDto,
  RegistrarConsumoLineaDto,
  ControlSemanaDto,
  DashboardPresupuestoDto,
  FamiliaConRatioDto,
  RatioFamiliaComparacionDto,
  RatioProyectoDto,
  ResumenRatiosDto,
  HitoCriticoDisponibleDto,
  PersonalHitoDto,
  PersonalHitoGuardarDto,
  KitResumenDto,
  KitDetalleDto,
  KitCalculoLineaDto,
  KitCreateDto,
  FamiliaCatalogoDto,
  ActualizarFamiliaDto,
  MaterialPendienteGlobalDto,
  MaterialNoSsomaDto,
  TipoMaterialDto,
  TipoDriverRatio,
  RatioDriverComparacionDto,
  CalcularRatiosDriversResultDto,
  RatiosDriversRecomendadosDto,
  ImportHhResultDto,
  HhCargaResumenDto,
  CalcularRatiosTodosResultDto,
} from './presupuesto.dtos';

@Injectable({ providedIn: 'root' })
export class PresupuestoMaterialesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma/presupuesto-materiales`;

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  importarS10(projectId: number, archivo: File): Observable<ImportConsumoResultDto> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ImportConsumoResultDto>(
      `${this.base}/proyectos/${projectId}/cargas`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  listarCargas(projectId: number): Observable<ConsumoCargaResumenDto[]> {
    return this.http.get<ConsumoCargaResumenDto[]>(
      `${this.base}/proyectos/${projectId}/cargas`,
      { headers: this.authHeaders() },
    );
  }

  estandarizar(cargaId: number): Observable<ImportConsumoResultDto> {
    return this.http.post<ImportConsumoResultDto>(
      `${this.base}/cargas/${cargaId}/estandarizar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  /** Progreso en vivo de una estandarización en curso — para mostrar "línea X de Y" mientras dura. */
  obtenerProgresoEstandarizacion(cargaId: number): Observable<{ enProceso: boolean; procesadas?: number; total?: number }> {
    return this.http.get<{ enProceso: boolean; procesadas?: number; total?: number }>(
      `${this.base}/cargas/${cargaId}/progreso`,
      { headers: this.authHeaders() },
    );
  }

  getPendientes(projectId: number): Observable<MaterialPendienteDto[]> {
    return this.http.get<MaterialPendienteDto[]>(
      `${this.base}/proyectos/${projectId}/revision/pendientes`,
      { headers: this.authHeaders() },
    );
  }

  procesarRevision(
    projectId: number,
    decisiones: RevisionDecisionDto[],
  ): Observable<RevisionResultDto> {
    return this.http.post<RevisionResultDto>(
      `${this.base}/proyectos/${projectId}/revision/procesar`,
      { projectId, decisiones },
      { headers: this.authHeaders() },
    );
  }

  // ── Cargas de Horas Hombre ──────────────────────────────────────────

  importarHh(projectId: number, archivo: File): Observable<ImportHhResultDto> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ImportHhResultDto>(
      `${this.base}/proyectos/${projectId}/hh-cargas`,
      formData,
      { headers: this.authHeaders() },
    );
  }

  listarCargasHh(projectId: number): Observable<HhCargaResumenDto[]> {
    return this.http.get<HhCargaResumenDto[]>(
      `${this.base}/proyectos/${projectId}/hh-cargas`,
      { headers: this.authHeaders() },
    );
  }

  buscarItems(q: string): Observable<BuscarItemDto[]> {
    return this.http.get<BuscarItemDto[]>(`${this.base}/catalogo/items/buscar`, {
      headers: this.authHeaders(),
      params: { q },
    });
  }

  // ── Drivers ───────────────────────────────────────────────────────

  getDrivers(): Observable<DriverProyectoDto[]> {
    return this.http.get<DriverProyectoDto[]>(`${this.base}/ratios/proyectos/drivers`, {
      headers: this.authHeaders(),
    });
  }

  actualizarDrivers(projectId: number, dto: ActualizarDriversDto): Observable<ActualizarDriversResultDto> {
    return this.http.put<ActualizarDriversResultDto>(
      `${this.base}/ratios/proyectos/${projectId}/drivers`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  calcularRatios(projectId: number): Observable<{ ratiosCalculados: number }> {
    return this.http.post<{ ratiosCalculados: number }>(
      `${this.base}/ratios/proyectos/${projectId}/calcular`,
      {},
      { headers: this.authHeaders() },
    );
  }

  /** Calcula ratios de todos los proyectos con consumo SSOMA estandarizado de una sola vez. */
  calcularRatiosTodos(): Observable<CalcularRatiosTodosResultDto> {
    return this.http.post<CalcularRatiosTodosResultDto>(
      `${this.base}/ratios/proyectos/calcular-todos`,
      {},
      { headers: this.authHeaders() },
    );
  }

  listarFamiliasConRatio(): Observable<FamiliaConRatioDto[]> {
    return this.http.get<FamiliaConRatioDto[]>(`${this.base}/ratios/familias`, {
      headers: this.authHeaders(),
    });
  }

  getRatiosPorProyecto(projectId: number): Observable<RatioProyectoDto[]> {
    return this.http.get<RatioProyectoDto[]>(`${this.base}/ratios/proyectos/${projectId}`, {
      headers: this.authHeaders(),
    });
  }

  getResumenRatios(): Observable<ResumenRatiosDto> {
    return this.http.get<ResumenRatiosDto>(`${this.base}/ratios/resumen`, {
      headers: this.authHeaders(),
    });
  }

  getComparacionFamilia(familiaId: number): Observable<RatioFamiliaComparacionDto> {
    return this.http.get<RatioFamiliaComparacionDto>(
      `${this.base}/ratios/familias/${familiaId}/comparacion`,
      { headers: this.authHeaders() },
    );
  }

  actualizarIncluidoManual(
    familiaId: number,
    projectId: number,
    incluir: boolean,
    campo: 'RATIO' | 'PRECIO',
  ): Observable<unknown> {
    return this.http.patch(
      `${this.base}/ratios/familias/${familiaId}/proyectos/${projectId}/incluir`,
      { incluir, campo },
      { headers: this.authHeaders() },
    );
  }

  // ── Ratios de drivers (HH / N Trabajadores por m2) ─────────────────

  calcularRatiosDrivers(): Observable<CalcularRatiosDriversResultDto> {
    return this.http.post<CalcularRatiosDriversResultDto>(
      `${this.base}/ratios/drivers/calcular`,
      {},
      { headers: this.authHeaders() },
    );
  }

  getComparacionDriver(tipo: TipoDriverRatio): Observable<RatioDriverComparacionDto> {
    return this.http.get<RatioDriverComparacionDto>(`${this.base}/ratios/drivers/${tipo}`, {
      headers: this.authHeaders(),
    });
  }

  actualizarIncluidoManualDriver(
    tipo: TipoDriverRatio,
    projectId: number,
    incluir: boolean,
  ): Observable<unknown> {
    return this.http.patch(
      `${this.base}/ratios/drivers/${tipo}/proyectos/${projectId}/incluir`,
      { incluir },
      { headers: this.authHeaders() },
    );
  }

  getRatiosDriversRecomendados(): Observable<RatiosDriversRecomendadosDto> {
    return this.http.get<RatiosDriversRecomendadosDto>(`${this.base}/ratios/drivers/recomendados`, {
      headers: this.authHeaders(),
    });
  }

  // ── Presupuesto ───────────────────────────────────────────────────

  generarPresupuesto(projectId: number, dto: GenerarPresupuestoDto): Observable<PresupuestoDetalleDto> {
    return this.http.post<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/proyectos/${projectId}/generar`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  getPresupuestosPorProyecto(projectId: number): Observable<PresupuestoResumenDto[]> {
    return this.http.get<PresupuestoResumenDto[]>(
      `${this.base}/presupuestos/proyectos/${projectId}`,
      { headers: this.authHeaders() },
    );
  }

  getPresupuestoDetalle(presupuestoId: number): Observable<PresupuestoDetalleDto> {
    return this.http.get<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/${presupuestoId}`,
      { headers: this.authHeaders() },
    );
  }

  actualizarLinea(
    presupuestoId: number,
    lineaId: number,
    dto: ActualizarLineaPresupuestoDto,
  ): Observable<PresupuestoDetalleDto> {
    return this.http.put<PresupuestoDetalleDto>(
      `${this.base}/presupuestos/${presupuestoId}/lineas/${lineaId}`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  aprobarPresupuesto(presupuestoId: number): Observable<{ estado: string }> {
    return this.http.post<{ estado: string }>(
      `${this.base}/presupuestos/${presupuestoId}/aprobar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // ── Control semanal ───────────────────────────────────────────────

  abrirSemana(dto: AbrirSemanaDto): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(`${this.base}/control/semanas`, dto, {
      headers: this.authHeaders(),
    });
  }

  registrarConsumo(controlId: number, lineas: RegistrarConsumoLineaDto[]): Observable<ControlSemanaDto> {
    return this.http.put<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/consumo`,
      lineas,
      { headers: this.authHeaders() },
    );
  }

  cerrarSemana(controlId: number): Observable<ControlSemanaDto> {
    return this.http.post<ControlSemanaDto>(
      `${this.base}/control/semanas/${controlId}/cerrar`,
      {},
      { headers: this.authHeaders() },
    );
  }

  getSemanasPorPresupuesto(presupuestoId: number): Observable<ControlSemanaDto[]> {
    return this.http.get<ControlSemanaDto[]>(
      `${this.base}/control/presupuestos/${presupuestoId}/semanas`,
      { headers: this.authHeaders() },
    );
  }

  getDashboard(presupuestoId: number): Observable<DashboardPresupuestoDto> {
    return this.http.get<DashboardPresupuestoDto>(
      `${this.base}/control/presupuestos/${presupuestoId}/dashboard`,
      { headers: this.authHeaders() },
    );
  }

  // ── Dotación de personal por hito crítico ─────────────────────────

  getHitosCriticosDisponibles(projectId: number): Observable<HitoCriticoDisponibleDto[]> {
    return this.http.get<HitoCriticoDisponibleDto[]>(
      `${this.base}/proyectos/${projectId}/personal-hitos/disponibles`,
      { headers: this.authHeaders() },
    );
  }

  getPersonalHitos(projectId: number): Observable<PersonalHitoDto[]> {
    return this.http.get<PersonalHitoDto[]>(
      `${this.base}/proyectos/${projectId}/personal-hitos`,
      { headers: this.authHeaders() },
    );
  }

  guardarPersonalHitos(projectId: number, dto: PersonalHitoGuardarDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.base}/proyectos/${projectId}/personal-hitos`,
      dto,
      { headers: this.authHeaders() },
    );
  }

  /** Reparte cada línea de consumo del proyecto entre los hitos críticos de su cronograma vigente. */
  asignarHitos(projectId: number): Observable<{ lineasActualizadas: number }> {
    return this.http.post<{ lineasActualizadas: number }>(
      `${this.base}/proyectos/${projectId}/asignar-hitos`,
      {},
      { headers: this.authHeaders() },
    );
  }

  // ── Kits / BOM ─────────────────────────────────────────────────────

  listarKits(tipoId?: number): Observable<KitResumenDto[]> {
    return this.http.get<KitResumenDto[]>(`${this.base}/kits`, {
      headers: this.authHeaders(),
      params: tipoId ? { tipoId } : {},
    });
  }

  getKit(kitId: number): Observable<KitDetalleDto> {
    return this.http.get<KitDetalleDto>(`${this.base}/kits/${kitId}`, {
      headers: this.authHeaders(),
    });
  }

  calcularKit(kitId: number, cantidadKits: number): Observable<KitCalculoLineaDto[]> {
    return this.http.get<KitCalculoLineaDto[]>(`${this.base}/kits/${kitId}/calcular`, {
      headers: this.authHeaders(),
      params: { cantidadKits },
    });
  }

  crearKit(dto: KitCreateDto): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/kits`, dto, {
      headers: this.authHeaders(),
    });
  }

  // ── Catálogo de Materiales ─────────────────────────────────────────

  listarTiposCatalogo(): Observable<TipoMaterialDto[]> {
    return this.http.get<TipoMaterialDto[]>(`${this.base}/catalogo/tipos`, {
      headers: this.authHeaders(),
    });
  }

  listarFamiliasCatalogo(q?: string, tipoId?: number, perteneceSsoma?: boolean): Observable<FamiliaCatalogoDto[]> {
    const params: Record<string, string | number | boolean> = {};
    if (q) params['q'] = q;
    if (tipoId != null) params['tipoId'] = tipoId;
    if (perteneceSsoma != null) params['perteneceSsoma'] = perteneceSsoma;
    return this.http.get<FamiliaCatalogoDto[]>(`${this.base}/catalogo/familias`, {
      headers: this.authHeaders(),
      params,
    });
  }

  actualizarFamiliaCatalogo(id: number, dto: ActualizarFamiliaDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/catalogo/familias/${id}`, dto, {
      headers: this.authHeaders(),
    });
  }

  crearItemCatalogo(dto: CrearItemCatalogoDto): Observable<BuscarItemDto> {
    return this.http.post<BuscarItemDto>(`${this.base}/catalogo/items`, dto, {
      headers: this.authHeaders(),
    });
  }

  crearFamiliaCatalogo(dto: CrearFamiliaCatalogoDto): Observable<FamiliaCatalogoDto> {
    return this.http.post<FamiliaCatalogoDto>(`${this.base}/catalogo/familias`, dto, {
      headers: this.authHeaders(),
    });
  }

  obtenerSinEstandarizarGlobal(): Observable<MaterialPendienteGlobalDto[]> {
    return this.http.get<MaterialPendienteGlobalDto[]>(`${this.base}/catalogo/sin-estandarizar`, {
      headers: this.authHeaders(),
    });
  }

  procesarSinEstandarizarGlobal(decisiones: RevisionDecisionDto[]): Observable<RevisionResultDto> {
    return this.http.post<RevisionResultDto>(`${this.base}/catalogo/sin-estandarizar/procesar`, decisiones, {
      headers: this.authHeaders(),
    });
  }

  obtenerNoSsoma(): Observable<MaterialNoSsomaDto[]> {
    return this.http.get<MaterialNoSsomaDto[]>(`${this.base}/catalogo/no-ssoma`, {
      headers: this.authHeaders(),
    });
  }
}
