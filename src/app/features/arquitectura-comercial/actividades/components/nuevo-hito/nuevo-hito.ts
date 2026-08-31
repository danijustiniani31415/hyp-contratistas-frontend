import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { ArquitecturaComercialService } from '../../../../../core/services/arquitectura-comercial.service';
import {
  AcEtapaDTO,
  ActividadListItemDTO,
  CreateActividadBody,
  SupervisorAcDTO,
} from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

interface NuevoHitoForm {
  etapaNombre: string;
  actividad: string;
  mes: string;
  correlativo: number | null;
  especialidadId: number | null;
  etapaId: number | null;
  inicioProgramado: string;
  finProgramado: string;
  userId: number | null;
}

@Component({
  selector: 'app-nuevo-hito',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './nuevo-hito.html',
  styleUrl: './nuevo-hito.css',
})
export class NuevoHito implements OnChanges {
  @Input() open = false;
  @Input() projectId: number | null = null;
  @Input() supervisores: SupervisorAcDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ActividadListItemDTO>();

  readonly POST_VENTA_NOMBRE = 'POST VENTA Y EXPERIENCIA';
  readonly etapasNombre = ['ETAPA 1', 'ETAPA 2', 'ETAPA 3', 'ETAPA 4'];
  readonly actividades = [
    'RUTEO DE SALA',
    'LEVANTAMIENTO DE OBS DE INSPECCIÓN',
    'INSPECCIÓN DE ALMACEN',
  ];
  readonly meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  ];
  readonly especialidades = [
    { id: 1, nombre: 'EJECUCIÓN' },
    { id: 2, nombre: 'CONTROL' },
  ];

  etapas: AcEtapaDTO[] = [];
  loadingEtapas = false;
  saving = false;
  nombrePersonalizado = false;
  nombreLibre = '';

  model: NuevoHitoForm = this.empty();

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      this.nombrePersonalizado = false;
      this.nombreLibre = '';
      this.loadEtapas();
    }
  }

  private empty(): NuevoHitoForm {
    return {
      etapaNombre: '',
      actividad: '',
      mes: '',
      correlativo: null,
      especialidadId: null,
      etapaId: null,
      inicioProgramado: '',
      finProgramado: '',
      userId: null,
    };
  }

  private loadEtapas(): void {
    if (this.etapas.length > 0) {
      this.applyDefaultEtapa();
      return;
    }
    this.loadingEtapas = true;
    this.service.getEtapas().subscribe({
      next: data => {
        this.etapas = data;
        this.applyDefaultEtapa();
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingEtapas = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyDefaultEtapa(): void {
    const postVenta = this.etapas.find(e => e.nombre === this.POST_VENTA_NOMBRE);
    if (postVenta) {
      this.model.etapaId = postVenta.id;
      this.nombrePersonalizado = false;
    }
  }

  get isPostVenta(): boolean {
    if (!this.model.etapaId) return false;
    return this.etapas.find(e => e.id === this.model.etapaId)?.nombre === this.POST_VENTA_NOMBRE;
  }

  onEtapaChange(): void {
    if (!this.isPostVenta) {
      this.model.actividad = '';
      this.model.mes = '';
      this.model.correlativo = null;
      this.nombrePersonalizado = false;
    }
  }

  get nombreCalculado(): string {
    const { etapaNombre, actividad, mes, correlativo } = this.model;
    if (!etapaNombre || !actividad || !mes || correlativo == null) return '';
    return `${etapaNombre}_${actividad}  (${mes}) ${correlativo.toString().padStart(2, '0')}`;
  }

  get canSubmit(): boolean {
    if (!this.projectId || this.saving) return false;
    const { etapaNombre, etapaId, especialidadId, inicioProgramado, userId } = this.model;
    if (!etapaNombre || !etapaId || !especialidadId || !inicioProgramado || !userId) return false;
    if (this.isPostVenta) {
      if (this.nombrePersonalizado) return !!this.nombreLibre.trim();
      const { actividad, mes, correlativo } = this.model;
      return !!actividad && !!mes && correlativo != null;
    }
    return !!this.nombreLibre.trim();
  }

  submit(): void {
    if (!this.canSubmit || !this.projectId) return;

    const nombre = this.isPostVenta && !this.nombrePersonalizado
      ? this.nombreCalculado
      : this.nombreLibre.trim();

    const body: CreateActividadBody = {
      nombre,
      tipo: 'HITO',
      projectId: this.projectId,
      etapaId: this.model.etapaId,
      categoriaId: 3,
      especialidadId: this.model.especialidadId,
      userId: this.model.userId,
      inicioProgramado: this.model.inicioProgramado || null,
      finProgramado: this.model.finProgramado || null,
    };

    this.saving = true;
    this.service.createActividad(body).subscribe({
      next: created => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Hito creado', timer: 1500, showConfirmButton: false });
        this.saved.emit(created);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'No se pudo crear el hito';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }

  trackByEtapa(_: number, e: AcEtapaDTO): number {
    return e.id;
  }

  trackBySupervisor(_: number, s: SupervisorAcDTO): number {
    return s.id;
  }
}
