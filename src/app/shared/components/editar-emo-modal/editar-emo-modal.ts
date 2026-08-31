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
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../base-modal/base-modal';
import { EmoService } from '../../../features/ssoma/salud-ocupacional/services/emo.service';
import { CatalogosSaludService } from '../../../features/ssoma/salud-ocupacional/services/catalogos-salud.service';
import { EmoPorTrabajadorDto, EmoCreateDto } from '../../../features/ssoma/salud-ocupacional/dtos/emo.model';
import {
  ClinicaSimpleDto,
  EmoTipoDto,
  MedicoSimpleDto,
} from '../../../features/ssoma/salud-ocupacional/dtos/catalogos.model';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

@Component({
  selector: 'app-editar-emo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './editar-emo-modal.html',
  styleUrl: './editar-emo-modal.css',
})
export class EditarEmoModal implements OnChanges {
  @Input() open = false;
  @Input() emo: EmoPorTrabajadorDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  emoTipos: EmoTipoDto[] = [];
  clinicas: ClinicaSimpleDto[] = [];
  medicos: MedicoSimpleDto[] = [];
  medicosFiltrados: MedicoSimpleDto[] = [];

  fechaEmo = '';
  tipoEmoId: number | null = null;
  aptitud = '';
  clinicaId: number | null = null;
  medicoId: number | null = null;
  notas = '';
  /** true = la lectura la hace el médico de Abril, no la clínica. */
  requiereLecturaAbril = false;
  saving = false;

  readonly aptitudOpciones = ['Apto', 'Apto con Restricciones', 'No Apto', 'Observado', 'Pendiente'];

  constructor(
    private emoService: EmoService,
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.emo) {
      this.loadCatalogs();
    }
  }

  private loadCatalogs(): void {
    this.catalogos.getEmoTipos().subscribe(list => {
      this.emoTipos = list;
      this.preFill();
      this.cdr.detectChanges();
    });
    this.catalogos.getClinicas().subscribe(list => {
      this.clinicas = list.filter(c => c.activo);
      this.cdr.detectChanges();
    });
    this.catalogos.getMedicos().subscribe(list => {
      this.medicos = list.filter(m => m.activo);
      this.medicosFiltrados = this.medicos;
      this.cdr.detectChanges();
    });
  }

  private preFill(): void {
    if (!this.emo) return;
    this.fechaEmo = this.emo.fechaEmo ?? '';
    this.aptitud = this.emo.aptitud ?? '';
    this.clinicaId = null;
    this.medicoId = null;
    this.notas = '';
    this.requiereLecturaAbril = this.emo.requiereLecturaAbril ?? false;
    const match = this.emoTipos.find(t => t.nombre === this.emo!.tipoEmo);
    this.tipoEmoId = match?.id ?? null;
  }

  onClinicaChange(): void {
    this.medicoId = null;
    this.medicosFiltrados = this.clinicaId
      ? this.medicos.filter(m => m.clinicaId === this.clinicaId)
      : this.medicos;
  }

  get modalTitle(): string {
    return this.emo?.emoId ? 'Editar EMO' : 'Registrar EMO';
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.emo && !!this.fechaEmo && !!this.tipoEmoId && !!this.aptitud;
  }

  submit(): void {
    if (!this.canSubmit || !this.emo) return;
    this.saving = true;
    this.loaderService.show();

    if (this.emo.emoId) {
      const dto: Partial<EmoCreateDto> = {
        fechaEmo: this.fechaEmo,
        tipoEmoId: this.tipoEmoId!,
        aptitud: this.aptitud,
        requiereLecturaAbril: this.requiereLecturaAbril,
        ...(this.clinicaId != null && { clinicaId: this.clinicaId }),
        ...(this.medicoId != null && { medicoId: this.medicoId }),
        ...(this.notas && { notas: this.notas }),
      };
      this.emoService.updateEmo(this.emo.emoId, dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'EMO actualizado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    } else {
      const dto: EmoCreateDto = {
        workerId: this.emo.workerId,
        tipoEmoId: this.tipoEmoId!,
        fechaEmo: this.fechaEmo,
        aptitud: this.aptitud,
        requiereInterconsulta: false,
        requiereLecturaAbril: this.requiereLecturaAbril,
        examenes: [],
        restricciones: [],
        ...(this.clinicaId != null && { clinicaId: this.clinicaId }),
        ...(this.medicoId != null && { medicoId: this.medicoId }),
        ...(this.notas && { notas: this.notas }),
      };
      this.emoService.createEmo(dto).subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'EMO registrado', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
