import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil, lastValueFrom } from 'rxjs';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { DocumentViewer } from '../../../../shared/components/document-viewer/document-viewer';
import { FilterTriggerButton } from '../../../../shared/components/filter-trigger/filter-trigger';
import { FilterModal } from '../../../../shared/components/filter-modal/filter-modal';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { InterconsultaService } from '../../../ssoma/salud-ocupacional/services/interconsulta.service';
import {
  InterconsultaListDto,
  InterconsultaDetalleDto,
  InterconsultaUpdateDto,
} from '../../../ssoma/salud-ocupacional/dtos/interconsulta.model';
import { ErrorService } from '../../../../core/services/error.service';
import { LoaderService } from '../../../../core/services/loader.service';

import { CLINICA_TABS } from '../../shared/clinica-tabs';
interface FilterOption {
  id: string;
  nombre: string;
}

interface LevantamientoData {
  fechaAtencion: string;
  resultado: string;
  diagnostico: string;
  archivo: File | null;
  archivoNombre: string;
  archivoTamano: string;
  archivoError: string;
  fechaError: string;
  cargando: boolean;
}

interface EditandoData {
  id: number;
  especialidad: string;
  diagnostico: string;
  especialidadError: string;
  cargando: boolean;
}

@Component({
  selector: 'app-interconsultas-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, DocumentViewer, FilterTriggerButton, FilterModal, SearchSelect, SearchInput],
  templateUrl: './interconsultas.html',
  styleUrls: ['./interconsultas.css'],
})
export class InterconsultasClinica implements OnInit, OnDestroy {
  readonly tabs = CLINICA_TABS;
  items: InterconsultaListDto[] = [];
  loading = false;
  filtroEstado = 'Pendiente';
  filtroSearch = '';
  filtrosAbiertos = false;

  private searchChange$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Levantar interconsulta pendiente
  interconsultaActiva: InterconsultaListDto | null = null;
  levantamiento: LevantamientoData = this.emptyLevantamiento();

  // Editar especialidad / diagnóstico de la derivación
  editando: EditandoData | null = null;

  // Ver / editar interconsulta existente (no pendiente)
  viendo: InterconsultaDetalleDto | null = null;
  form: InterconsultaUpdateDto = {};
  saving = false;

  // Visor de documento (informe de interconsulta)
  visorUrl = '';
  visorNombre = '';

  readonly estadoOptions: FilterOption[] = [
    { id: '', nombre: 'Todos' },
    { id: 'Pendiente', nombre: 'Pendiente' },
    { id: 'Atendida', nombre: 'Atendida' },
    { id: 'Cancelada', nombre: 'Cancelada' },
  ];

  constructor(
    private svc: InterconsultaService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.filtroSearch = value;
    this.searchChange$.next(value);
  }

  onFilterChange(): void {
    this.load();
  }

  clearFilters(): void {
    this.filtroEstado = 'Pendiente';
    this.filtroSearch = '';
    this.load();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtroEstado && this.filtroEstado !== 'Pendiente') n++;
    if (this.filtroSearch) n++;
    return n;
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc
      .getInterconsultas({
        estado: this.filtroEstado || undefined,
        search: this.filtroSearch || undefined,
        pageSize: 100,
      })
      .subscribe({
        next: (res) => {
          this.items = res.data ?? [];
          this.loading = false;
          this.loaderService.hide();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  // ── Levantar interconsulta ────────────────────────────────
  abrirResolver(item: InterconsultaListDto): void {
    this.interconsultaActiva = item;
    this.levantamiento = this.emptyLevantamiento();
  }

  cancelarResolucion(): void {
    this.interconsultaActiva = null;
    this.levantamiento = this.emptyLevantamiento();
  }

  onArchivoLevantamiento(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.levantamiento.archivoError = '';
    if (!file) {
      this.levantamiento.archivo = null;
      this.levantamiento.archivoNombre = '';
      this.levantamiento.archivoTamano = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.levantamiento.archivoError = 'El archivo no debe superar 10 MB.';
      input.value = '';
      return;
    }
    this.levantamiento.archivo = file;
    this.levantamiento.archivoNombre = file.name;
    this.levantamiento.archivoTamano = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
  }

  get levantarDeshabilitado(): boolean {
    const lev = this.levantamiento;
    return !lev.fechaAtencion || !lev.archivo || lev.cargando;
  }

  async confirmarLevantamiento(): Promise<void> {
    const lev = this.levantamiento;
    if (!this.interconsultaActiva) return;
    lev.fechaError = '';
    lev.archivoError = '';

    if (!lev.fechaAtencion) { lev.fechaError = 'La fecha de atención es obligatoria'; return; }
    if (!lev.archivo) { lev.archivoError = 'Debes adjuntar el informe de interconsulta'; return; }

    lev.cargando = true;
    const id = this.interconsultaActiva.id;
    try {
      const uploadResp = await lastValueFrom(this.svc.subirInforme(id, lev.archivo));
      await lastValueFrom(
        this.svc.updateResultado(id, {
          estado: 'Atendida',
          fechaAtencion: lev.fechaAtencion,
          diagnostico: lev.diagnostico || undefined,
          resultado: lev.resultado || undefined,
          urlInforme: uploadResp?.url || undefined,
        }),
      );
      this.cancelarResolucion();
      this.load();
    } catch (err: any) {
      this.errorService.handleError(err);
    } finally {
      lev.cargando = false;
    }
  }

  // ── Editar especialidad / diagnóstico de la derivación ────
  abrirEditar(item: InterconsultaListDto): void {
    this.editando = {
      id: item.id,
      especialidad: item.especialidad,
      diagnostico: item.diagnostico ?? '',
      especialidadError: '',
      cargando: false,
    };
  }

  cerrarEditar(): void {
    this.editando = null;
  }

  guardarEdicion(): void {
    const ed = this.editando;
    if (!ed) return;
    ed.especialidadError = '';
    if (!ed.especialidad.trim()) {
      ed.especialidadError = 'La especialidad es obligatoria';
      return;
    }
    ed.cargando = true;
    this.svc.updateDerivacion(ed.id, {
      especialidad: ed.especialidad.trim(),
      diagnostico: ed.diagnostico.trim() || undefined,
    }).subscribe({
      next: () => {
        ed.cargando = false;
        this.cerrarEditar();
        this.load();
      },
      error: (err) => {
        ed.cargando = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Ver / Editar (no pendiente) ──────────────────────────
  abrirVer(item: InterconsultaListDto): void {
    this.loaderService.show();
    this.svc.getInterconsulta(item.id).subscribe({
      next: (detalle) => {
        this.viendo = detalle;
        this.form = {
          fechaAtencion: detalle.fechaAtencion ?? '',
          diagnostico: detalle.diagnostico ?? '',
          cie10: detalle.cie10 ?? '',
          resultado: detalle.resultado ?? '',
          urlInforme: detalle.urlInforme ?? '',
          estado: detalle.estado,
          notas: detalle.notas ?? '',
        };
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  cerrarVer(): void {
    this.viendo = null;
    this.form = {};
  }

  verDocumento(url: string | undefined | null, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  guardar(): void {
    if (!this.viendo) return;
    this.saving = true;
    this.svc.updateInterconsulta(this.viendo.id, this.form).subscribe({
      next: () => {
        this.saving = false;
        this.cerrarVer();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  get pendientesCount(): number {
    return this.items.filter((i) => i.estado === 'Pendiente').length;
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      Pendiente: 'chip-orange',
      Atendida: 'chip-green',
      Cancelada: 'chip-gray',
    };
    return map[estado] ?? 'chip-gray';
  }

  diasClass(dias: number, estado: string): string {
    if (estado !== 'Pendiente') return 'chip-muted';
    if (dias > 15) return 'chip-red';
    if (dias >= 8) return 'chip-orange';
    return 'chip-green';
  }

  private emptyLevantamiento(): LevantamientoData {
    return {
      fechaAtencion: '',
      resultado: '',
      diagnostico: '',
      archivo: null,
      archivoNombre: '',
      archivoTamano: '',
      archivoError: '',
      fechaError: '',
      cargando: false,
    };
  }
}
