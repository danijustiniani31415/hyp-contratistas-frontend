import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { CategoriasPuestosService } from '../../services/categorias-puestos.service';
import { CategoriaAdminDto, PuestoAdminDto } from '../../dtos/categorias-puestos.dto';
import { AreaFlatOption } from '../../area-tree';

/**
 * Alta y edición de un puesto. El mismo componente cubre ambos casos: si llega
 * `puesto` edita ese registro, si no crea uno nuevo.
 */
@Component({
  standalone: true,
  selector: 'app-puesto-create-edit',
  imports: [CommonModule, FormsModule, BaseModal, SearchSelect],
  templateUrl: './puesto-create-edit.html',
})
export class PuestoCreateEdit implements OnInit {
  /** Puesto a editar; null/undefined = alta. */
  @Input() puesto: PuestoAdminDto | null = null;
  /** Categorías disponibles para asignar (ya vienen ordenadas del contenedor). */
  @Input() categorias: CategoriaAdminDto[] = [];
  /**
   * Áreas del árbol, aplanadas y con su ruta completa. La ruta hace falta porque el mismo
   * nombre de área existe en más de una rama y sin ella habría opciones idénticas.
   */
  @Input() areaOptions: AreaFlatOption[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  nombre = '';
  categoriaId: number | null = null;
  /** Área que puede pedir el puesto. Null es válido: los puestos de obra no tienen ninguna. */
  areaSolicitanteScopeId: number | null = null;
  /** Área a la que entra el postulante. Null = se cae al área del solicitante. */
  areaDestinoScopeId: number | null = null;
  submitted = false;

  constructor(
    private service: CategoriasPuestosService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.nombre = this.puesto?.nombre ?? '';
    this.categoriaId = this.puesto?.categoriaId ?? null;
    this.areaSolicitanteScopeId = this.puesto?.areaSolicitanteScopeId ?? null;
    this.areaDestinoScopeId = this.puesto?.areaDestinoScopeId ?? null;
  }

  get titulo(): string {
    return this.puesto ? 'EDITAR PUESTO' : 'NUEVO PUESTO';
  }

  /**
   * Al elegir quién pide el puesto se propone esa misma área como destino, que es el caso de
   * la enorme mayoría (de 112 puestos mapeados, solo 6 difieren). Solo se propone mientras el
   * destino esté vacío: si ya eligieron uno distinto, no se pisa.
   */
  onSolicitanteChange(areaScopeId: number | null): void {
    this.areaSolicitanteScopeId = areaScopeId;
    if (this.areaDestinoScopeId === null) this.areaDestinoScopeId = areaScopeId;
  }

  save(): void {
    this.submitted = true;
    const nombre = this.nombre.trim();
    // La categoría es obligatoria: es de acá de donde sale la categoría de cada trabajador
    // que tenga este puesto, y un puesto sin ella dejaría a esas fichas fuera de todo filtro
    // y de toda regla.
    if (!nombre || this.categoriaId == null) return;

    this.loaderService.show();
    // Sin área es un envío válido, no un campo vacío: los puestos de obra no tienen ninguna.
    const req = {
      nombre,
      categoriaId: this.categoriaId,
      areaSolicitanteScopeId: this.areaSolicitanteScopeId,
      areaDestinoScopeId: this.areaDestinoScopeId,
    };
    const request$ = this.puesto
      ? this.service.actualizarPuesto(this.puesto.id, req)
      : this.service.crearPuesto(req);

    request$.subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: this.puesto ? 'Puesto actualizado.' : 'Puesto creado.',
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
