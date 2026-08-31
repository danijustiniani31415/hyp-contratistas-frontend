import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { CategoriaAdminDto } from '../../dtos/categorias-puestos.dto';

/**
 * Alta y edición de una categoría. El mismo componente cubre ambos casos: si llega
 * `categoria` edita ese registro, si no crea uno nuevo.
 */
@Component({
  standalone: true,
  selector: 'app-categoria-create-edit',
  imports: [CommonModule, FormsModule, BaseModal],
  templateUrl: './categoria-create-edit.html',
})
export class CategoriaCreateEdit implements OnInit {
  /** Categoría a editar; null/undefined = alta. */
  @Input() categoria: CategoriaAdminDto | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  submitted = false;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.nombre = this.categoria?.nombre ?? '';
  }

  get titulo(): string {
    return this.categoria ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA';
  }

  save(): void {
    this.submitted = true;
    const nombre = this.nombre.trim();
    if (!nombre) return;

    this.loaderService.show();
    const request$ = this.categoria
      ? this.service.actualizarCategoria(this.categoria.id, nombre)
      : this.service.crearCategoria(nombre);

    request$.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: this.categoria ? 'Categoría actualizada.' : 'Categoría creada.',
          icon: 'success',
          confirmButtonColor: '#64BC04',
        });
        this.saved.emit();
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
