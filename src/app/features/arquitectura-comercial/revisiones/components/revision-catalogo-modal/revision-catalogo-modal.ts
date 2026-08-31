import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { RevisionesService } from '../../../../../core/services/arquitectura-comercial/revisiones.service';
import { CatalogoService } from '../../../../../core/services/arquitectura-comercial/catalogo.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { ProyectoRevisionFiltroDTO, RevisionDTO, TIPOS_REVISION } from '../../../../../core/dtos/arquitectura-comercial/revisiones.model';

/** Popup "Agrega las revisiones que requieras" — arma el catálogo de revisiones
 * (Proyecto + Tipo + Lugar → nombre autogenerado) que después alimenta el
 * combobox "Revisión" al reportar una observación. Réplica del flujo de la app
 * legacy en Power Apps. */
@Component({
  standalone: true,
  selector: 'app-revision-catalogo-modal',
  imports: [BaseModal, SearchSelect, CommonModule, FormsModule],
  templateUrl: './revision-catalogo-modal.html',
  styleUrl: './revision-catalogo-modal.css',
})
export class RevisionCatalogoModal implements OnInit {
  @Input() proyectos: ProyectoRevisionFiltroDTO[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly tiposRevisionOptions = TIPOS_REVISION.map((t) => ({ value: t, label: t }));

  proyectoId: number | null = null;
  tipo: string | null = null;
  lugar: string | null = null;
  otroLugar = false;
  lugarManual = '';

  lugares: { value: string; label: string }[] = [];
  revisiones: RevisionDTO[] = [];
  loading = false;
  guardando = false;

  get puedeGuardar(): boolean {
    const lugarValido = this.otroLugar ? !!this.lugarManual.trim() : !!this.lugar;
    return !!this.proyectoId && !!this.tipo && lugarValido;
  }

  constructor(
    private service: RevisionesService,
    private catalogoService: CatalogoService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.catalogoService.getItems('lugares-revision').subscribe({
      next: (items) => {
        this.lugares = items.map((i) => ({ value: i.nombre, label: i.nombre }));
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
    this.load();
  }

  toggleOtroLugar(): void {
    this.otroLugar = !this.otroLugar;
    this.lugar = null;
    this.lugarManual = '';
  }

  load(): void {
    this.loading = true;
    this.service.getCatalogo(this.proyectoId).subscribe({
      next: (data) => {
        this.revisiones = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    this.load();
  }

  guardar(): void {
    if (!this.puedeGuardar || this.guardando) return;
    const lugar = this.otroLugar ? this.lugarManual.trim() : (this.lugar ?? '');

    this.guardando = true;
    this.service.crearRevision({ proyectoId: this.proyectoId!, tipo: this.tipo!, lugar }).subscribe({
      next: (revision) => {
        this.revisiones = [revision, ...this.revisiones];
        this.guardando = false;
        this.tipo = null;
        this.lugar = null;
        this.lugarManual = '';
        this.otroLugar = false;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  eliminar(revision: RevisionDTO): void {
    Swal.fire({
      title: `¿Eliminar "${revision.nombre}"?`,
      text: 'Se eliminarán también las observaciones reportadas dentro de esta revisión.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.service.eliminarRevision(revision.id).subscribe({
        next: () => {
          this.revisiones = this.revisiones.filter((r) => r.id !== revision.id);
          this.saved.emit();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
          this.cdr.markForCheck();
        },
      });
    });
  }
}
