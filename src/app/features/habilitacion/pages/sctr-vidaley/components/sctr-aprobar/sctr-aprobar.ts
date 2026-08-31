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
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SctrVidaLeyService } from '../../../../services/sctr-vidaley.service';
import { SctrVidaLeyDto, SctrWorkerDto } from '../../../../dtos/sctr.model';

@Component({
  selector: 'app-sctr-aprobar',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './sctr-aprobar.html',
  styleUrl: './sctr-aprobar.css',
})
export class SctrAprobar implements OnChanges {
  @Input() open = false;
  @Input() documento: SctrVidaLeyDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  workersState: { worker: SctrWorkerDto; aprobado: boolean }[] = [];
  observaciones = '';
  vigencia = '';
  saving = false;

  constructor(
    private sctrService: SctrVidaLeyService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private reset(): void {
    this.observaciones = this.documento?.obsAbril ?? '';
    this.vigencia = this.documento?.vigencia
      ? this.documento.vigencia.substring(0, 10)
      : '';
    const workers = this.documento?.workers ?? [];
    this.workersState = workers.map((w) => ({
      worker: w,
      aprobado: true,
    }));
  }

  toggleWorker(idx: number): void {
    this.workersState[idx].aprobado = !this.workersState[idx].aprobado;
  }

  toggleAll(checked: boolean): void {
    this.workersState = this.workersState.map((s) => ({ ...s, aprobado: checked }));
  }

  get allChecked(): boolean {
    return this.workersState.length > 0 && this.workersState.every((s) => s.aprobado);
  }

  get noneChecked(): boolean {
    return this.workersState.length > 0 && this.workersState.every((s) => !s.aprobado);
  }

  get totalAprobados(): number {
    return this.workersState.filter((s) => s.aprobado).length;
  }

  get totalRechazados(): number {
    return this.workersState.filter((s) => !s.aprobado).length;
  }

  get title(): string {
    if (!this.documento) return 'Aprobar documento';
    return `Aprobar ${this.documento.tipo} — ${this.documento.empresaNombre}`;
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.documento;
  }

  submit(): void {
    if (!this.canSubmit || !this.documento) return;

    const aprobados = this.workersState
      .filter((s) => s.aprobado)
      .map((s) => s.worker.workerId);
    const rechazados = this.workersState
      .filter((s) => !s.aprobado)
      .map((s) => s.worker.workerId);

    Swal.fire({
      icon: 'question',
      title: '¿Confirmar aprobación?',
      html: `<div style="text-align:left;font-size:0.9rem">
        <strong>${aprobados.length}</strong> aprobados · <strong>${rechazados.length}</strong> rechazados
      </div>`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed || !this.documento) return;

      this.saving = true;
      this.loaderService.show();

      this.sctrService
        .aprobar(this.documento.id, {
          workerIdsAprobados: aprobados,
          workerIdsRechazados: rechazados,
          obsAbril: this.observaciones || undefined,
          vigencia: this.vigencia || undefined,
        })
        .subscribe({
          next: () => {
            this.saving = false;
            this.loaderService.hide();
            Swal.fire({
              icon: 'success',
              title: 'Documento procesado',
              timer: 1500,
              showConfirmButton: false,
            });
            this.saved.emit();
          },
          error: (err: HttpErrorResponse) => {
            this.saving = false;
            this.loaderService.hide();
            this.errorService.handleError(err);
            this.cdr.detectChanges();
          },
        });
    });
  }

  close(): void {
    this.closed.emit();
  }
}
