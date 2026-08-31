import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { InduccionProgramacionService } from '../../../../shared/services/induccion-programacion.service';
import {
  ProgramacionInduccionDTO,
  ProyectoSimpleInduccionDTO,
  ResponsableProyectoDTO,
  RotacionProyectoDTO,
} from '../../../../shared/dtos/induccion-programacion.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';

type ModoEdicion = 'reasignar' | 'reprogramar' | null;

function hoyISO(): string {
  return new Date().toISOString().split('T')[0];
}

function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

@Component({
  selector: 'app-programacion-inducciones-main',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect, AbrilModalPanel, TitleCasePipe],
  templateUrl: './programacion-inducciones-main.html',
  styleUrl: './programacion-inducciones-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionInduccionesMainComponent implements OnInit {
  private svc = inject(InduccionProgramacionService);
  private errorSvc = inject(ErrorService);
  private loader = inject(LoaderService);
  private cdr = inject(ChangeDetectorRef);

  vista: 'rotacion' | 'calendario' = 'calendario';

  // ── Rotación ──────────────────────────────────────────────────────
  rotacion: RotacionProyectoDTO[] = [];
  proyectosDisponibles: ProyectoSimpleInduccionDTO[] = [];
  proyectoNuevoId: number | null = null;
  responsablesNuevo: ResponsableProyectoDTO[] = [];
  responsableNuevoId: number | null = null;

  // ── Modal: cambiar responsable de un turno ya creado ──────────────
  rotEditando: RotacionProyectoDTO | null = null;
  rotResponsables: ResponsableProyectoDTO[] = [];
  rotFormResponsableId: number | null = null;
  rotGuardando = false;

  // ── Calendario ────────────────────────────────────────────────────
  calendario: ProgramacionInduccionDTO[] = [];
  rangoDesde = hoyISO();
  rangoHasta = sumarDias(hoyISO(), 30);

  // ── Modal de edición de una fecha ─────────────────────────────────
  editando: ProgramacionInduccionDTO | null = null;
  modoEdicion: ModoEdicion = null;
  formProyectoId: number | null = null;
  formFecha = '';
  formMotivo = '';
  guardandoEdicion = false;

  // ── Modal: cambiar responsable de una fecha puntual del calendario ─
  progEditando: ProgramacionInduccionDTO | null = null;
  progResponsables: ResponsableProyectoDTO[] = [];
  progFormResponsableId: number | null = null;
  progGuardando = false;

  ngOnInit(): void {
    this.cargarRotacion();
    this.cargarProyectosDisponibles();
    this.cargarCalendario();
  }

  cambiarVista(v: 'rotacion' | 'calendario'): void {
    this.vista = v;
    this.cdr.markForCheck();
  }

  // ── Rotación ──────────────────────────────────────────────────────

  cargarRotacion(): void {
    this.svc.getRotacion().subscribe({
      next: (res) => {
        this.rotacion = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  cargarProyectosDisponibles(): void {
    this.svc.getProyectosDisponibles().subscribe({
      next: (res) => {
        this.proyectosDisponibles = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  onProyectoNuevoChange(proyectoId: number | null): void {
    this.proyectoNuevoId = proyectoId;
    this.responsableNuevoId = null;
    this.responsablesNuevo = [];
    if (!proyectoId) {
      this.cdr.markForCheck();
      return;
    }
    this.svc.getResponsablesDisponibles(proyectoId).subscribe({
      next: (res) => {
        this.responsablesNuevo = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  agregarProyecto(): void {
    if (!this.proyectoNuevoId) return;
    this.loader.show();
    this.svc.agregarARotacion(this.proyectoNuevoId, this.responsableNuevoId).subscribe({
      next: () => {
        this.proyectoNuevoId = null;
        this.responsableNuevoId = null;
        this.responsablesNuevo = [];
        this.loader.hide();
        this.cargarRotacion();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  abrirCambiarResponsable(item: RotacionProyectoDTO): void {
    this.rotEditando = item;
    this.rotFormResponsableId = item.responsableWorkerId;
    this.rotResponsables = [];
    this.svc.getResponsablesDisponibles(item.proyectoId).subscribe({
      next: (res) => {
        this.rotResponsables = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  cerrarModalResponsable(): void {
    this.rotEditando = null;
    this.rotResponsables = [];
    this.cdr.markForCheck();
  }

  confirmarCambiarResponsable(): void {
    if (!this.rotEditando) return;
    this.rotGuardando = true;
    this.svc.setResponsable(this.rotEditando.id, this.rotFormResponsableId).subscribe({
      next: () => {
        this.rotGuardando = false;
        this.cerrarModalResponsable();
        this.cargarRotacion();
      },
      error: (err: HttpErrorResponse) => {
        this.rotGuardando = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleActivo(item: RotacionProyectoDTO): void {
    const nuevo = !item.activo;
    this.svc.setActivo(item.id, nuevo).subscribe({
      next: () => {
        item.activo = nuevo;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  mover(item: RotacionProyectoDTO, direccion: -1 | 1): void {
    const idx = this.rotacion.findIndex((r) => r.id === item.id);
    const otroIdx = idx + direccion;
    if (otroIdx < 0 || otroIdx >= this.rotacion.length) return;

    const otro = this.rotacion[otroIdx];
    const ordenA = item.orden;
    const ordenB = otro.orden;

    this.loader.show();
    this.svc
      .reordenar([
        { id: item.id, orden: ordenB },
        { id: otro.id, orden: ordenA },
      ])
      .subscribe({
        next: () => {
          item.orden = ordenB;
          otro.orden = ordenA;
          this.rotacion.sort((a, b) => a.orden - b.orden);
          this.loader.hide();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loader.hide();
          this.errorSvc.handleError(err);
        },
      });
  }

  // ── Calendario ────────────────────────────────────────────────────

  cargarCalendario(): void {
    this.loader.show();
    this.svc.getCalendario(this.rangoDesde, this.rangoHasta).subscribe({
      next: (res) => {
        this.calendario = res;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  abrirReasignar(item: ProgramacionInduccionDTO): void {
    this.editando = item;
    this.modoEdicion = 'reasignar';
    this.formProyectoId = item.proyectoId;
    this.formMotivo = '';
    this.cdr.markForCheck();
  }

  abrirReprogramar(item: ProgramacionInduccionDTO): void {
    this.editando = item;
    this.modoEdicion = 'reprogramar';
    this.formFecha = item.fecha;
    this.formMotivo = '';
    this.cdr.markForCheck();
  }

  cerrarModalEdicion(): void {
    this.editando = null;
    this.modoEdicion = null;
    this.cdr.markForCheck();
  }

  get todosLosProyectos(): { proyectoId: number; nombre: string }[] {
    // Para reasignar puede elegirse cualquier proyecto vigente, esté o no ya en la rotación.
    const porId = new Map<number, string>();
    for (const r of this.rotacion) porId.set(r.proyectoId, r.proyectoNombre);
    for (const p of this.proyectosDisponibles) porId.set(p.proyectoId, p.nombre);
    return Array.from(porId, ([proyectoId, nombre]) => ({ proyectoId, nombre })).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }

  confirmarEdicion(): void {
    if (!this.editando || !this.modoEdicion) return;
    this.guardandoEdicion = true;

    const obs =
      this.modoEdicion === 'reasignar'
        ? this.svc.reasignar(this.editando.id, this.formProyectoId!, this.formMotivo || undefined)
        : this.svc.reprogramar(this.editando.id, this.formFecha, this.formMotivo || undefined);

    obs.subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.cerrarModalEdicion();
        this.cargarCalendario();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoEdicion = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirCambiarResponsableCalendario(item: ProgramacionInduccionDTO): void {
    this.progEditando = item;
    this.progFormResponsableId = item.responsableWorkerId;
    this.progResponsables = [];
    this.svc.getResponsablesDisponibles(item.proyectoId).subscribe({
      next: (res) => {
        this.progResponsables = res;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
    });
  }

  cerrarModalResponsableCalendario(): void {
    this.progEditando = null;
    this.progResponsables = [];
    this.cdr.markForCheck();
  }

  confirmarCambiarResponsableCalendario(): void {
    if (!this.progEditando) return;
    this.progGuardando = true;
    this.svc.setProgramacionResponsable(this.progEditando.id, this.progFormResponsableId).subscribe({
      next: () => {
        this.progGuardando = false;
        this.cerrarModalResponsableCalendario();
        this.cargarCalendario();
      },
      error: (err: HttpErrorResponse) => {
        this.progGuardando = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(item: ProgramacionInduccionDTO): void {
    Swal.fire({
      icon: 'question',
      title: '¿Cancelar esta inducción?',
      text: `${item.proyectoNombre} — ${item.fecha}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.svc.cancelar(item.id).subscribe({
        next: () => this.cargarCalendario(),
        error: (err: HttpErrorResponse) => this.errorSvc.handleError(err),
      });
    });
  }
}
