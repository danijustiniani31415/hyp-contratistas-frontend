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
import { ReglasService } from '../../../../services/reglas.service';
import { CatalogosHabService } from '../../../../services/catalogos-hab.service';
import { ReglaDto, SsItemTrabajadorDto } from '../../../../dtos/catalogos.model';

@Component({
  selector: 'app-regla-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './regla-form.html',
  styleUrl: './regla-form.css',
})
export class ReglaForm implements OnChanges {
  @Input() open = false;
  @Input() regla: ReglaDto | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  items: SsItemTrabajadorDto[] = [];

  model: Partial<ReglaDto> = this.empty();
  saving = false;

  tipoOptions = [
    { id: '', label: 'Todos' },
    { id: 'CONTRATISTA', label: 'Contratista' },
    { id: 'CASA', label: 'Casa' },
  ];

  constructor(
    private reglasService: ReglasService,
    private catalogosService: CatalogosHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
      this.loadItems();
    }
  }

  private empty(): Partial<ReglaDto> {
    return {
      itemId: undefined,
      categoriaId: undefined,
      tipoTrabajador: '',
      requerido: true,
      evaluadorRol: '',
      nota: '',
      activo: true,
    };
  }

  private reset(): void {
    if (!this.regla) {
      this.model = this.empty();
      return;
    }
    this.model = {
      itemId: this.regla.itemId,
      categoriaId: this.regla.categoriaId,
      tipoTrabajador: this.regla.tipoTrabajador ?? '',
      requerido: this.regla.requerido,
      evaluadorRol: this.regla.evaluadorRol ?? '',
      nota: this.regla.nota ?? '',
      activo: this.regla.activo,
    };
  }

  private loadItems(): void {
    this.catalogosService.getItemsTrabajador().subscribe({
      next: (res) => {
        this.items = (res ?? []).filter((i) => i.activo !== false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.items = [];
      },
    });
  }

  get title(): string {
    return this.regla ? 'Editar regla' : 'Nueva regla';
  }

  get isEdit(): boolean {
    return !!this.regla;
  }

  get canSubmit(): boolean {
    return !this.saving && !!this.model.itemId;
  }

  submit(): void {
    if (!this.canSubmit) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Selecciona el entregable.',
      });
      return;
    }

    const payload: Partial<ReglaDto> = {
      itemId: this.model.itemId,
      categoriaId: this.model.categoriaId ?? undefined,
      tipoTrabajador: this.model.tipoTrabajador?.trim() || undefined,
      requerido: !!this.model.requerido,
      evaluadorRol: this.model.evaluadorRol?.trim() || undefined,
      nota: this.model.nota?.trim() || undefined,
      activo: !!this.model.activo,
    };

    this.saving = true;
    this.loaderService.show();

    const req$ = this.isEdit && this.regla
      ? this.reglasService.update(this.regla.id, payload)
      : this.reglasService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: this.isEdit ? 'Regla actualizada' : 'Regla creada',
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
