import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { DatePicker } from '../../../../../shared/components/date-picker/date-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ActasReunionService } from '../../services/actas-reunion.service';
import { ConvocatoriaMasiva } from '../convocatoria-masiva/convocatoria-masiva';
import {
  CatalogoDTO,
  ProyectoFiltroDTO,
  ReunionAcuerdoDTO,
  TrabajadorAbrilDTO,
} from '../../dtos/actas-reunion.dto';

interface ResponsableRow {
  workerId: number;
  nombre: string;
}

export const CRITICIDADES = [
  { id: 'NORMAL', descripcion: 'Normal' },
  { id: 'MEDIO', descripcion: 'Medio' },
  { id: 'CRITICO', descripcion: 'Crítico' },
];

@Component({
  selector: 'app-acuerdo-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DatePicker, SearchSelect, ConvocatoriaMasiva],
  templateUrl: './acuerdo-form.html',
})
export class AcuerdoForm implements OnInit {
  @Input({ required: true }) reunionId!: number;
  /** Trabajadores de toda la organización: un responsable no necesita haber asistido a la reunión. */
  @Input() trabajadores: TrabajadorAbrilDTO[] = [];
  @Input() estados: CatalogoDTO[] = [];
  /** Para el filtro "Staff de un proyecto" del modal de agregar responsables por área/puesto. */
  @Input() proyectos: ProyectoFiltroDTO[] = [];
  /** Null = crear un acuerdo nuevo; con valor = editar. */
  @Input() acuerdo: ReunionAcuerdoDTO | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  descripcion = '';
  fechaProgramada: string | null = null;
  fechaReprogramacion: string | null = null;
  fechaCumplimiento: string | null = null;
  estadoId: number | null = null;
  criticidad = 'NORMAL';
  criticidades = CRITICIDADES;
  requiereAceptacion = false;
  requiereEvidencia = false;
  esInformativo = false;
  evidenciaUrl: string | null = null;
  evidenciaNombre: string | null = null;
  subiendoEvidencia = false;
  responsables: ResponsableRow[] = [];
  responsablePrincipalWorkerId: number | null = null;
  nuevoResponsableId: number | null = null;
  showConvocatoriaMasivaModal = false;

  constructor(
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  get esEdicion(): boolean {
    return this.acuerdo != null;
  }

  ngOnInit(): void {
    if (this.acuerdo) {
      // "Acciones" se fusiona en la descripción (eran dos campos redundantes); si el acuerdo
      // venía con acciones de antes de la fusión, se anexan para no perder esa información.
      this.descripcion = this.acuerdo.acciones
        ? `${this.acuerdo.descripcion}\n\n${this.acuerdo.acciones}`
        : this.acuerdo.descripcion;
      this.fechaProgramada = this.acuerdo.fechaProgramada;
      this.fechaReprogramacion = this.acuerdo.fechaReprogramacion;
      this.fechaCumplimiento = this.acuerdo.fechaCumplimiento;
      this.estadoId = this.acuerdo.reunionAcuerdoEstadoId;
      this.criticidad = this.acuerdo.criticidad;
      this.requiereAceptacion = this.acuerdo.requiereAceptacion;
      this.requiereEvidencia = this.acuerdo.requiereEvidencia;
      this.esInformativo = this.acuerdo.esInformativo;
      this.evidenciaUrl = this.acuerdo.evidenciaUrl;
      this.evidenciaNombre = this.evidenciaUrl ? decodeURIComponent(this.evidenciaUrl.split('/').pop() ?? '') : null;
      this.responsables = this.acuerdo.responsables.map((r) => ({
        workerId: r.workerId,
        nombre: r.workerNombre,
      }));
      this.responsablePrincipalWorkerId = this.acuerdo.responsables.find((r) => r.esPrincipal)?.workerId ?? null;
    }
  }

  /** Un informativo no requiere seguimiento: no tiene sentido pedir aceptación ni evidencia. */
  onEsInformativoChange(): void {
    if (this.esInformativo) {
      this.requiereAceptacion = false;
      this.requiereEvidencia = false;
    }
  }

  /** Trabajadores que aún no están agregados como responsables. */
  get opcionesResponsable(): TrabajadorAbrilDTO[] {
    const yaAgregados = new Set(this.responsables.map((r) => r.workerId));
    return this.trabajadores.filter((t) => !yaAgregados.has(t.workerId));
  }

  /** Se agrega directo al elegirlo del buscador, sin un paso de "Agregar" aparte. */
  seleccionarResponsable(workerId: number | null): void {
    if (workerId == null) return;
    const trabajador = this.trabajadores.find((t) => t.workerId === workerId);
    if (!trabajador) return;
    this.responsables.push({ workerId: trabajador.workerId, nombre: trabajador.fullName });
    this.nuevoResponsableId = null;
  }

  /** Sube el archivo de evidencia como un adjunto más de la reunión (mismo mecanismo que "Archivos
   * adjuntos" del acta) y usa su URL como evidencia de este acuerdo. */
  onEvidenciaSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoEvidencia = true;
    this.service.subirArchivos(this.reunionId, [file]).subscribe({
      next: (res) => {
        this.subiendoEvidencia = false;
        const archivo = res.archivos[0];
        this.evidenciaUrl = archivo.archivoUrl;
        this.evidenciaNombre = archivo.originalFileName;
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoEvidencia = false;
        this.errorService.handleError(err);
      },
    });
    input.value = '';
  }

  quitarEvidencia(): void {
    this.evidenciaUrl = null;
    this.evidenciaNombre = null;
  }

  removerResponsable(workerId: number): void {
    this.responsables = this.responsables.filter((r) => r.workerId !== workerId);
    if (this.responsablePrincipalWorkerId === workerId) this.responsablePrincipalWorkerId = null;
  }

  /** Agrega en bloque los trabajadores elegidos por área/puesto/proyecto (ej. "todas las jefaturas
   * de proyectos" o "todo el staff de un proyecto"), sin duplicar a quienes ya están agregados. */
  onTrabajadoresAgregadosMasivamente(trabajadores: TrabajadorAbrilDTO[]): void {
    const yaAgregados = new Set(this.responsables.map((r) => r.workerId));
    for (const t of trabajadores) {
      if (yaAgregados.has(t.workerId)) continue;
      yaAgregados.add(t.workerId);
      this.responsables.push({ workerId: t.workerId, nombre: t.fullName });
    }
    this.showConvocatoriaMasivaModal = false;
  }

  submit(): void {
    if (!this.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'La descripción del acuerdo es obligatoria.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }

    const request = {
      descripcion: this.descripcion.trim(),
      acciones: null,
      fechaProgramada: this.fechaProgramada,
      fechaReprogramacion: this.fechaReprogramacion,
      fechaCumplimiento: this.fechaCumplimiento,
      reunionAcuerdoEstadoId: this.estadoId,
      criticidad: this.criticidad,
      requiereAceptacion: this.requiereAceptacion,
      requiereEvidencia: this.requiereEvidencia,
      evidenciaUrl: this.evidenciaUrl,
      esInformativo: this.esInformativo,
      responsableWorkerIds: this.responsables.map((r) => r.workerId),
      responsablePrincipalWorkerId: this.responsables.length > 1 ? this.responsablePrincipalWorkerId : null,
    };

    this.loaderService.show();
    const obs = this.esEdicion
      ? this.service.actualizarAcuerdo(this.acuerdo!.reunionAcuerdoId, request)
      : this.service.crearAcuerdo(this.reunionId, request);

    obs.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.esEdicion ? '¡Acuerdo actualizado!' : '¡Acuerdo registrado!',
          confirmButtonColor: 'var(--color-abril-primary)',
        });
        this.saved.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
