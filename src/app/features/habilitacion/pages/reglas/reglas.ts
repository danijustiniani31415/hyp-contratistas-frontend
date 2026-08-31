import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ReglasService } from '../../services/reglas.service';
import { ReglaDto } from '../../dtos/catalogos.model';
import { ReglaForm } from './components/regla-form/regla-form';

@Component({
  selector: 'app-hab-reglas',
  standalone: true,
  imports: [CommonModule, FormsModule, ReglaForm],
  templateUrl: './reglas.html',
  styleUrl: './reglas.css',
})
export class Reglas implements OnInit {
  reglas: ReglaDto[] = [];
  loading = false;
  search = '';

  modalOpen = false;
  reglaEnEdicion: ReglaDto | null = null;

  constructor(
    private reglasService: ReglasService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.reglasService.getReglas().subscribe({
      next: (res) => {
        this.reglas = res ?? [];
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get reglasFiltradas(): ReglaDto[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.reglas;
    return this.reglas.filter((r) =>
      [r.nombreItem, r.tipoTrabajador, r.evaluadorRol, r.nota]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(term)),
    );
  }

  abrirNueva(): void {
    this.reglaEnEdicion = null;
    this.modalOpen = true;
  }

  abrirEditar(r: ReglaDto): void {
    this.reglaEnEdicion = r;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.reglaEnEdicion = null;
  }

  onSaved(): void {
    this.modalOpen = false;
    this.reglaEnEdicion = null;
    this.load();
  }

  eliminar(r: ReglaDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar regla?',
      text: r.nombreItem ?? `Regla #${r.id}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.reglasService.delete(r.id).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({
            icon: 'success',
            title: 'Regla eliminada',
            timer: 1500,
            showConfirmButton: false,
          });
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }
}
