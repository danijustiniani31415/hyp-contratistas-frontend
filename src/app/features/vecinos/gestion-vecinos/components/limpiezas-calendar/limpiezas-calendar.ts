import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { GestionVecinosService } from '../../services/gestion-vecinos.service';
import {
  VecinoLimpiezaDTO,
  VecinoListItemDTO,
  VecinoCompromisoSelectDTO,
  VecinoLimpiezaCumplimientoDTO,
  CatalogOptionDTO,
} from '../../dtos/gestion-vecinos.dto';

/** Celda del calendario. `iso` null = relleno fuera del mes. */
interface DayCell {
  iso: string | null;
  dayNum: number | null;
  inMonth: boolean;
}

@Component({
  selector: 'app-limpiezas-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './limpiezas-calendar.html',
})
export class LimpiezasCalendar implements OnChanges {
  @Input({ required: true }) projectId!: number;
  /** Vecinos del proyecto (para asignar la limpieza de un departamento). */
  @Input() vecinos: VecinoListItemDTO[] = [];

  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  year = 0;
  month = 0; // 1–12
  weeks: DayCell[][] = [];
  limpiezas: VecinoLimpiezaDTO[] = [];
  tipos: CatalogOptionDTO[] = [];
  cumplimiento: VecinoLimpiezaCumplimientoDTO | null = null;

  // Modal de día.
  selectedIso: string | null = null;
  showAddForm = false;
  nuevo = { vecinoLimpiezaTipoId: null as number | null, vecinoId: null as number | null, descripcion: '' };

  // Atención de limpieza: compromisos por vecino + compromiso seleccionado por limpieza.
  compromisosByVecino: Record<number, VecinoCompromisoSelectDTO[]> = {};
  atencionCompromisoSel: Record<number, number | null> = {};

  constructor(
    private service: GestionVecinosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId'] && this.projectId) {
      if (!this.year) {
        const now = new Date();
        this.year = now.getFullYear();
        this.month = now.getMonth() + 1;
      }
      this.buildGrid();
      this.load();
      this.loadCumplimiento();
    }
  }

  private loadCumplimiento(): void {
    this.service.getLimpiezasCumplimiento(this.projectId).subscribe({
      next: (res) => (this.cumplimiento = res),
      error: () => {},
    });
  }

  pct(hechas: number, programadas: number): number {
    if (!programadas) return 0;
    return Math.round((hechas / programadas) * 100);
  }

  get monthLabel(): string {
    return `${this.monthNames[this.month - 1]} de ${this.year}`;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  private isoOf(y: number, m: number, d: number): string {
    return `${y}-${this.pad(m)}-${this.pad(d)}`;
  }

  private buildGrid(): void {
    const firstDay = new Date(this.year, this.month - 1, 1);
    const daysInMonth = new Date(this.year, this.month, 0).getDate();
    // getDay(): 0=Dom..6=Sáb. Queremos que la semana empiece en lunes.
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: DayCell[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ iso: null, dayNum: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: this.isoOf(this.year, this.month, d), dayNum: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, dayNum: null, inMonth: false });

    this.weeks = [];
    for (let i = 0; i < cells.length; i += 7) this.weeks.push(cells.slice(i, i + 7));
  }

  private load(): void {
    this.loaderService.show();
    this.service.getLimpiezas(this.projectId, this.year, this.month).subscribe({
      next: (res) => {
        this.limpiezas = res.limpiezas;
        this.tipos = res.tipos;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  prevMonth(): void {
    if (this.month === 1) { this.month = 12; this.year--; } else { this.month--; }
    this.buildGrid();
    this.load();
  }

  nextMonth(): void {
    if (this.month === 12) { this.month = 1; this.year++; } else { this.month++; }
    this.buildGrid();
    this.load();
  }

  // ── Indicadores por día ────────────────────────────────────────────────
  limpiezasDe(iso: string | null): VecinoLimpiezaDTO[] {
    if (!iso) return [];
    return this.limpiezas.filter((l) => l.fecha === iso);
  }

  esDepartamento(l: VecinoLimpiezaDTO): boolean {
    return l.tipoDescripcion === 'Departamento';
  }

  tieneComun(iso: string | null): boolean {
    return this.limpiezasDe(iso).some((l) => !this.esDepartamento(l));
  }

  tieneDepartamento(iso: string | null): boolean {
    return this.limpiezasDe(iso).some((l) => this.esDepartamento(l));
  }

  // ── Modal de día ────────────────────────────────────────────────────────
  get selectedLabel(): string {
    if (!this.selectedIso) return '';
    const [y, m, d] = this.selectedIso.split('-').map(Number);
    return `${d} de ${this.monthNames[m - 1]} de ${y}`;
  }

  get selectedLimpiezas(): VecinoLimpiezaDTO[] {
    return this.limpiezasDe(this.selectedIso);
  }

  /** ISO de hoy (local), para gatear la subida de atención (hoy y días pasados). */
  get todayIso(): string {
    const n = new Date();
    return this.isoOf(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }

  esPasadoOHoy(iso: string | null): boolean {
    return !!iso && iso <= this.todayIso;
  }

  openDay(cell: DayCell): void {
    if (!cell.iso) return;
    this.selectedIso = cell.iso;
    this.resetForm();

    // Precarga: compromiso ya asociado por limpieza + compromisos de cada vecino (departamento).
    this.atencionCompromisoSel = {};
    for (const l of this.limpiezasDe(cell.iso)) {
      this.atencionCompromisoSel[l.vecinoLimpiezaId] = l.atencionVecinoCompromisoId ?? null;
      if (this.esDepartamento(l) && l.vecinoId && !this.compromisosByVecino[l.vecinoId]) {
        this.service.getCompromisosSelect(l.vecinoId).subscribe({
          next: (res) => (this.compromisosByVecino[l.vecinoId!] = res),
          error: () => (this.compromisosByVecino[l.vecinoId!] = []),
        });
      }
    }
  }

  compromisosDe(l: VecinoLimpiezaDTO): VecinoCompromisoSelectDTO[] {
    return l.vecinoId ? this.compromisosByVecino[l.vecinoId] ?? [] : [];
  }

  atencionFileUrl(url?: string | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  onAtencionFileSelected(l: VecinoLimpiezaDTO, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const compromisoId = this.atencionCompromisoSel[l.vecinoLimpiezaId] ?? null;
    if (this.esDepartamento(l) && !compromisoId) {
      input.value = '';
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona un compromiso',
        text: 'La atención de una limpieza de departamento debe relacionarse con un compromiso de una solicitud.',
        confirmButtonColor: '#4CAF50',
      });
      return;
    }

    this.loaderService.show();
    this.service.uploadAtencion(l.vecinoLimpiezaId, file, this.esDepartamento(l) ? compromisoId : null).subscribe({
      next: (res) => {
        l.atencionArchivoUrl = res.archivoUrl;
        l.atencionOriginalFileName = file.name;
        if (this.esDepartamento(l)) {
          l.atencionVecinoCompromisoId = compromisoId;
          l.atencionCompromisoLabel = this.compromisosDe(l).find((c) => c.vecinoCompromisoId === compromisoId)?.label ?? null;
        }
        input.value = '';
        this.loadCumplimiento();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        input.value = '';
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  closeDay(): void {
    this.selectedIso = null;
    this.showAddForm = false;
  }

  /** Opciones de vecino para el desplegable (solo los que tienen al menos una persona registrada). */
  get vecinoOptions(): { id: number; label: string }[] {
    return this.vecinos
      .filter((v) => (v.personas?.length ?? 0) > 0)
      .map((v) => ({
        id: v.vecinoId,
        label: `${v.direccion ?? 'Sin dirección'}${v.interiorDepartamento ? ' · ' + v.interiorDepartamento : ''}${v.nombrePropietario ? ' — ' + v.nombrePropietario : ''}`,
      }));
  }

  get tipoSeleccionadoEsDepartamento(): boolean {
    const t = this.tipos.find((x) => x.id === this.nuevo.vecinoLimpiezaTipoId);
    return t?.descripcion === 'Departamento';
  }

  private resetForm(): void {
    this.showAddForm = false;
    this.nuevo = { vecinoLimpiezaTipoId: null, vecinoId: null, descripcion: '' };
  }

  startAdd(): void {
    this.showAddForm = true;
    this.nuevo = { vecinoLimpiezaTipoId: null, vecinoId: null, descripcion: '' };
  }

  guardar(): void {
    if (!this.nuevo.vecinoLimpiezaTipoId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona el tipo de limpieza', confirmButtonColor: '#4CAF50' });
      return;
    }
    if (this.tipoSeleccionadoEsDepartamento && !this.nuevo.vecinoId) {
      Swal.fire({ icon: 'warning', title: 'Selecciona el vecino del departamento', confirmButtonColor: '#4CAF50' });
      return;
    }

    this.loaderService.show();
    this.service
      .createLimpieza(this.projectId, {
        fecha: this.selectedIso!,
        vecinoLimpiezaTipoId: this.nuevo.vecinoLimpiezaTipoId,
        vecinoId: this.tipoSeleccionadoEsDepartamento ? this.nuevo.vecinoId : null,
        descripcion: this.nuevo.descripcion.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.limpiezas = [...this.limpiezas, res.limpieza];
          this.resetForm();
          this.loadCumplimiento();
          this.loaderService.hide();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
  }

  async eliminar(l: VecinoLimpiezaDTO): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: '¿Eliminar esta limpieza?',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#D30000',
    });
    if (!isConfirmed) return;

    this.loaderService.show();
    this.service.deleteLimpieza(l.vecinoLimpiezaId).subscribe({
      next: () => {
        this.limpiezas = this.limpiezas.filter((x) => x.vecinoLimpiezaId !== l.vecinoLimpiezaId);
        this.loadCumplimiento();
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
