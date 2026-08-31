import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../base-modal/base-modal';
import { CatalogoService } from '../../../core/services/arquitectura-comercial/catalogo.service';
import { ErrorService } from '../../../core/services/error.service';
import { CatalogoItemDTO, CatalogoTipo } from '../../../core/dtos/arquitectura-comercial/catalogo.model';

interface CatalogoTab {
  tipo: CatalogoTipo;
  label: string;
}

/**
 * Modal genérico para administrar los catálogos de Observaciones (Partida,
 * Área Responsable) — mismo shape (nombre + activo), una sola UI reusada para
 * ambos en vez de duplicar el CRUD por catálogo.
 */
@Component({
  standalone: true,
  selector: 'app-catalogo-modal',
  imports: [BaseModal, CommonModule, FormsModule],
  templateUrl: './catalogo-modal.html',
})
export class CatalogoModal implements OnInit {
  @Input() tipoInicial: CatalogoTipo = 'partidas';
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly tabs: CatalogoTab[] = [
    { tipo: 'partidas', label: 'Partidas' },
    { tipo: 'areas-responsables', label: 'Áreas responsables' },
    { tipo: 'lugares-revision', label: 'Lugar a revisar' },
  ];

  tipoActivo: CatalogoTipo = 'partidas';
  items: CatalogoItemDTO[] = [];
  loading = false;
  nuevoNombre = '';
  guardandoNuevo = false;
  editandoId: number | null = null;
  editandoNombre = '';

  constructor(
    private service: CatalogoService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tipoActivo = this.tipoInicial;
    this.load();
  }

  cambiarTab(tipo: CatalogoTipo): void {
    if (this.tipoActivo === tipo) return;
    this.tipoActivo = tipo;
    this.editandoId = null;
    this.nuevoNombre = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getItems(this.tipoActivo, false).subscribe({
      next: (items) => {
        this.items = items;
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

  agregar(): void {
    const nombre = this.nuevoNombre.trim();
    if (!nombre || this.guardandoNuevo) return;
    this.guardandoNuevo = true;
    this.service.crear(this.tipoActivo, { nombre }).subscribe({
      next: (item) => {
        this.items.push(item);
        this.nuevoNombre = '';
        this.guardandoNuevo = false;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoNuevo = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  editar(item: CatalogoItemDTO): void {
    this.editandoId = item.id;
    this.editandoNombre = item.nombre;
  }

  cancelarEdicion(): void {
    this.editandoId = null;
  }

  guardarEdicion(item: CatalogoItemDTO): void {
    const nombre = this.editandoNombre.trim();
    if (!nombre) return;
    this.service.actualizar(item.id, { nombre, activo: item.activo }).subscribe({
      next: (actualizado) => {
        item.nombre = actualizado.nombre;
        this.editandoId = null;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  toggleActivo(item: CatalogoItemDTO): void {
    const nuevoActivo = !item.activo;
    this.service.actualizar(item.id, { nombre: item.nombre, activo: nuevoActivo }).subscribe({
      next: () => {
        item.activo = nuevoActivo;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  eliminar(item: CatalogoItemDTO): void {
    Swal.fire({
      title: `¿Eliminar "${item.nombre}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.service.eliminar(item.id).subscribe({
        next: () => {
          this.items = this.items.filter((i) => i.id !== item.id);
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
