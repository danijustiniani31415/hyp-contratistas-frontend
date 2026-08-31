import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Roles } from '../../../../core/constants/roles';
import { EquipoHabService } from '../../services/equipo-hab.service';
import { SharepointUploadService } from '../../services/sharepoint-upload.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../core/dtos/project/project.model';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { EmpresaContratistaListDto } from '../../dtos/empresa.model';
import {
  EquipoEntregableDto,
  EquipoEntregableUpdateDto,
  EquipoListDto,
} from '../../dtos/equipo.model';
import { ArchivoStagingDto } from '../../dtos/trabajador.model';
import { EquipoForm } from './components/equipo-form/equipo-form';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';

@Component({
  selector: 'app-hab-equipos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Paginator, EquipoForm, SearchSelect, DocumentViewer, VersionesDoc],
  templateUrl: './equipos.html',
  styleUrl: './equipos.css',
})
export class Equipos implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly pageSize = 20;

  equipos: EquipoListDto[] = [];
  selectedEquipo: EquipoListDto | null = null;
  entregables: EquipoEntregableDto[] = [];
  selectedEntregable: EquipoEntregableDto | null = null;

  loading = false;
  loadingEntregables = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;

  filtroSearch = '';
  filtroProyectoId: number | null = null;
  filtroEmpresaId: number | null = null;
  catalogoProyectos: ProjectGetDTO[] = [];
  catalogoEmpresas: EmpresaContratistaListDto[] = [];

  modalNuevoOpen = false;
  modalEditarEquipo: EquipoListDto | null = null;
  modalVersionesOpen = false;
  versionesLoader = (id: number) => this.equipoService.getVersiones(id);

  drawerOpen = false;
  visorArchivoUrl = '';
  visorNombre = '';

  archivosPendientes: ArchivoStagingDto[] = [];
  panelVigencia = '';
  panelObsAbril = '';
  panelEstado = '';

  get uploadingFile(): boolean { return this.archivosPendientes.some(a => a.subiendo); }
  get panelArchivoUrl(): string { return this.archivosPendientes.find(a => a.path)?.path ?? ''; }

  private readonly VIGENCIA_ANTE_UPLOAD_IDS = [1, 2, 7, 8, 9, 11];

  get requiereVigenciaAnteUpload(): boolean {
    return !!this.selectedEntregable
      && this.VIGENCIA_ANTE_UPLOAD_IDS.includes(this.selectedEntregable.itemId)
      && this.panelEstado !== 'No Aplica';
  }

  get uploadBloqueadoPorVigencia(): boolean {
    return this.requiereVigenciaAnteUpload && !this.panelVigencia;
  }

  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private equipoService: EquipoHabService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private projectService: ProjectService,
    private empresaContratistaService: EmpresaContratistaService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadEquipos(1));

    const proyectoId = this.route.snapshot.queryParamMap.get('proyectoId');
    if (proyectoId) this.filtroProyectoId = Number(proyectoId);

    this.loadEquipos(1);
    this.loadCatalogos();
  }

  /** A diferencia de los demás filtros, el proyecto se refleja en la URL para que se
   * mantenga al cambiar de pestaña (Dashboard/Empresa/Trabajadores/Equipos comparten
   * ?proyectoId=). */
  onProyectoFiltroChange(id: number | null): void {
    this.filtroProyectoId = id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { proyectoId: id ?? null },
      queryParamsHandling: 'merge',
    });
    this.onFilterChange();
  }

  private loadCatalogos(): void {
    const esContratista = this.authService.isContratista();
    const empresaId = esContratista ? this.authService.getEmpresaId() : null;

    if (esContratista && empresaId) {
      this.empresaContratistaService.getProyectos(empresaId).subscribe({
        next: (data: any[]) => {
          this.catalogoProyectos = data.map(p => ({
            projectId: p.proyectoId,
            projectDescription: p.proyectoNombre,
          }) as ProjectGetDTO);
          this.cdr.detectChanges();
        },
        error: () => { this.catalogoProyectos = []; },
      });
    } else {
      this.projectService.getProjectsPaged({ page: 1, pageSize: 200 }).subscribe({
        next: (res) => {
          this.catalogoProyectos = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => { this.catalogoProyectos = []; },
      });
      this.empresaContratistaService.getEmpresas({ soloContratistas: false, pageSize: 200 }).subscribe({
        next: (res) => {
          this.catalogoEmpresas = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => { this.catalogoEmpresas = []; },
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEquipos(page: number = this.currentPage): void {
    this.loading = true;
    this.loaderService.show();
    const params: Record<string, unknown> = {
      page,
      pageSize: this.pageSize,
      search: this.filtroSearch.trim() || undefined,
      proyectoId: this.filtroProyectoId ?? undefined,
      empresaId: this.filtroEmpresaId ?? undefined,
    };
    this.equipoService.getEquipos(params).subscribe({
      next: (res) => {
        this.equipos = res.data ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(res.totalPages, 1);
        this.totalRecords = res.totalRecords;
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

  selectEquipo(eq: EquipoListDto): void {
    this.selectedEquipo = eq;
    this.selectedEntregable = null;
    this.resetPanel();
    this.loadEntregablesEquipo(eq.id);
  }

  loadEntregablesEquipo(equipoId: number): void {
    this.loadingEntregables = true;
    this.entregables = [];
    this.equipoService.getEntregables(equipoId).subscribe({
      next: (res) => {
        this.entregables = res ?? [];
        this.loadingEntregables = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEntregables = false;
        this.errorService.handleError(err);
      },
    });
  }

  selectEntregable(e: EquipoEntregableDto): void {
    this.archivosPendientes = [];
    this.selectedEntregable = e;
    this.panelVigencia = e.vigencia ? e.vigencia.substring(0, 10) : '';
    this.panelObsAbril = this.isContratista() ? (e.obsContratista ?? '') : (e.obsAbril ?? '');
    this.panelEstado = e.estado;
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    if (this.isContratista()) {
      this.guardarObservaciones();
    }
    this.drawerOpen = false;
    this.selectedEntregable = null;
    this.resetPanel();
  }

  guardarObservaciones(): void {
    if (!this.selectedEntregable) return;
    const id = this.selectedEntregable.id;
    const obs = this.panelObsAbril;
    this.equipoService.updateEntregable(id, { obsContratista: obs || undefined })
      .subscribe({
        next: () => {
          const e = this.entregables.find(x => x.id === id);
          if (e) e.obsContratista = obs;
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
  }

  private extractFileName(url: string): string {
    try {
      const parts = url.split(/[\\/]/);
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  }

  private resetPanel(): void {
    this.archivosPendientes = [];
    this.panelVigencia = '';
    this.panelObsAbril = '';
    this.panelEstado = '';
  }

  onSearch(): void {
    this.searchChange$.next();
  }

  onFilterChange(): void {
    this.loadEquipos(1);
  }

  onPageChange(page: number): void {
    this.loadEquipos(page);
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_ADMINISTRACION)
    );
  }

  get puedeAdministrarCatalogo(): boolean {
    return this.authService.hasFeature('habilitacion.catalogos.equipos');
  }

  getEstadoHabClass(estado: string): string {
    return estado === 'Habilitado' ? 'chip-green' : 'chip-orange';
  }

  getChipEstado(estado: string): string {
    switch (estado) {
      case 'Aprobado':
        return 'chip-green';
      case 'Enviado':
        return 'chip-orange';
      case 'Rechazado':
        return 'chip-orange';
      case 'No Aplica':
        return 'chip-gray';
      case 'Falta':
      default:
        return 'chip-gray';
    }
  }

  getDotClass(estado: string): string {
    const norm = (estado ?? '').toLowerCase();
    if (norm === 'aprobado') return 'dot-aprobado';
    if (norm === 'falta' || norm === 'rechazado') return 'dot-falta';
    if (norm === 'enviado') return 'dot-enviado';
    if (norm === 'no aplica') return 'dot-no-aplica';
    return 'dot-no-aplica';
  }

  nombreArchivo(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visorArchivoUrl) this.onVisorClosed();
    else if (this.drawerOpen) this.closeDrawer();
  }

  abrirVisor(archivoUrl: string): void {
    this.visorNombre = this.nombreArchivo(archivoUrl);
    this.visorArchivoUrl = archivoUrl;
  }

  onVisorClosed(): void {
    this.visorArchivoUrl = '';
  }

  abrirDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
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

  private actualizarEntregableLocal(updates: Partial<EquipoEntregableDto>): void {
    if (!this.selectedEntregable) return;
    const idx = this.entregables.findIndex((e) => e.id === this.selectedEntregable!.id);
    if (idx !== -1) {
      this.entregables[idx] = { ...this.entregables[idx], ...updates };
      this.selectedEntregable = this.entregables[idx];
    }
    this.cdr.detectChanges();
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) return;
    input.value = '';

    for (const file of files) {
      const item: ArchivoStagingDto = {
        file, nombre: file.name, esZip: file.name.endsWith('.zip'),
        subiendo: false, error: false,
      };
      this.archivosPendientes.push(item);
    }
    this.cdr.detectChanges();
  }

  private autoMarcarEnviado(): void {
    if (!this.selectedEntregable || !this.selectedEquipo) return;

    const vigencia = !this.selectedEntregable.requiereVigencia
      ? '2040-12-31'
      : this.panelVigencia || undefined;

    const payload: EquipoEntregableUpdateDto = {
      estado: 'Enviado',
      archivoUrl: this.panelArchivoUrl || undefined,
      vigencia,
      obsContratista: this.isContratista() ? this.panelObsAbril || undefined : undefined,
      obsAbril: !this.isContratista() ? this.panelObsAbril || undefined : undefined,
    };

    this.equipoService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.actualizarEntregableLocal({
          estado: 'Enviado',
          archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
          vigencia,
        });
        this.panelEstado = 'Enviado';
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  clearArchivo(): void {
    this.archivosPendientes = [];
  }

  quitarArchivo(idx: number): void {
    this.archivosPendientes.splice(idx, 1);
    this.cdr.detectChanges();
  }

  enviarDocumento(): void {
    if (!this.selectedEntregable || !this.selectedEquipo) return;
    if (this.archivosPendientes.length === 0) {
      Swal.fire({ icon: 'error', title: 'Debes adjuntar al menos un archivo' });
      return;
    }
    if (this.selectedEntregable.requiereVigencia && !this.panelVigencia) {
      Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' });
      return;
    }

    const contexto = `habilitacion/equipos/${this.selectedEquipo.id}`;
    const entregableId = this.selectedEntregable.id;

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
          habEquipoId: entregableId,
          vigencia: (this.isContratista() && this.selectedEntregable!.requiereVigencia)
            ? (this.panelVigencia || undefined)
            : (!this.isContratista() ? (this.panelVigencia || undefined) : undefined),
          obsContratista: this.isContratista() ? this.panelObsAbril || undefined : undefined,
          archivos,
        }).subscribe({
          next: () => {
            this.loaderService.hide();
            Swal.fire({ icon: 'success', title: 'Enviado', timer: 1500, showConfirmButton: false });
            this.archivosPendientes = [];
            this.actualizarEntregableLocal({ estado: 'Enviado' });
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
    if (!this.selectedEntregable || !this.selectedEquipo) return;

    let payload: EquipoEntregableUpdateDto;

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
        obsContratista: this.panelObsAbril || undefined,
      };
    } else {
      const vigencia = (!this.selectedEntregable.requiereVigencia || this.panelEstado === 'No Aplica')
        ? '2040-12-31'
        : this.panelVigencia || undefined;
      payload = {
        estado: this.panelEstado,
        vigencia,
        archivoUrl: this.panelArchivoUrl || undefined,
        obsAbril: this.panelObsAbril || undefined,
      };
    }

    this.loaderService.show();
    this.equipoService.updateEntregable(this.selectedEntregable.id, payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        if (this.isContratista()) {
          this.actualizarEntregableLocal({
            archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
            vigencia: this.panelVigencia || undefined,
            obsContratista: this.panelObsAbril || undefined,
          });
        } else {
          const vigencia = !this.selectedEntregable?.requiereVigencia
            ? '2040-12-31'
            : this.panelVigencia || undefined;
          this.actualizarEntregableLocal({
            estado: this.panelEstado,
            vigencia,
            archivoUrl: this.panelArchivoUrl || this.selectedEntregable?.archivoUrl,
            obsAbril: this.panelObsAbril || undefined,
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  verVersiones(): void {
    if (!this.selectedEntregable) return;
    this.modalVersionesOpen = true;
  }

  closeVersiones(): void {
    this.modalVersionesOpen = false;
  }

  abrirNuevoEquipo(): void {
    this.modalEditarEquipo = null;
    this.modalNuevoOpen = true;
  }

  abrirEditarEquipo(eq: EquipoListDto, event?: Event): void {
    event?.stopPropagation();
    this.modalEditarEquipo = eq;
    this.modalNuevoOpen = true;
  }

  closeNuevoEquipo(): void {
    this.modalNuevoOpen = false;
    this.modalEditarEquipo = null;
  }

  onEquipoSaved(): void {
    this.modalNuevoOpen = false;
    this.modalEditarEquipo = null;
    this.loadEquipos(this.currentPage);
  }
}
