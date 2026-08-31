import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, debounceTime, forkJoin, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { BandejaService } from '../../services/bandeja.service';
import { InduccionService } from '../../services/induccion.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { BandejaAprobarDto, BandejaItemDto } from '../../dtos/bandeja.model';
import { environment } from '../../../../../environments/environment';
import { InduccionListDto } from '../../dtos/induccion.model';
import { buildHabHeaders } from '../../services/http-base';
import { CatalogosHabService } from '../../services/catalogos-hab.service';
import { AreaArbolNodoDto } from '../../dtos/catalogos.model';
import { getGerencias, getHijos } from '../../../../shared/utils/area-arbol.util';

interface InduccionGrupo {
  key: string;
  proyectoId: number;
  proyectoNombre: string;
  empresaId: number;
  empresaNombre: string;
  fechaProgramada: string;
  trabajoAltura: boolean;
  equipoElectrico: boolean;
  items: InduccionListDto[];
  seleccionados: Set<number>;
}

@Component({
  selector: 'app-hab-bandeja',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator],
  templateUrl: './bandeja.html',
  styleUrl: './bandeja.css',
})
export class Bandeja implements OnInit, OnDestroy {
  readonly pageSize = 20;

  items: BandejaItemDto[] = [];
  loading = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroTipo = '';
  filtroResponsable = '';
  filtroTexto = '';
  filtroEmpresa = '';
  filtroProyectoId: number | null = null;
  filtroEntregable = '';
  areaArbolNodos: AreaArbolNodoDto[] = [];
  gerenciaOptions: AreaArbolNodoDto[] = [];
  areaScopeOptions: AreaArbolNodoDto[] = [];
  filtroGerenciaId: number | null = null;
  filtroAreaScopeId: number | null = null;

  get filtroAreaEfectivo(): number | null {
    return this.filtroAreaScopeId ?? this.filtroGerenciaId;
  }

  // ── Selección masiva ──────────────────────────────────────
  selectedIds = new Set<number>();

  // ── Panel derecho ─────────────────────────────────────────
  selectedItem: BandejaItemDto | null = null;
  docSafeUrl: SafeResourceUrl | null = null;
  loadingDoc = false;
  vigenciaEditable: string = '';
  estadoEditable: string = '';
  archivoSeleccionadoIdx: number = 0;
  mesSeleccionadoBandeja: any = null;
  private docBlobUrl = '';

  // ── Inducciones agrupadas ─────────────────────────────────
  induccionGrupos: InduccionGrupo[] = [];
  loadingInducciones = false;

  private filterChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  catalogoProyectos: { id: number; nombre: string }[] = [];
  empresasList: string[] = [];

  get empresasDisponibles(): string[] { return this.empresasList; }

  get entregablesDisponibles(): string[] {
    const names = new Set<string>();
    for (const item of this.items) {
      if (item.nombreEntregable) names.add(item.nombreEntregable);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }

  get filteredItems(): BandejaItemDto[] {
    const empresa = this.filtroEmpresa.trim().toLowerCase();
    let result = this.items;
    if (empresa) {
      result = result.filter((i) => i.empresaNombre?.toLowerCase().includes(empresa));
    }
    if (this.filtroEntregable) {
      result = result.filter((i) => i.nombreEntregable === this.filtroEntregable);
    }
    return result.slice().sort((a, b) =>
      (a.entidadNombre ?? '').localeCompare(b.entidadNombre ?? '', 'es'),
    );
  }

  /**
   * El proyecto es el encabezado visual y las tarjetas de siempre (una por empresa+fecha, ver
   * groupInducciones) quedan anidadas adentro — no se pierde la distinción entre sesiones de
   * inducción de empresas distintas.
   */
  get induccionGruposPorProyecto(): { proyectoId: number; proyectoNombre: string; grupos: InduccionGrupo[] }[] {
    const map = new Map<number, { proyectoId: number; proyectoNombre: string; grupos: InduccionGrupo[] }>();
    for (const grupo of this.induccionGrupos) {
      if (!map.has(grupo.proyectoId)) {
        map.set(grupo.proyectoId, { proyectoId: grupo.proyectoId, proyectoNombre: grupo.proyectoNombre, grupos: [] });
      }
      map.get(grupo.proyectoId)!.grupos.push(grupo);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.proyectoNombre.localeCompare(b.proyectoNombre, 'es'),
    );
  }

  get allItemsSelected(): boolean {
    const fi = this.filteredItems;
    return fi.length > 0 && fi.every((i) => this.selectedIds.has(i.id));
  }

  get someItemsSelected(): boolean {
    return this.filteredItems.some((i) => this.selectedIds.has(i.id));
  }

  get puedeAprobarItemActual(): boolean {
    if (!this.selectedItem) return false;
    const resp = (this.selectedItem as any).responsable?.toUpperCase?.() ?? '';
    if (resp === 'SSOMA')
      return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    if (resp === 'ADMINISTRACION')
      return this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
           this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
           this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
  }

  constructor(
    private bandejaService: BandejaService,
    private induccionService: InduccionService,
    private sharepointService: SharepointUploadService,
    private sanitizer: DomSanitizer,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private catalogosHabService: CatalogosHabService,
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.querySelector('app-header')?.classList.add('hidden-bandeja');
    }
    this.filterChange$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.loadItems(1));
    this.loadItems(1);
    this.bandejaService.getEmpresasDisponibles().subscribe({
      next: (list) => {
        console.log('empresas:', list);
        this.empresasList = list;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('error empresas:', err),
    });
    this.http.get<{ id: number; nombre: string }[]>(`${environment.apiUrl}api/v1/habilitacion/bandeja/proyectos`, { headers: buildHabHeaders() }).subscribe({
      next: (res) => { this.catalogoProyectos = res; this.cdr.detectChanges(); },
      error: (err) => console.error('error proyectos bandeja:', err),
    });
    this.catalogosHabService.getAreaArbol().subscribe({
      next: (list) => {
        this.areaArbolNodos = list ?? [];
        this.gerenciaOptions = getGerencias(this.areaArbolNodos);
        this.cdr.detectChanges();
      },
      error: () => { this.areaArbolNodos = []; this.gerenciaOptions = []; },
    });
  }

  onGerenciaChange(id: number | null): void {
    this.filtroGerenciaId = id;
    this.filtroAreaScopeId = null;
    this.areaScopeOptions = id ? getHijos(this.areaArbolNodos, id) : [];
    this.loadItems(1);
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.querySelector('app-header')?.classList.remove('hidden-bandeja');
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeDocBlobUrl();
  }

  // ── Lista estándar ────────────────────────────────────────

  loadItems(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      tipo: this.filtroTipo || undefined,
      responsable: this.filtroResponsable || undefined,
      search: this.filtroTexto.trim() || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      areaScopeId: this.filtroAreaEfectivo ?? undefined,
    };
    this.bandejaService.getPendientes(params).subscribe({
      next: (res) => {
        this.items = res.data ?? [];
        this.selectedIds.clear();
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
        if (this.selectedItem) {
          const refreshed = this.items.find((i) => i.id === this.selectedItem?.id);
          if (!refreshed) this.clearDocPanel();
        }
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  setTipo(tipo: string): void {
    this.filtroTipo = tipo;
    if (tipo === 'INDUCCION') {
      this.loadInducciones();
    } else {
      this.loadItems(1);
    }
  }

  onFilter(): void {
    this.filterChange$.next();
  }

  onPageChange(page: number): void {
    this.loadItems(page);
  }

  // ── Inducciones agrupadas ─────────────────────────────────

  loadInducciones(): void {
    this.loadingInducciones = true;
    this.loaderService.show();
    this.induccionService.getList({ estado: 'PROGRAMADA' }).subscribe({
      next: (items) => {
        this.induccionGrupos = this.groupInducciones(items);
        this.loadingInducciones = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingInducciones = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private groupInducciones(items: InduccionListDto[]): InduccionGrupo[] {
    const map = new Map<string, InduccionGrupo>();
    for (const item of items) {
      const key = `${item.proyectoId}-${item.empresaId}-${item.fechaProgramada.substring(0, 10)}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          proyectoId: item.proyectoId,
          proyectoNombre: item.proyectoNombre,
          empresaId: item.empresaId,
          empresaNombre: item.empresaNombre,
          fechaProgramada: item.fechaProgramada,
          trabajoAltura: item.trabajoAltura,
          equipoElectrico: item.equipoElectrico,
          items: [],
          seleccionados: new Set<number>(),
        });
      }
      const grupo = map.get(key)!;
      grupo.items.push(item);
      if (item.ingresoConfirmado) grupo.seleccionados.add(item.id);
    }
    return Array.from(map.values());
  }

  nAsistieron(grupo: InduccionGrupo): number {
    return grupo.items.filter((i) => i.ingresoConfirmado).length;
  }

  allInduccionSelected(grupo: InduccionGrupo): boolean {
    const asistentes = grupo.items.filter((i) => i.ingresoConfirmado);
    return asistentes.length > 0 && asistentes.every((i) => grupo.seleccionados.has(i.id));
  }

  toggleWorker(grupo: InduccionGrupo, item: InduccionListDto): void {
    if (!item.ingresoConfirmado) return;
    if (grupo.seleccionados.has(item.id)) {
      grupo.seleccionados.delete(item.id);
    } else {
      grupo.seleccionados.add(item.id);
    }
    this.cdr.detectChanges();
  }

  toggleSelectAll(grupo: InduccionGrupo, checked: boolean): void {
    grupo.seleccionados.clear();
    if (checked) {
      grupo.items.filter((i) => i.ingresoConfirmado).forEach((i) => grupo.seleccionados.add(i.id));
    }
    this.cdr.detectChanges();
  }

  aprobarGrupo(grupo: InduccionGrupo): void {
    if (grupo.seleccionados.size === 0) return;
    const ids = Array.from(grupo.seleccionados);
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${ids.length} inducción(es)?`,
      html: `<div style="text-align:left;font-size:0.9rem">
              <strong>${grupo.proyectoNombre}</strong><br/>
              <span style="color:#6b7280">${grupo.empresaNombre} · ${grupo.fechaProgramada.substring(0, 10)}</span>
            </div>`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.induccionService.aprobarBatch(ids).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Aprobados', timer: 1500, showConfirmButton: false });
          this.loadInducciones();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  rechazarGrupo(grupo: InduccionGrupo): void {
    const asistentes = grupo.items.filter((i) => i.ingresoConfirmado && grupo.seleccionados.has(i.id));
    if (asistentes.length === 0) return;
    const ids = asistentes.map((i) => i.id);
    Swal.fire({
      icon: 'warning',
      title: `¿Rechazar ${ids.length} inducción(es)?`,
      html: `<div style="text-align:left;font-size:0.9rem">
              <strong>${grupo.proyectoNombre}</strong><br/>
              <span style="color:#6b7280">${grupo.empresaNombre} · ${grupo.fechaProgramada.substring(0, 10)}</span><br/>
              <span style="color:#6b7280">El trabajador quedará libre para volver a programarse.</span>
            </div>`,
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      forkJoin(ids.map((id) => this.induccionService.rechazar(id))).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Rechazados', timer: 1500, showConfirmButton: false });
          this.loadInducciones();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  // ── Selección masiva ──────────────────────────────────────

  toggleSelect(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.cdr.detectChanges();
  }

  toggleAllItems(): void {
    if (this.allItemsSelected) {
      this.filteredItems.forEach((i) => this.selectedIds.delete(i.id));
    } else {
      this.filteredItems.forEach((i) => this.selectedIds.add(i.id));
    }
    this.cdr.detectChanges();
  }

  aprobarMasivo(): void {
    const ids = Array.from(this.selectedIds);
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${ids.length} documento(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();

      if (this.filtroTipo !== '') {
        this.bandejaService.bulkAprobar(ids, this.filtroTipo).subscribe({
          next: () => this.onBulkSuccess(),
          error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
        });
      } else {
        const byTipo = new Map<string, number[]>();
        this.filteredItems
          .filter((i) => this.selectedIds.has(i.id))
          .forEach((i) => {
            const existing = byTipo.get(i.tipo) ?? [];
            existing.push(i.id);
            byTipo.set(i.tipo, existing);
          });
        forkJoin(
          Array.from(byTipo.entries()).map(([tipo, tIds]) =>
            this.bandejaService.bulkAprobar(tIds, tipo),
          ),
        ).subscribe({
          next: () => this.onBulkSuccess(),
          error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
        });
      }
    });
  }

  private onBulkSuccess(): void {
    this.loaderService.hide();
    this.selectedIds.clear();
    Swal.fire({ icon: 'success', title: 'Aprobados', timer: 1500, showConfirmButton: false });
    this.loadItems(this.currentPage);
  }

  // ── Selección y visor PDF ─────────────────────────────────

  selectItem(item: BandejaItemDto): void {
    if (this.selectedItem?.id === item.id) return;
    this.clearDocPanel();
    this.selectedItem = item;
    this.archivoSeleccionadoIdx = 0;

    if (item.esMensual && item.meses && item.meses.length > 0) {
      this.mesSeleccionadoBandeja = item.meses[0];
      this.vigenciaEditable = item.meses[0].vigencia
        ? new Date(item.meses[0].vigencia).toISOString().substring(0, 10)
        : this.vigenciaEditable;
      this.estadoEditable = item.estado ?? 'Enviado';
      const url = item.meses[0].archivos?.[0]?.archivoUrl ?? item.archivoUrl;
      this.loadingDoc = !!url;
      if (url) this.loadDocBlob(url);
    } else {
      this.mesSeleccionadoBandeja = null;
      const sentinel = [12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25];
      if (item.itemId && sentinel.includes(item.itemId)) {
        this.vigenciaEditable = '2040-12-31';
      } else {
        this.vigenciaEditable = item.vigencia
          ? new Date(item.vigencia).toISOString().substring(0, 10) : '';
      }
      this.estadoEditable = item.estado ?? 'Enviado';
      const urlInicial = item.archivos?.[0]?.archivoUrl ?? item.archivoUrl;
      this.loadingDoc = !!urlInicial;
      if (urlInicial) this.loadDocBlob(urlInicial);
    }
  }

  seleccionarArchivo(idx: number): void {
    this.archivoSeleccionadoIdx = idx;
    const url = this.mesSeleccionadoBandeja?.archivos?.[idx]?.archivoUrl
      ?? this.selectedItem?.archivos?.[idx]?.archivoUrl;
    if (url) this.loadDocBlob(url);
  }

  seleccionarMesBandeja(mes: any): void {
    this.mesSeleccionadoBandeja = mes;
    this.archivoSeleccionadoIdx = 0;
    const sentinel = [12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    if (this.selectedItem?.itemId && sentinel.includes(this.selectedItem.itemId)) {
      this.vigenciaEditable = '2040-12-31';
    } else {
      const mesSig = mes.mes === 12 ? 1 : mes.mes + 1;
      const anioSig = mes.mes === 12 ? mes.anio + 1 : mes.anio;
      this.vigenciaEditable = `${anioSig}-${String(mesSig).padStart(2, '0')}-27`;
    }
    if (mes.vigencia) {
      this.vigenciaEditable = new Date(mes.vigencia).toISOString().substring(0, 10);
    }
    this.estadoEditable = mes.estado ?? 'Enviado';
    const url = mes.archivos?.[0]?.archivoUrl ?? this.selectedItem?.archivoUrl;
    this.loadingDoc = !!url;
    if (url) this.loadDocBlob(url);
    this.cdr.detectChanges();
  }

  private clearDocPanel(): void {
    this.docSafeUrl = null;
    this.loadingDoc = false;
    this.revokeDocBlobUrl();
  }

  private loadDocBlob(archivoUrl: string): void {
    this.docSafeUrl = null;
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        fetch(res.url)
          .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.blob();
          })
          .then((blob) => {
            this.revokeDocBlobUrl();
            this.docBlobUrl = URL.createObjectURL(blob);
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.docBlobUrl);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          })
          .catch(() => {
            this.docSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.url);
            this.loadingDoc = false;
            this.cdr.detectChanges();
          });
      },
      error: () => {
        this.loadingDoc = false;
        this.cdr.detectChanges();
      },
    });
  }

  private revokeDocBlobUrl(): void {
    if (this.docBlobUrl) {
      URL.revokeObjectURL(this.docBlobUrl);
      this.docBlobUrl = '';
    }
  }

  // ── Helpers visuales ──────────────────────────────────────

  getTipoClass(tipo: string): string {
    switch (tipo) {
      case 'TRABAJADOR': return 'chip-blue';
      case 'EMPRESA':    return 'chip-green';
      case 'EQUIPO':     return 'chip-gray';
      case 'INDUCCION':  return 'chip-orange';
      default:           return 'chip-gray';
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Pendiente':  return 'chip-yellow';
      case 'Aprobado':   return 'chip-green';
      case 'Rechazado':  return 'chip-red';
      case 'Observado':  return 'chip-orange';
      default:           return 'chip-gray';
    }
  }

  // ── Acciones ──────────────────────────────────────────────

  aprobar(item: BandejaItemDto): void {
    if (!this.puedeAprobarItemActual) return;
    if (item.requiereVigencia && !this.vigenciaEditable) {
      Swal.fire({ icon: 'warning', title: 'Fecha de vigencia requerida', text: 'Este documento requiere fecha de vigencia. Ingresa la fecha antes de aprobar.' });
      return;
    }
    const id = (item.esMensual && this.mesSeleccionadoBandeja) ? this.mesSeleccionadoBandeja.id : item.id;
    this.executeAction({ ...item, id }, { estado: 'Aprobado', vigencia: this.vigenciaEditable || undefined }, 'Aprobado');
  }

  rechazar(item: BandejaItemDto): void {
    if (!this.puedeAprobarItemActual) return;
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar documento',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (v) => (!v?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed) return;
      const id = (item.esMensual && this.mesSeleccionadoBandeja) ? this.mesSeleccionadoBandeja.id : item.id;
      this.executeAction({ ...item, id }, { estado: 'Rechazado', motivoRechazo: res.value }, 'Rechazado');
    });
  }

  guardarEstado(item: BandejaItemDto): void {
    if (!this.puedeAprobarItemActual || !this.estadoEditable) return;
    if (this.estadoEditable === 'Rechazado') { this.rechazar(item); return; }
    if (this.estadoEditable === 'Aprobado' && item.requiereVigencia && !this.vigenciaEditable) {
      Swal.fire({ icon: 'warning', title: 'Fecha de vigencia requerida', text: 'Este documento requiere fecha de vigencia. Ingresa la fecha antes de aprobar.' });
      return;
    }
    const id = (item.esMensual && this.mesSeleccionadoBandeja) ? this.mesSeleccionadoBandeja.id : item.id;
    this.executeAction({ ...item, id }, { estado: this.estadoEditable, vigencia: this.vigenciaEditable || undefined }, this.estadoEditable);
  }

  private executeAction(
    item: BandejaItemDto,
    payload: BandejaAprobarDto,
    titleSuccess: string,
  ): void {
    const obs$ =
      item.tipo === 'TRABAJADOR'
        ? this.bandejaService.aprobarTrabajador(item.id, payload)
        : item.tipo === 'EMPRESA'
          ? this.bandejaService.aprobarEmpresa(item.id, payload)
          : this.bandejaService.aprobarEquipo(item.id, payload);

    this.loaderService.show();
    obs$.subscribe({
      next: () => {
        this.loaderService.hide();
        this.selectedItem = null;
        this.clearDocPanel();
        Swal.fire({ icon: 'success', title: titleSuccess, timer: 1500, showConfirmButton: false });
        this.loadItems(this.currentPage);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
