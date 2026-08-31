import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ConsumoCargaResumenDto,
  ImportConsumoResultDto,
  HhCargaResumenDto,
  ImportHhResultDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

@Component({
  selector: 'app-presupuesto-main',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './presupuesto-main.html',
  styleUrl: './presupuesto-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestoMainComponent implements OnInit, OnDestroy {
  private svc = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  readonly headerTabs = PRESUPUESTO_TABS;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Cargas S10 (materiales)
  cargas: ConsumoCargaResumenDto[] = [];
  loadingCargas = false;
  subiendoArchivo = false;
  uploadResult: ImportConsumoResultDto | null = null;
  archivoSeleccionado: File | null = null;
  estandarizandoId: number | null = null;
  progresoEstandarizacion: { procesadas: number; total: number } | null = null;
  private pollProgreso: ReturnType<typeof setInterval> | null = null;

  // Cargas de Horas Hombre (planilla/Tareo semanal)
  cargasHh: HhCargaResumenDto[] = [];
  loadingCargasHh = false;
  subiendoArchivoHh = false;
  uploadResultHh: ImportHhResultDto | null = null;
  archivoSeleccionadoHh: File | null = null;

  ngOnInit(): void {
    this.loadProyectos();
  }

  ngOnDestroy(): void {
    this.detenerPollProgreso();
  }

  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res.map((p) => ({
          projectId: p.projectId,
          projectDescription: p.projectDescription,
        }));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onProyectoChange(): void {
    this.cargas = [];
    this.uploadResult = null;
    this.cargasHh = [];
    this.uploadResultHh = null;
    if (!this.proyectoId) { this.cdr.markForCheck(); return; }
    this.loadCargas();
    this.loadCargasHh();
  }

  // ─── Cargas de materiales (S10) ─────────────────────────────────────────

  loadCargas(): void {
    if (!this.proyectoId) return;
    this.loadingCargas = true;
    this.cdr.markForCheck();
    this.svc.listarCargas(this.proyectoId).subscribe({
      next: (c) => {
        this.cargas = c;
        this.loadingCargas = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCargas = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files?.[0] ?? null;
    this.uploadResult = null;
    this.cdr.markForCheck();
  }

  subirS10(): void {
    if (!this.proyectoId || !this.archivoSeleccionado || this.subiendoArchivo) return;
    this.subiendoArchivo = true;
    this.uploadResult = null;
    this.cdr.markForCheck();
    this.svc.importarS10(this.proyectoId, this.archivoSeleccionado).subscribe({
      next: (res) => {
        this.uploadResult = res;
        this.subiendoArchivo = false;
        this.archivoSeleccionado = null;
        this.loadCargas();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivo = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  estandarizar(cargaId: number): void {
    if (this.estandarizandoId === cargaId) return;
    this.estandarizandoId = cargaId;
    this.progresoEstandarizacion = null;
    this.cdr.markForCheck();
    this.iniciarPollProgreso(cargaId);
    this.svc.estandarizar(cargaId).subscribe({
      next: () => {
        this.detenerPollProgreso();
        this.estandarizandoId = null;
        this.progresoEstandarizacion = null;
        this.loadCargas();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.detenerPollProgreso();
        this.estandarizandoId = null;
        this.progresoEstandarizacion = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Consulta el progreso cada 1.5s mientras dura la estandarización — puede tardar varios minutos
   * en lotes grandes (miles de líneas), y sin esto la pantalla se queda "Procesando..." sin más info. */
  private iniciarPollProgreso(cargaId: number): void {
    this.pollProgreso = setInterval(() => {
      this.svc.obtenerProgresoEstandarizacion(cargaId).subscribe({
        next: (p) => {
          this.progresoEstandarizacion = p.enProceso && p.total ? { procesadas: p.procesadas ?? 0, total: p.total } : null;
          this.cdr.markForCheck();
        },
        error: () => {},
      });
    }, 1500);
  }

  private detenerPollProgreso(): void {
    if (this.pollProgreso) {
      clearInterval(this.pollProgreso);
      this.pollProgreso = null;
    }
  }

  // ─── Cargas de Horas Hombre ──────────────────────────────────────────────

  loadCargasHh(): void {
    if (!this.proyectoId) return;
    this.loadingCargasHh = true;
    this.cdr.markForCheck();
    this.svc.listarCargasHh(this.proyectoId).subscribe({
      next: (c) => {
        this.cargasHh = c;
        this.loadingCargasHh = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCargasHh = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onArchivoChangeHh(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionadoHh = input.files?.[0] ?? null;
    this.uploadResultHh = null;
    this.cdr.markForCheck();
  }

  subirHh(): void {
    if (!this.proyectoId || !this.archivoSeleccionadoHh || this.subiendoArchivoHh) return;
    this.subiendoArchivoHh = true;
    this.uploadResultHh = null;
    this.cdr.markForCheck();
    this.svc.importarHh(this.proyectoId, this.archivoSeleccionadoHh).subscribe({
      next: (res) => {
        this.uploadResultHh = res;
        this.subiendoArchivoHh = false;
        this.archivoSeleccionadoHh = null;
        this.loadCargasHh();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoArchivoHh = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  estadoCargaClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'completado': return 'pres-badge--ok';
      case 'pendiente_revision': return 'pres-badge--warn';
      default: return 'pres-badge--neutral';
    }
  }
}
