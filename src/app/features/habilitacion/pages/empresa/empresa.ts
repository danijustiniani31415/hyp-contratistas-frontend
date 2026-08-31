import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { HabEmpresaService } from '../../services/hab-empresa.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';
import { ProyectosEmpresa } from './components/proyectos-empresa/proyectos-empresa';
import { ArchivoStagingDto, DocumentoVersionDto } from '../../dtos/trabajador.model';
import { Observable, EMPTY } from 'rxjs';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import {
  EmpresaContratistaListDto,
  EmpresaEntregableDto,
  EmpresaEntregableUpdateDto,
  EmpresaPorProyectoDto,
  EmpresaSimpleDto,
  EntregableMesDto,
  ProyectoDisponibleDto,
} from '../../dtos/empresa.model';

interface ProgresoProyecto {
  total: number;
  aprobadosEquiv: number;
  rechazados: number;
  entregables: EmpresaEntregableDto[];
}

@Component({
  selector: 'app-hab-empresa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchSelect,
    DocumentViewer,
    VersionesDoc,
    ProyectosEmpresa,
    FilterTriggerButton,
    FilterModal,
  ],
  templateUrl: './empresa.html',
  styleUrl: './empresa.css',
})
export class Empresa implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  empresaId: number | null = null;
  empresas: EmpresaContratistaListDto[] = [];

  proyectosActivos: ProyectoDisponibleDto[] = [];
  loadingProyectos = false;

  selectedProyecto: ProyectoDisponibleDto | null = null;
  entregables: EmpresaEntregableDto[] = [];
  loadingEntregables = false;

  selectedEntregable: EmpresaEntregableDto | null = null;
  drawerOpen = false;

  progresoPorProyecto = new Map<number, ProgresoProyecto>();
  loadingProgreso = new Set<number>();

  archivosPendientes: ArchivoStagingDto[] = [];
  isDragging = false;
  panelVigencia = '';
  panelObsAbril = '';
  panelObsContratista = '';
  panelEstado = '';

  mesSeleccionado: EntregableMesDto | null = null;
  mesDropdownOpen = false;
  mesPanelMes: number = new Date().getMonth();
  mesPanelAnio: number = new Date().getFullYear();
  readonly mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  get mesesDisponibles(): { mes: number; anio: number; label: string }[] {
    const result: { mes: number; anio: number; label: string }[] = [];
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      result.push({ mes: d.getMonth() + 1, anio: d.getFullYear(),
        label: `${this.mesesNombres[d.getMonth()]} ${d.getFullYear()}` });
    }
    return result;
  }

  get mesActualLabel(): string {
    return `${this.mesesNombres[this.mesPanelMes]} ${this.mesPanelAnio}`;
  }

  get uploadingFile(): boolean { return this.archivosPendientes.some(a => a.subiendo); }
  get panelArchivoUrl(): string { return this.archivosPendientes.find(a => a.path)?.path ?? ''; }

  private readonly SCTR_VIDA_LEY_IDS = [15, 16];

  private excluirSCTRVidaLey(list: EmpresaEntregableDto[]): EmpresaEntregableDto[] {
    return list.filter((e) => !this.SCTR_VIDA_LEY_IDS.includes(e.itemId));
  }

  private filtrarSsoma(list: EmpresaEntregableDto[]): EmpresaEntregableDto[] {
    return list.filter((e) => (e.responsable || '').toUpperCase() === 'SSOMA');
  }
  private readonly VIGENCIA_ANTE_UPLOAD_IDS = [11, 12, 20, 22];

  get esSCTRoVidaLey(): boolean {
    return !!this.selectedEntregable && this.SCTR_VIDA_LEY_IDS.includes(this.selectedEntregable.itemId);
  }

  get requiereVigenciaAnteUpload(): boolean {
    return !!this.selectedEntregable
      && this.VIGENCIA_ANTE_UPLOAD_IDS.includes(this.selectedEntregable.itemId)
      && this.panelEstado !== 'No Aplica';
  }

  get uploadBloqueadoPorVigencia(): boolean {
    return this.requiereVigenciaAnteUpload && !this.panelVigencia && !this.esPermanente;
  }

  get esPermanente(): boolean {
    return !!this.selectedEntregable && (this.selectedEntregable.itemId === 12 || this.selectedEntregable.itemId === 13);
  }

  visorArchivoUrl = '';
  visorNombre = '';

  mostrarProyectos = false;

  // ── Filtros (admin): Proyecto + Empresa en cascada, misma vista que "por empresa" ──
  filtrosAbiertos = false;
  catalogoProyectos: ProjectGetDTO[] = [];
  filtroProyectoId: number | null = null;
  /** Empresas del proyecto elegido — narrows las opciones del combo Empresa (cascada). */
  empresasDeProyecto: EmpresaSimpleDto[] = [];
  /** Mismas empresas del proyecto elegido, con su estado de habilitación y entregables —
   * para la tabla resumen que se ve al elegir un proyecto sin haber elegido aún una empresa. */
  empresasPorProyecto: EmpresaPorProyectoDto[] = [];
  loadingEmpresasPorProyecto = false;
  private pendingProyectoFiltroId: number | null = null;

  get empresaOptions(): EmpresaSimpleDto[] {
    return this.filtroProyectoId ? this.empresasDeProyecto : this.empresas;
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroProyectoId) n++;
    if (this.empresaId) n++;
    return n;
  }

  limpiarFiltros(): void {
    this.filtroProyectoId = null;
    this.empresasDeProyecto = [];
    this.empresasPorProyecto = [];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: null },
      queryParamsHandling: 'merge',
    });
    this.onEmpresaChange(null);
  }

  modalVersionesOpen = false;
  historialVersiones: DocumentoVersionDto[] = [];
  loadingHistorial = false;
  mostrarHistorial = false;
  versionesLoader = (id: number): Observable<DocumentoVersionDto[]> =>
    this.empresaId ? this.habEmpresaService.getVersiones(this.empresaId, id) : EMPTY;

  constructor(
    private habEmpresaService: HabEmpresaService,
    private empresaContratistaService: EmpresaContratistaService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (this.isContratista()) {
      const id = this.readEmpresaIdFromJwt();
      if (id) {
        this.empresaId = id;
        this.loadProyectos();
      }
    } else if (this.isAdmin()) {
      this.loadEmpresasAdmin();
      this.loadCatalogoProyectos();
      // Por defecto arranca en el proyecto donde la persona tiene su vinculación activa
      // hoy, en vez de "todos los proyectos" — cada quien ve primero lo suyo.
      this.empresaContratistaService.getMiProyectoActual().subscribe({
        next: (res) => {
          if (res.proyectoId) this.onFiltroProyectoChange(res.proyectoId);
        },
        error: () => {},
      });
    }
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP) ||
      this.authService.hasRole(Roles.COORDINADOR_SSOMA)
    );
  }

  get puedeAprobarEntregableActual(): boolean {
    if (!this.selectedEntregable) return false;
    const resp = this.selectedEntregable.responsable?.toUpperCase() ?? '';
    if (resp === 'SSOMA')
      return this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    if (resp === 'ADMINISTRACION')
      return this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION) ||
             this.authService.hasRole(Roles.ADMINISTRADOR_UDP);
    return this.isAdmin();
  }

  private readEmpresaIdFromJwt(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      const raw = decoded?.empresaId ?? decoded?.['empresaId'];
      const num = Number(raw);
      return Number.isFinite(num) && num > 0 ? num : null;
    } catch {
      return null;
    }
  }

  private loadEmpresasAdmin(): void {
    this.empresaContratistaService.getEmpresas({ soloContratistas: false, pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.empresas = [];
      },
    });
  }

  onEmpresaChange(id: number | null): void {
    this.empresaId = id;
    this.resetAll();
    if (!id) return;
    if (this.filtroProyectoId) this.pendingProyectoFiltroId = this.filtroProyectoId;
    this.loadProyectos();
  }

  private resetAll(): void {
    this.proyectosActivos = [];
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.progresoPorProyecto.clear();
    this.loadingProgreso.clear();
    this.cdr.detectChanges();
  }

  loadProyectos(): void {
    if (!this.empresaId) return;
    this.loadingProyectos = true;
    this.proyectosActivos = [];
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.progresoPorProyecto.clear();
    this.habEmpresaService.getProyectosDisponibles(this.empresaId).subscribe({
      next: (res) => {
        this.proyectosActivos = (res ?? []).filter((p) => p.estaActiva);
        this.loadingProyectos = false;
        this.cdr.detectChanges();
        this.loadProgresoBatch(this.proyectosActivos);

        if (this.pendingProyectoFiltroId != null) {
          const target = this.proyectosActivos.find(p => p.id === this.pendingProyectoFiltroId);
          this.pendingProyectoFiltroId = null;
          if (target) this.selectProyecto(target);
        }
      },
      error: (err) => {
        this.loadingProyectos = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Filtro Proyecto (cascada sobre el combo Empresa) ──

  private loadCatalogoProyectos(): void {
    this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        this.catalogoProyectos = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => { this.catalogoProyectos = []; this.cdr.detectChanges(); },
    });
  }

  onFiltroProyectoChange(id: number | null): void {
    this.filtroProyectoId = id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: id ?? null },
      queryParamsHandling: 'merge',
    });
    if (!id) {
      this.empresasDeProyecto = [];
      this.empresasPorProyecto = [];
      return;
    }
    this.loadingEmpresasPorProyecto = true;
    this.habEmpresaService.getEmpresasPorProyecto(id).subscribe({
      next: (res) => {
        const list = res ?? [];
        this.empresasPorProyecto = list;
        this.empresasDeProyecto = list.map((e) => ({ id: e.empresaId, razonSocial: e.nombre }));
        this.loadingEmpresasPorProyecto = false;
        // Cascada: si la empresa elegida no pertenece al proyecto recién filtrado, se limpia.
        if (this.empresaId && !this.empresasDeProyecto.some((e) => e.id === this.empresaId)) {
          this.onEmpresaChange(null);
        }
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.empresasDeProyecto = [];
        this.empresasPorProyecto = [];
        this.loadingEmpresasPorProyecto = false;
        this.errorService.handleError(err);
      },
    });
  }

  private loadProgresoBatch(proyectos: ProyectoDisponibleDto[]): void {
    if (!this.empresaId || proyectos.length === 0) return;
    const eid = this.empresaId;
    for (const p of proyectos) {
      this.loadingProgreso.add(p.id);
      this.habEmpresaService.getEntregables(eid, p.id).subscribe({
        next: (items) => {
          const list = this.excluirSCTRVidaLey(items ?? []);
          // El estado "Habilitado"/"En proceso" de la empresa se calcula SOLO sobre entregables
          // SSOMA — los administrativos no deben bloquear el ingreso de trabajadores a obra.
          const ssoma = this.filtrarSsoma(list);
          this.progresoPorProyecto.set(p.id, {
            total: ssoma.length,
            aprobadosEquiv: ssoma.filter(
              (e) => e.estado === 'Aprobado' || e.estado === 'No Aplica' || e.estado === 'En Plazo',
            ).length,
            rechazados: ssoma.filter((e) => e.estado === 'Rechazado').length,
            entregables: list,
          });
          this.loadingProgreso.delete(p.id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingProgreso.delete(p.id);
          this.cdr.detectChanges();
        },
      });
    }
  }

  getProgreso(proyectoId: number): ProgresoProyecto | null {
    return this.progresoPorProyecto.get(proyectoId) ?? null;
  }

  isLoadingProgreso(proyectoId: number): boolean {
    return this.loadingProgreso.has(proyectoId);
  }

  getCardBorderClass(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return '';
    if (p.rechazados > 0) return 'proj-card--red';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'proj-card--green';
    return 'proj-card--amber';
  }

  getEstadoBadge(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return '';
    if (p.rechazados > 0) return 'Con rechazos';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'Habilitado';
    return 'En proceso';
  }

  getEstadoBadgeClass(proyectoId: number): string {
    const p = this.progresoPorProyecto.get(proyectoId);
    if (!p) return 'chip-gray';
    if (p.rechazados > 0) return 'chip-red';
    if (p.aprobadosEquiv === p.total && p.total > 0) return 'chip-green';
    return 'chip-orange';
  }

  selectProyecto(p: ProyectoDisponibleDto): void {
    this.selectedProyecto = p;
    this.selectedEntregable = null;
    this.drawerOpen = false;
    const cached = this.progresoPorProyecto.get(p.id);
    if (cached) {
      this.entregables = cached.entregables;
      this.loadingEntregables = false;
      this.cdr.detectChanges();
    } else {
      this.loadEntregablesForProyecto(p.id);
    }
  }

  volverAProyectos(): void {
    this.selectedProyecto = null;
    this.entregables = [];
    this.selectedEntregable = null;
    this.drawerOpen = false;
    this.cdr.detectChanges();
  }

  private loadEntregablesForProyecto(proyectoId: number): void {
    if (!this.empresaId) return;
    this.loadingEntregables = true;
    this.habEmpresaService.getEntregables(this.empresaId, proyectoId).subscribe({
      next: (res) => {
        this.entregables = this.excluirSCTRVidaLey(res ?? []);
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEntregables = false;
        this.errorService.handleError(err);
      },
    });
  }

  getEntregablesPorResponsable(responsable: string): EmpresaEntregableDto[] {
    return this.entregables.filter(
      (e) => (e.responsable || '').toUpperCase() === responsable.toUpperCase(),
    );
  }

  selectEntregable(e: EmpresaEntregableDto): void {
    this.selectedEntregable = e;
    this.archivosPendientes = [];
    this.mesSeleccionado = null;
    this.historialVersiones = [];
    this.mostrarHistorial = false;

    const hoy = new Date();
    const mesAnterior = hoy.getMonth() === 0 ? 12 : hoy.getMonth();
    const anioAnterior = hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear();
    this.mesPanelMes = mesAnterior - 1;
    this.mesPanelAnio = anioAnterior;

    if (e.esMensual && e.meses?.length > 0) {
      const mesExistente = e.meses.find(m => m.mes === mesAnterior && m.anio === anioAnterior);
      this.mesSeleccionado = mesExistente ?? null;
    }

    if (e.requiereVigencia && !e.esMensual && (e.estado === 'Enviado' || e.estado === 'Rechazado')) {
      this.panelVigencia = '';
    } else {
      this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
      if (!e.vigencia && e.itemId !== 12 && e.itemId !== 13) {
        const mesSig = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 27);
        this.panelVigencia = mesSig.toISOString().substring(0, 10);
      }
    }
    this.panelObsAbril = e.obsAbril ?? '';
    this.panelObsContratista = e.obsContratista ?? '';
    this.panelEstado = e.estado;
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  getMesEstado(mes: number, anio: number): string {
    return this.selectedEntregable?.meses?.find(
      m => m.mes === mes && m.anio === anio
    )?.estado ?? 'Falta';
  }

  toggleMesDropdown(): void {
    this.mesDropdownOpen = !this.mesDropdownOpen;
    this.cdr.markForCheck();
  }

  cerrarMesDropdown(): void {
    this.mesDropdownOpen = false;
    this.cdr.markForCheck();
  }

  seleccionarMes(mes: number, anio: number): void {
    this.onMesChange(mes, anio);
    this.cerrarMesDropdown();
  }

  onMesChange(mes: number, anio: number): void {
    this.mesPanelMes = mes - 1;
    this.mesPanelAnio = anio;
    this.archivosPendientes = [];
    if (this.selectedEntregable?.meses) {
      this.mesSeleccionado = this.selectedEntregable.meses.find(
        m => m.mes === mes && m.anio === anio
      ) ?? null;
    }
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    if (this.isContratista() && this.panelObsContratista?.trim()) {
      this.guardarObservaciones();
    }
    this.drawerOpen = false;
    this.selectedEntregable = null;
    this.panelEstado = '';
  }

  guardarObservaciones(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    const id = this.selectedEntregable.id;
    const obs = this.panelObsContratista;
    this.habEmpresaService
      .updateEntregable(this.empresaId, id, { obsContratista: obs || undefined })
      .subscribe({
        next: () => {
          const e = this.entregables.find(x => x.id === id);
          if (e) e.obsContratista = obs;
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  descargarDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = this.nombreArchivo(archivoUrl);
        a.click();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  abrirDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  private extractFileName(url: string): string {
    const parts = url.split(/[\\/]/);
    return parts[parts.length - 1] || url;
  }

  nombreArchivo(url: string): string {
    return this.extractFileName(url).replace(/^\d{8}_/, '');
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'en plazo') return 'dot-renovando';
    return 'dot-no-aplica';
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado': return 'chip-green';
      case 'Enviado': return 'chip-orange';
      case 'Rechazado': return 'chip-red';
      case 'En Plazo': return 'chip-blue';
      case 'No Aplica': return 'chip-gray';
      default: return 'chip-gray';
    }
  }

  getVigenciaEstimada(): string {
    if (!this.selectedEntregable) return '';
    const itemId = this.selectedEntregable.itemId;
    const sentinel = [12, 13, 14, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    if (sentinel.includes(itemId)) return '31/12/2040';
    if (this.selectedEntregable.esMensual) {
      const mes = this.mesPanelMes + 1;
      const anio = this.mesPanelAnio;
      const mesSig = mes === 12 ? 1 : mes + 1;
      const anioSig = mes === 12 ? anio + 1 : anio;
      const fecha = new Date(anioSig, mesSig - 1, 27);
      return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return '';
  }

  private _dropJustHappened = false;

  triggerFileInput(): void {
    if (this._dropJustHappened) return;
    this.fileInput?.nativeElement.click();
  }

  private addFiles(fileList: FileList | null | undefined): void {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    const extensionesPermitidas = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.csv', '.txt'];
    for (const file of files) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
      if (!extensionesPermitidas.includes(ext)) {
        Swal.fire({
          icon: 'warning',
          title: 'Archivo no permitido',
          text: `"${file.name}" no es un formato aceptado. Formatos válidos: PDF, JPG, PNG, DOCX, XLSX, CSV.`,
          confirmButtonColor: '#64bc04',
        });
        continue;
      }
      this.archivosPendientes.push({
        file, nombre: file.name, esZip: false,
        subiendo: false, error: false,
      });
    }
    this.cdr.markForCheck();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input?.files);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    console.log('onDragOver fired');
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.cdr.markForCheck();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    this.cdr.markForCheck();
  }

  onDrop(event: DragEvent): void {
    console.log('onDrop fired', event.dataTransfer?.files?.length);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.isDragging = false;
    this.addFiles(event.dataTransfer?.files);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this._dropJustHappened = true;
    setTimeout(() => { this._dropJustHappened = false; }, 300);
    this.cdr.markForCheck();
  }

  private autoMarcarEnviado(): void {
    if (!this.selectedEntregable || !this.empresaId) return;

    const payload: EmpresaEntregableUpdateDto = {
      estado: 'Enviado',
      archivoUrl: this.panelArchivoUrl || undefined,
      vigencia: this.panelVigencia || undefined,
      obsContratista: this.isContratista() ? this.panelObsContratista || undefined : undefined,
      obsAbril: !this.isContratista() ? this.panelObsAbril || undefined : undefined,
    };

    this.habEmpresaService
      .updateEntregable(this.empresaId, this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.panelEstado = 'Enviado';
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  clearArchivo(): void {
    this.archivosPendientes = [];
  }

  quitarArchivo(idx: number): void {
    this.archivosPendientes.splice(idx, 1);
    this.cdr.detectChanges();
  }

  abrirVisor(url: string): void {
    this.visorArchivoUrl = url;
    this.visorNombre = this.nombreArchivo(url);
    this.cdr.detectChanges();
  }

  onVisorClosed(): void {
    this.visorArchivoUrl = '';
    this.visorNombre = '';
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    if (this.archivosPendientes.length === 0) {
      Swal.fire({ icon: 'error', title: 'Debes adjuntar al menos un archivo' });
      return;
    }
    if (this.selectedEntregable.requiereVigencia && !this.panelVigencia && !this.esPermanente) {
      Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
      return;
    }
    if (this.selectedEntregable.requiereVigencia && !this.selectedEntregable.esMensual && !this.esPermanente) {
      const hoyVal = new Date(); hoyVal.setHours(0, 0, 0, 0);
      const fechaVal = this.panelVigencia ? new Date(this.panelVigencia) : null;
      if (!fechaVal || fechaVal <= hoyVal) {
        Swal.fire({ icon: 'error', title: 'Debes ingresar una fecha de vigencia válida',
          confirmButtonColor: '#64bc04' });
        return;
      }
    }

    const contexto = `habilitacion/empresas/${this.empresaId}`;
    const entregableId = this.selectedEntregable.id;
    const mesFijo = this.mesPanelMes + 1;
    const anioFijo = this.mesPanelAnio;

    this.archivosPendientes.forEach(a => a.subiendo = true);
    this.cdr.detectChanges();

    const subir = (idx: number): void => {
      if (idx >= this.archivosPendientes.length) {
        const archivos = this.archivosPendientes.map(a => ({
          archivoUrl: a.path!,
          nombreArchivo: a.nombre,
          esZip: a.esZip,
          zipContenido: a.zipContenido,
        }));
        this.sharepointService.enviarDocumento({
          habEmpresaId: entregableId,
          vigencia: (this.isContratista() && this.selectedEntregable!.requiereVigencia)
            ? (this.panelVigencia || undefined)
            : (!this.isContratista() ? (this.panelVigencia || undefined) : undefined),
          obsContratista: this.isContratista() ? this.panelObsContratista || undefined : undefined,
          ...(this.selectedEntregable!.esMensual ? {
            mes: mesFijo,
            anio: anioFijo,
          } : {}),
          archivos,
        }).subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Enviado', timer: 1500, showConfirmButton: false });
            this.archivosPendientes = [];
            const itemIdFijo = this.selectedEntregable!.itemId;
            const idx = this.entregables.findIndex(
              e => e.itemId === this.selectedEntregable?.itemId
            );
            this.ngZone.run(() => {
              if (idx !== -1) {
                this.entregables[idx] = { ...this.entregables[idx], estado: 'Enviado' };
                this.entregables = [...this.entregables];
              }
            });
            this.closeDrawer();
            setTimeout(() => {
              this.recargarEntregables((list) => {
                const frescoEntregable = list.find(
                  e => e.id === entregableId || e.itemId === itemIdFijo
                );
                if (frescoEntregable) {
                  this.selectedEntregable = frescoEntregable;
                  const idx = this.entregables.findIndex(
                    e => e.id === frescoEntregable.id || e.itemId === frescoEntregable.itemId
                  );
                  if (idx !== -1) {
                    this.entregables[idx] = { ...frescoEntregable };
                  }
                  this.entregables = [...this.entregables];
                  this.cdr.detectChanges();
                }
                this.mesPanelMes = mesFijo - 1;
                this.mesPanelAnio = anioFijo;
                this.mesSeleccionado = this.selectedEntregable?.meses
                  ?.find(m => m.mes === mesFijo && m.anio === anioFijo) ?? null;
                this.cdr.markForCheck();
              });
            }, 500);
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
        return;
      }

      const item = this.archivosPendientes[idx];
      this.sharepointService.subirArchivoMultiple(item.file, contexto).subscribe({
        next: (res) => {
          item.path = res.path;
          item.esZip = res.esZip;
          item.zipContenido = res.zipContenido;
          item.subiendo = false;
          this.cdr.detectChanges();
          subir(idx + 1);
        },
        error: () => {
          item.error = true;
          item.subiendo = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
          Swal.fire({ icon: 'error', title: `Error al subir ${item.nombre}` });
        },
      });
    };

    this.loaderService.show();
    subir(0);
  }

  guardarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;

    let payload: EmpresaEntregableUpdateDto;

    if (this.isContratista()) {
      if (!this.panelArchivoUrl) {
        Swal.fire({ icon: 'error', title: 'Debes subir un archivo antes de guardar' });
        return;
      }
      if (this.selectedEntregable.requiereVigencia && !this.panelVigencia) {
        Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
        return;
      }
      payload = {
        archivoUrl: this.panelArchivoUrl || undefined,
        vigencia: this.panelVigencia || undefined,
        obsContratista: this.panelObsContratista || undefined,
      };
    } else {
      const estado = this.panelEstado || this.selectedEntregable.estado;
      payload = {
        estado,
        vigencia: estado === 'No Aplica' ? '2040-12-31' : this.panelVigencia || undefined,
        archivoUrl: this.panelArchivoUrl || undefined,
        obsAbril: this.panelObsAbril || undefined,
      };
    }

    this.loaderService.show();
    this.habEmpresaService
      .updateEntregable(this.empresaId, this.selectedEntregable.id, payload)
      .subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  aprobarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'question',
      title: '¿Aprobar entregable?',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService
        .updateEntregable(this.empresaId, this.selectedEntregable.id, {
          estado: 'Aprobado',
          obsAbril: this.panelObsAbril || undefined,
          vigencia: this.panelVigencia || undefined,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Aprobado', timer: 1500, showConfirmButton: false });
            this.closeDrawer();
            this.recargarEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  rechazarEntregable(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar entregable',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (value) => (!value?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService
        .updateEntregable(this.empresaId, this.selectedEntregable.id, {
          estado: 'Rechazado',
          obsAbril: res.value,
        })
        .subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Rechazado', timer: 1500, showConfirmButton: false });
            this.closeDrawer();
            this.recargarEntregables();
          },
          error: (err: HttpErrorResponse) => {
            this.loaderService.hide();
            this.errorService.handleError(err);
          },
        });
    });
  }

  private recargarEntregables(afterLoad?: (list: EmpresaEntregableDto[]) => void): void {
    if (!this.selectedProyecto || !this.empresaId) return;
    const pid = this.selectedProyecto.id;
    const eid = this.empresaId;
    this.habEmpresaService.getEntregables(eid, pid).subscribe({
      next: (items) => {
        const list = this.excluirSCTRVidaLey(items ?? []);
        this.entregables = [...list];
        this.cdr.detectChanges();
        const ssoma = this.filtrarSsoma(list);
        this.progresoPorProyecto.set(pid, {
          total: ssoma.length,
          aprobadosEquiv: ssoma.filter(
            (e) => e.estado === 'Aprobado' || e.estado === 'No Aplica' || e.estado === 'En Plazo',
          ).length,
          rechazados: ssoma.filter((e) => e.estado === 'Rechazado').length,
          entregables: list,
        });
        if (this.selectedEntregable) {
          const updated = list.find((e) => e.id === this.selectedEntregable!.id);
          if (updated) {
            this.selectedEntregable = updated;
            if (this.mesSeleccionado && updated.meses) {
              const { mes, anio } = this.mesSeleccionado;
              this.mesSeleccionado = updated.meses.find(
                m => m.mes === mes && m.anio === anio
              ) ?? null;
            }
          }
        }
        afterLoad?.(list);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  abrirProyectos(): void {
    this.mostrarProyectos = true;
  }

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  cargarHistorial(): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.historialVersiones.length === 0) {
      this.loadingHistorial = true;
      this.habEmpresaService
        .getVersiones(this.empresaId, this.selectedEntregable.id)
        .subscribe({
          next: (res) => {
            this.historialVersiones = (res ?? []).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.loadingHistorial = false;
            this.cdr.markForCheck();
          },
          error: () => { this.loadingHistorial = false; this.cdr.markForCheck(); },
        });
    }
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  onProyectosChanged(): void {
    this.loadProyectos();
  }

  cambiarEstadoMes(mes: EntregableMesDto, nuevoEstado: string): void {
    if (!this.selectedEntregable || !this.empresaId || nuevoEstado === mes.estado) return;

    if (nuevoEstado === 'Rechazado') {
      this.rechazarMesEspecifico(mes);
      return;
    }

    if (nuevoEstado === 'En Plazo') {
      this.ponerEnPlazoMesEspecifico(mes);
      return;
    }

    this.loaderService.show();
    this.habEmpresaService.aprobarMes(this.empresaId, mes.id, { estado: nuevoEstado }).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Estado actualizado', timer: 1200, showConfirmButton: false });
        this.recargarEntregables();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  aprobarMesEspecifico(mes: EntregableMesDto): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'question',
      title: `¿Aprobar ${this.mesesNombres[mes.mes - 1]} ${mes.anio}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService.aprobarMes(this.empresaId, mes.id, {
        estado: 'Aprobado',
        vigencia: this.panelVigencia || undefined,
      }).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Mes aprobado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  ponerEnPlazoMesEspecifico(mes: EntregableMesDto): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    const hoy = new Date().toISOString().substring(0, 10);
    Swal.fire({
      icon: 'question',
      title: `Poner en plazo ${this.mesesNombres[mes.mes - 1]} ${mes.anio}`,
      input: 'date',
      inputLabel: 'Fecha límite acordada',
      inputAttributes: { min: hoy },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
      inputValidator: (v) => (!v ? 'Debes indicar la fecha límite' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService.aprobarMes(this.empresaId, mes.id, {
        estado: 'En Plazo',
        vigencia: res.value,
      }).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Puesto en plazo', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  rechazarMesEspecifico(mes: EntregableMesDto): void {
    if (!this.selectedEntregable || !this.empresaId) return;
    Swal.fire({
      icon: 'warning',
      title: `Rechazar ${this.mesesNombres[mes.mes - 1]} ${mes.anio}`,
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      inputValidator: (v) => (!v?.trim() ? 'Debes indicar un motivo' : null),
    }).then((res) => {
      if (!res.isConfirmed || !this.selectedEntregable || !this.empresaId) return;
      this.loaderService.show();
      this.habEmpresaService.aprobarMes(this.empresaId, mes.id, {
        estado: 'Rechazado',
        motivoRechazo: res.value,
      }).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Rechazado', timer: 1500, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  eliminarArchivoVersion(archivoId: number): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar archivo?',
      text: 'Solo puedes eliminar archivos de documentos aún no revisados.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.habEmpresaService.eliminarArchivo(this.empresaId!, archivoId).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1200, showConfirmButton: false });
          this.recargarEntregables();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }
}
