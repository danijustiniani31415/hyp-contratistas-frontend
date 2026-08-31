import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import * as flatpickr from 'flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es';
import Swal from 'sweetalert2';
import { jwtDecode } from 'jwt-decode';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AuthService } from '../../../../../../core/services/auth.service';
import { Roles } from '../../../../../../core/constants/roles';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { SctrVidaLeyService } from '../../../../services/sctr-vidaley.service';
import { SharepointUploadService } from '../../../../services/sharepoint-upload.service';
import { SctrVidaLeyCreateDto, SctrTrabajadorEstadoDto } from '../../../../dtos/sctr.model';
import { CatalogosSaludService } from '../../../../../ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../../ssoma/salud-ocupacional/dtos/catalogos.model';
import { EmpresaContratistaService } from '../../../../services/empresa-contratista.service';

interface SctrSubirForm {
  tipo: 'SCTR' | 'VIDA_LEY';
  tipoPoliza: 'Renovacion' | 'Inclusion';
  empresaId: number | null;
  proyectoId: number | null;
  fechaInicio: string;
  vigencia: string;
  archivoUrl: string;
  archivoNombre: string;
}

@Component({
  selector: 'app-sctr-subir',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './sctr-subir.html',
  styleUrl: './sctr-subir.css',
})
export class SctrSubir implements OnChanges, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('inputFechaInicio') inputFechaInicio!: ElementRef;
  @ViewChild('inputFechaVencimiento') inputFechaVencimiento!: ElementRef;

  private fpInicio: any;
  private fpVencimiento: any;

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  paso: 1 | 2 = 1;

  empresas: EmpresaSimpleDto[] = [];
  proyectos: ProjectGetDTO[] = [];

  trabajadores: SctrTrabajadorEstadoDto[] = [];
  loadingWorkers = false;
  workersSeleccionados = new Set<number>();
  filtroObra: 'obra' | 'staff' | '' = '';
  isDragging = false;

  esOficinaStaff = false;
  archivoObjectUrl = '';
  model: SctrSubirForm = this.empty();
  saving = false;
  uploadingFile = false;

  private destroy$ = new Subject<void>();
  private uploadCancel$ = new Subject<void>();

  constructor(
    private sctrService: SctrVidaLeyService,
    private sharepointService: SharepointUploadService,
    private authService: AuthService,
    private projectService: ProjectService,
    private catalogosService: CatalogosSaludService,
    private empresaContratistaService: EmpresaContratistaService,
    private sanitizer: DomSanitizer,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadInitial();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.uploadCancel$.complete();
    this.revokeObjectUrl();
    this.fpInicio?.destroy();
    this.fpVencimiento?.destroy();
  }

  isAdmin(): boolean {
    return (
      this.authService.hasRole(Roles.ADMINISTRADOR_SSOMA) ||
      this.authService.hasRole(Roles.ADMINISTRADOR_UDP)
    );
  }

  isContratista(): boolean {
    return this.authService.isContratista();
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

  private reset(): void {
    this.uploadCancel$.next();
    this.uploadingFile = false;
    this.paso = 1;
    this.esOficinaStaff = false;
    this.model = this.empty();
    this.trabajadores = [];
    this.workersSeleccionados = new Set();
    this.revokeObjectUrl();
  }

  get empresasFiltradas(): EmpresaSimpleDto[] {
    if (!this.esOficinaStaff) return this.empresas;
    return this.empresas.filter(e => e.esAbril);
  }

  onEsOficinaStaffChange(): void {
    if (this.esOficinaStaff) {
      this.model.tipo = 'VIDA_LEY';
      this.model.proyectoId = null;
    }
    this.model.empresaId = null;
  }

  private loadInitial(): void {
    if (this.isAdmin()) {
      this.catalogosService.getEmpresas().subscribe({
        next: (res) => {
          this.empresas = res ?? [];
          this.cdr.detectChanges();
        },
        error: () => { this.empresas = []; },
      });
      this.projectService.getProjectPaged(1).subscribe({
        next: (res) => {
          this.proyectos = res.data ?? [];
          this.cdr.detectChanges();
        },
        error: () => { this.proyectos = []; },
      });
    } else {
      const id = this.readEmpresaIdFromJwt();
      if (id) {
        this.model.empresaId = id;
        this.empresaContratistaService.getProyectos(id).subscribe({
          next: (data: any[]) => {
            this.proyectos = data.map(p => ({
              projectId: p.proyectoId,
              projectDescription: p.proyectoNombre,
            }) as ProjectGetDTO);
            if (this.proyectos.length === 1) {
              this.model.proyectoId = this.proyectos[0].projectId;
            }
            this.cdr.detectChanges();
          },
          error: () => { this.proyectos = []; },
        });
      }
    }
  }

  private empty(): SctrSubirForm {
    return {
      tipo: 'SCTR',
      tipoPoliza: 'Renovacion',
      empresaId: null,
      proyectoId: null,
      fechaInicio: '',
      vigencia: '',
      archivoUrl: '',
      archivoNombre: '',
    };
  }

  get title(): string {
    return this.paso === 1 ? 'Subir SCTR / Vida Ley — Paso 1 de 2' : 'Subir SCTR / Vida Ley — Paso 2 de 2';
  }

  get modalWidth(): string {
    return this.paso === 2 ? 'w-[95vw] max-w-[95vw]' : 'w-[820px]';
  }

  get modalHeight(): string {
    return this.paso === 2 ? 'h-[95vh] max-h-[95vh]' : '';
  }

  get canPaso1(): boolean {
    if (!this.model.tipo || !this.model.tipoPoliza) return false;
    if (!this.model.empresaId) return false;
    return true;
  }

  get canSubmit(): boolean {
    if (this.saving || this.uploadingFile) return false;
    if (!this.model.archivoUrl) return false;
    if (this.workersSeleccionados.size === 0) return false;
    if (!this.model.fechaInicio || !this.model.vigencia) return false;
    return true;
  }

  private static readonly STAFF_VALUES = ['Staff', 'Oficina Central'];

  get trabajadoresFiltrados(): SctrTrabajadorEstadoDto[] {
    if (!this.filtroObra) return this.trabajadores;
    if (this.filtroObra === 'staff') {
      return this.trabajadores.filter((w) =>
        SctrSubir.STAFF_VALUES.includes(w.obraOficina ?? ''),
      );
    }
    return this.trabajadores.filter(
      (w) => !SctrSubir.STAFF_VALUES.includes(w.obraOficina ?? ''),
    );
  }

  get allChecked(): boolean {
    const lista = this.trabajadoresFiltrados;
    return lista.length > 0 && lista.every((w) => this.workersSeleccionados.has(w.workerId));
  }

  get someChecked(): boolean {
    return this.trabajadoresFiltrados.some((w) => this.workersSeleccionados.has(w.workerId));
  }

  private _safeArchivoUrl: SafeResourceUrl | null = null;

  get safeArchivoUrl(): SafeResourceUrl | null {
    return this._safeArchivoUrl;
  }

  avanzar(): void {
    if (!this.canPaso1) return;
    this.paso = 2;
    this.loadWorkers();
    this.cdr.detectChanges();
    setTimeout(() => this.initFlatpickr(), 0);
  }

  private initFlatpickr(): void {
    const fp: any = (flatpickr as any).default ?? flatpickr;

    console.log('[flatpickr] initFlatpickr called, fp callable:', typeof fp);
    console.log('[flatpickr] inputFechaInicio nativeElement:', this.inputFechaInicio?.nativeElement);
    console.log('[flatpickr] inputFechaVencimiento nativeElement:', this.inputFechaVencimiento?.nativeElement);

    this.fpInicio?.destroy();
    this.fpVencimiento?.destroy();

    if (this.inputFechaInicio?.nativeElement) {
      this.fpInicio = fp(this.inputFechaInicio.nativeElement, {
        locale: Spanish,
        dateFormat: 'd/m/Y',
        allowInput: true,
        appendTo: document.body,
        onChange: (dates: Date[]) => { this.model.fechaInicio = dates[0] ? this.formatDate(dates[0]) : ''; },
        onOpen: (_d: any, _s: any, instance: any) => {
          const handler = (e: MouseEvent) => {
            if (!instance.calendarContainer.contains(e.target as Node)) {
              instance.close();
              document.removeEventListener('mousedown', handler, true);
            }
          };
          setTimeout(() => document.addEventListener('mousedown', handler, true), 50);
        },
      });
      console.log('[flatpickr] fpInicio initialized:', this.fpInicio);
    } else {
      console.warn('[flatpickr] inputFechaInicio nativeElement NO disponible');
    }

    if (this.inputFechaVencimiento?.nativeElement) {
      this.fpVencimiento = fp(this.inputFechaVencimiento.nativeElement, {
        locale: Spanish,
        dateFormat: 'd/m/Y',
        allowInput: true,
        appendTo: document.body,
        onChange: (dates: Date[]) => { this.model.vigencia = dates[0] ? this.formatDate(dates[0]) : ''; },
        onOpen: (_d: any, _s: any, instance: any) => {
          const handler = (e: MouseEvent) => {
            if (!instance.calendarContainer.contains(e.target as Node)) {
              instance.close();
              document.removeEventListener('mousedown', handler, true);
            }
          };
          setTimeout(() => document.addEventListener('mousedown', handler, true), 50);
        },
      });
      console.log('[flatpickr] fpVencimiento initialized:', this.fpVencimiento);
    } else {
      console.warn('[flatpickr] inputFechaVencimiento nativeElement NO disponible');
    }
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  volver(): void {
    this.paso = 1;
  }

  private loadWorkers(): void {
    const empresaId = this.model.empresaId;
    if (!empresaId) return;
    this.loadingWorkers = true;
    this.trabajadores = [];
    this.workersSeleccionados = new Set();
    this.filtroObra = '';

    const baseParams = {
      empresaId,
      proyectoId: this.model.proyectoId ?? undefined,
      tipo: this.model.tipo,
      tipoPoliza: this.model.tipoPoliza,
      ...(this.esOficinaStaff ? { obraOficina: 'OficinaStaff' } : {}),
    };

    const estadoFiltro = this.model.tipoPoliza === 'Renovacion'
      ? 'Aprobado'
      : 'Falta,Vencido,Rechazado';

    const estadoParams = this.model.tipo === 'VIDA_LEY'
      ? { estadoVidaLey: estadoFiltro }
      : { estadoSctr: estadoFiltro };

    this.sctrService
      .getTrabajadoresPorEmpresa({ ...baseParams, ...estadoParams })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res) => {
        this.trabajadores = (res ?? []).sort((a, b) =>
          a.apellidoNombre.localeCompare(b.apellidoNombre, 'es'),
        );
        this.loadingWorkers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingWorkers = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleWorker(workerId: number): void {
    if (this.workersSeleccionados.has(workerId)) {
      this.workersSeleccionados.delete(workerId);
    } else {
      this.workersSeleccionados.add(workerId);
    }
  }

  setFiltroObra(valor: 'obra' | 'staff' | ''): void {
    this.filtroObra = valor;
    this.workersSeleccionados = new Set();
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      this.trabajadoresFiltrados.forEach((w) => this.workersSeleccionados.add(w.workerId));
    } else {
      this.trabajadoresFiltrados.forEach((w) => this.workersSeleccionados.delete(w.workerId));
    }
  }

  triggerFile(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    input.value = '';
    this.procesarArchivo(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.procesarArchivo(file);
  }

  private procesarArchivo(file: File): void {
    this.uploadCancel$.next();
    this.revokeObjectUrl();
    this.archivoObjectUrl = URL.createObjectURL(file);
    this._safeArchivoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.archivoObjectUrl);
    this.model.archivoNombre = file.name;
    this.model.archivoUrl = '';
    this.uploadFile(file);
    this.cdr.detectChanges();
  }

  private uploadFile(file: File): void {
    this.uploadingFile = true;
    this.sharepointService
      .subirArchivo(file, 'sctr')
      .pipe(takeUntil(this.uploadCancel$), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.model.archivoUrl = res.path;
          this.uploadingFile = false;
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.uploadingFile = false;
          this.model.archivoUrl = '';
          this.model.archivoNombre = '';
          this.revokeObjectUrl();
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
  }

  private revokeObjectUrl(): void {
    if (this.archivoObjectUrl) {
      URL.revokeObjectURL(this.archivoObjectUrl);
      this.archivoObjectUrl = '';
      this._safeArchivoUrl = null;
    }
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'Aprobado': return 'chip-green';
      case 'Rechazado': return 'chip-red';
      case 'Falta': return 'chip-gray';
      default: return 'chip-gray';
    }
  }

  submit(): void {
    if (!this.canSubmit) return;

    if (!this.esOficinaStaff && !this.model.proyectoId) {
      Swal.fire({ icon: 'warning', title: 'Proyecto requerido', text: 'Debes seleccionar un proyecto antes de continuar.', confirmButtonColor: '#64bc04' });
      return;
    }

    const [anio, mes] = this.model.fechaInicio.split('-').map(Number);

    const payload: SctrVidaLeyCreateDto = {
      proyectoId: this.model.proyectoId ?? undefined,
      tipo: this.model.tipo,
      tipoPoliza: this.model.tipoPoliza,
      mes,
      anio,
      fechaInicio: this.model.fechaInicio,
      vigencia: this.model.vigencia,
      archivoUrl: this.model.archivoUrl || undefined,
      workers: Array.from(this.workersSeleccionados).map((wId) => ({
        workerId: wId,
        fechaInicioCobertura: this.model.fechaInicio || undefined,
      })),
    };

    this.saving = true;
    this.loaderService.show();

    this.sctrService.create(payload, this.model.empresaId ?? undefined).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Documento creado', timer: 1500, showConfirmButton: false });
        this.model.fechaInicio = '';
        this.model.vigencia = '';
        this.loadWorkers();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.revokeObjectUrl();
    this.closed.emit();
  }
}
