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
  SupervisorAcDTO,
  UpdateActividadBody,
} from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

interface EditarActividadForm {
  nombre: string;
  tipo: string;
  etapaId: number | null;
  categoriaId: number | null;
  especialidadId: number | null;
  userId: number | null;
  userId2: number | null;
  inicioProgramado: string;
  finProgramado: string;
  diasHabiliesProg: number | null;
  inicioEfectivo: string;
  finEfectivo: string;
  diasHabilesEfect: number | null;
  observaciones: string;
}

@Component({
  selector: 'app-editar-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './editar-actividad.html',
  styleUrl: './editar-actividad.css',
})
export class EditarActividad implements OnChanges {
  @Input() open = false;
  @Input() actividad: ActividadListItemDTO | null = null;
  @Input() supervisores: SupervisorAcDTO[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ActividadListItemDTO>();

  readonly tipoOpciones = ['ENTREGABLE', 'HITO', 'CONSULTA'];

  etapas: AcEtapaDTO[] = [];
  categorias: AcCategoriaDTO[] = [];
  especialidades: AcEspecialidadDTO[] = [];
  loadingEtapas = false;
  saving = false;

  model: EditarActividadForm = this.empty();

  constructor(
    private service: ArquitecturaComercialService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.populateForm();
      this.loadEtapas();
    }
  }

  private empty(): EditarActividadForm {
    return {
      nombre: '',
      tipo: '',
      etapaId: null,
      categoriaId: null,
      especialidadId: null,
      userId: null,
      userId2: null,
      inicioProgramado: '',
      finProgramado: '',
      diasHabiliesProg: null,
      inicioEfectivo: '',
      finEfectivo: '',
      diasHabilesEfect: null,
      observaciones: '',
    };
  }

  private populateForm(): void {
    if (!this.actividad) return;
    const ini = this.actividad.inicioProgramado ?? '';
    const fin = this.actividad.finProgramado ?? '';
    const iniEf = this.actividad.inicioEfectivo ?? '';
    const finEf = this.actividad.finEfectivo ?? '';
    this.model = {
      nombre: this.actividad.nombre,
      tipo: this.actividad.partidaDeControl ?? '',
      etapaId: this.actividad.etapaId,
      categoriaId: this.actividad.categoriaId,
      especialidadId: this.actividad.especialidadId,
      userId: this.actividad.userId,
      userId2: this.actividad.userId2,
      inicioProgramado: ini,
      finProgramado: fin,
      diasHabiliesProg: ini && fin ? this.contarDiasHabiles(ini, fin) : null,
      inicioEfectivo: iniEf,
      finEfectivo: finEf,
      diasHabilesEfect: iniEf && finEf ? this.contarDiasHabiles(iniEf, finEf) : null,
      observaciones: this.actividad.observaciones ?? '',
    };
  }

  // --- helpers días hábiles ---

  private calcularFechaFin(inicioIso: string, dias: number): string {
    if (!inicioIso || dias <= 0) return '';
    const d = new Date(inicioIso + 'T00:00:00');
    let restantes = dias - 1; // el inicio ya cuenta como día 1
    while (restantes > 0) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) restantes--;
    }
    return this.toIso(d);
  }

  private contarDiasHabiles(inicioIso: string, finIso: string): number {
    const d = new Date(inicioIso + 'T00:00:00');
    const fin = new Date(finIso + 'T00:00:00');
    let count = 0;
    while (d <= fin) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  private toIso(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // --- handlers programado ---

  onInicioProgChange(): void {
    if (this.model.inicioProgramado && this.model.diasHabiliesProg) {
      this.model.finProgramado = this.calcularFechaFin(
        this.model.inicioProgramado,
        this.model.diasHabiliesProg,
      );
    } else if (this.model.inicioProgramado && this.model.finProgramado) {
      this.model.diasHabiliesProg = this.contarDiasHabiles(
        this.model.inicioProgramado,
        this.model.finProgramado,
      );
    }
  }

  onDiasProgChange(): void {
    if (this.model.inicioProgramado && this.model.diasHabiliesProg) {
      this.model.finProgramado = this.calcularFechaFin(
        this.model.inicioProgramado,
        this.model.diasHabiliesProg,
      );
    }
  }

  onFinProgChange(): void {
    if (this.model.inicioProgramado && this.model.finProgramado) {
      this.model.diasHabiliesProg = this.contarDiasHabiles(
        this.model.inicioProgramado,
        this.model.finProgramado,
      );
    }
  }

  // --- handlers efectivo ---

  onInicioEfectChange(): void {
    if (this.model.inicioEfectivo && this.model.diasHabilesEfect) {
      this.model.finEfectivo = this.calcularFechaFin(
        this.model.inicioEfectivo,
        this.model.diasHabilesEfect,
      );
    } else if (this.model.inicioEfectivo && this.model.finEfectivo) {
      this.model.diasHabilesEfect = this.contarDiasHabiles(
        this.model.inicioEfectivo,
        this.model.finEfectivo,
      );
    }
  }

  onDiasEfectChange(): void {
    if (this.model.inicioEfectivo && this.model.diasHabilesEfect) {
      this.model.finEfectivo = this.calcularFechaFin(
        this.model.inicioEfectivo,
        this.model.diasHabilesEfect,
      );
    }
  }

  onFinEfectChange(): void {
    if (this.model.inicioEfectivo && this.model.finEfectivo) {
      this.model.diasHabilesEfect = this.contarDiasHabiles(
        this.model.inicioEfectivo,
        this.model.finEfectivo,
      );
    }
  }

  private loadEtapas(): void {
    if (this.etapas.length === 0) {
      this.loadingEtapas = true;
      this.service.getEtapas().subscribe({
        next: data => { this.etapas = data; this.loadingEtapas = false; this.cdr.detectChanges(); },
        error: () => { this.loadingEtapas = false; this.cdr.detectChanges(); },
      });
    }
    if (this.categorias.length === 0) {
      this.service.getCategorias().subscribe({ next: d => { this.categorias = d; this.cdr.detectChanges(); } });
    }
    if (this.especialidades.length === 0) {
      this.service.getEspecialidades().subscribe({ next: d => { this.especialidades = d; this.cdr.detectChanges(); } });
    }
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.actividad && !!this.model.nombre.trim();
  }

  submit(): void {
    if (!this.canSubmit || !this.actividad) return;

    const body: UpdateActividadBody = {
      nombre: this.model.nombre.trim(),
      tipo: this.model.tipo || null,
      etapaId: this.model.etapaId,
      categoriaId: this.model.categoriaId,
      especialidadId: this.model.especialidadId,
      userId: this.model.userId,
      userId2: this.model.userId2,
      inicioProgramado: this.model.inicioProgramado || null,
      finProgramado: this.model.finProgramado || null,
      inicioEfectivo: this.model.inicioEfectivo || null,
      finEfectivo: this.model.finEfectivo || null,
      observaciones: this.model.observaciones.trim() || null,
    };

    this.saving = true;
    this.service.updateActividad(this.actividad.id, body).subscribe({
      next: updated => {
        this.saving = false;
        Swal.fire({ icon: 'success', title: 'Actividad actualizada', timer: 1500, showConfirmButton: false });
        this.saved.emit(updated);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message ?? 'No se pudo actualizar la actividad';
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
