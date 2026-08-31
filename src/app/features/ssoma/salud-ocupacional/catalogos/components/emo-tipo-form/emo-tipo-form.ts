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
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { EmoTipoDto, EmoTipoUpsertDto } from '../../../dtos/catalogos.model';

@Component({
  selector: 'app-emo-tipo-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, SearchSelect],
  templateUrl: './emo-tipo-form.html',
  styleUrl: './emo-tipo-form.css',
})
export class EmoTipoForm implements OnChanges {
  @Input() open = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initial: EmoTipoDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  model: EmoTipoUpsertDto = this.empty();
  saving = false;

  readonly siNoOpts = [
    { id: false, label: 'No' },
    { id: true, label: 'Sí' },
  ];
  readonly estadoOpts = [
    { id: true, label: 'Activo' },
    { id: false, label: 'Inactivo' },
  ];

  constructor(
    private service: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  private empty(): EmoTipoUpsertDto {
    return {
      nombre: '',
      vigenciaMeses: 12,
      requiereNuevo: false,
      descripcion: '',
      activo: true,
    };
  }

  private reset(): void {
    if (this.mode === 'edit' && this.initial) {
      this.model = {
        nombre: this.initial.nombre,
        vigenciaMeses: this.initial.vigenciaMeses,
        requiereNuevo: this.initial.requiereNuevo,
        descripcion: this.initial.descripcion ?? '',
        activo: this.initial.activo ?? true,
      };
    } else {
      this.model = this.empty();
    }
  }

  get title(): string {
    return this.mode === 'edit' ? 'Editar tipo de EMO' : 'Nuevo tipo de EMO';
  }

  get canSubmit(): boolean {
    const meses = Number(this.model.vigenciaMeses);
    return !!this.model.nombre.trim() && Number.isFinite(meses) && meses >= 0 && !this.saving;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Completa nombre y vigencia (≥ 0).',
      });
      return;
    }
    const payload: EmoTipoUpsertDto = {
      nombre: this.model.nombre.trim(),
      vigenciaMeses: Number(this.model.vigenciaMeses),
      requiereNuevo: !!this.model.requiereNuevo,
      descripcion: this.model.descripcion?.toString().trim() || null,
      activo: this.model.activo ?? true,
    };

    this.saving = true;
    this.loaderService.show();
    const req$ =
      this.mode === 'edit' && this.initial
        ? this.service.updateEmoTipo(this.initial.id, payload)
        : this.service.createEmoTipo(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.mode === 'edit' ? 'Tipo actualizado' : 'Tipo creado',
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
  }

  close(): void {
    this.closed.emit();
  }
}
