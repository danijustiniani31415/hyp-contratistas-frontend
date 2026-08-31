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
  AcCategoriaDTO,
  AcEspecialidadDTO,
  AcEtapaDTO,
  ActividadListItemDTO,
  CreateActividadBody,
  SupervisorAcDTO,
} from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

interface NuevoEntregableForm {
  etapaNombre: string;
  reporte: string;
  categoriaId: number | null;
  especialidadId: number | null;
  etapaId: number | null;
  inicioProgramado: string;
  finProgramado: string;
  userId: number | null;
}

@Component({
  selector: 'app-nuevo-entregable',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './nuevo-entregable.html',
  styleUrl: './nuevo-entregable.css',
})
export class NuevoEntregable implements OnChanges {
  @Input() open = false;
  @Input() projectId: number | null = null;
  @Input() supervisores: SupervisorAcDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ActividadListItemDTO>();

  readonly POST_VENTA_NOMBRE = 'POST VENTA Y EXPERIENCIA';
  readonly etapasNombre = ['ETAPA 1', 'ETAPA 2', 'ETAPA 3', 'ETAPA 4'];
  readonly reportes = [
    'REPORTE DE LEVANTAMIENTO DE OBS MENSUAL',
    'REPORTE DE SATISFACCIÓN MENSUAL',
    'REPORTE DE OS - OC MENSUAL',
    'REPORTE DE ALMACENES MENSUAL',
    'REPORTE DE RECICLAJE MENSUAL',
  ];

  etapas: AcEtapaDTO[] = [];
  categorias: AcCategoriaDTO[] = [];
  especialidades: AcEspecialidadDTO[] = [];
  loadingEtapas = false;
  saving = false;
  nombrePersonalizado = false;
  nombreLibre = '';

  model: NuevoEntregableForm = this.empty();

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.model = this.empty();
      this.nombrePersonalizado = false;
      this.nombreLibre = '';
      this.loadCatalogos();
    }
  }

  private empty(): NuevoEntregableForm {
    return {
      etapaNombre: '',
      reporte: '',
      categoriaId: null,
      especialidadId: null,
      etapaId: null,
      inicioProgramado: '',
      finProgramado: '',
      userId: null,
    };
  }

  private loadCatalogos(): void {
    if (this.etapas.length === 0) {
      this.loadingEtapas = true;
      this.service.getEtapas().subscribe({
        next: data => {
          this.etapas = data;
          this.applyDefaultEtapa();
          this.loadingEtapas = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loadingEtapas = false; this.cdr.detectChanges(); },
      });
    } else {
      this.applyDefaultEtapa();
    }
    if (this.categorias.length === 0) {
      this.service.getCategorias().subscribe({ next: d => { this.categorias = d; this.cdr.detectChanges(); } });
    }
    if (this.especialidades.length === 0) {
      this.service.getEspecialidades().subscribe({ next: d => { this.especialidades = d; this.cdr.detectChanges(); } });
    }
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
      this.model.reporte = '';
      this.nombrePersonalizado = false;
    }
  }

  get nombreCalculado(): string {
    const { etapaNombre, reporte } = this.model;
    if (!etapaNombre || !reporte) return '';
    return `${etapaNombre}_${reporte}`;
  }

  get canSubmit(): boolean {
    if (!this.projectId || this.saving) return false;
    const { etapaNombre, etapaId, categoriaId, especialidadId, inicioProgramado, userId } = this.model;
    if (!etapaNombre || !etapaId || !categoriaId || !especialidadId || !inicioProgramado || !userId) return false;
    if (this.isPostVenta) {
      if (this.nombrePersonalizado) return !!this.nombreLibre.trim();
      return !!this.model.reporte;
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
      tipo: 'ENTREGABLE',
      projectId: this.projectId,
      etapaId: this.model.etapaId,
      categoriaId: this.model.categoriaId,
      especialidadId: this.model.especialidadId,
      userId: this.model.userId,
      inicioProgramado: this.model.inicioProgramado || null,
      finProgramado: this.model.finProgramado || null,
    };

    this.saving = true;
    this.service.createActividad(body).subscribe({
      next: created => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Entregable creado', timer: 1500, showConfirmButton: false });
        this.saved.emit(created);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'No se pudo crear el entregable';
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
