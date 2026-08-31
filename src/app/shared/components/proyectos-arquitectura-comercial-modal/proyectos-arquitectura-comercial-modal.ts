import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../base-modal/base-modal';
import { SearchInput } from '../search-input/search-input';
import { ProjectService } from '../../../core/services/project.service';
import { ErrorService } from '../../../core/services/error.service';
import { ProjectGetDTO } from '../../../core/dtos/project/project.model';

/**
 * Activa/desactiva rápido qué proyectos aparecen en los selectores de
 * Arquitectura Comercial (Observaciones, etc.) sin ir al formulario completo
 * de edición de proyecto en Configuración.
 */
@Component({
  standalone: true,
  selector: 'app-proyectos-arquitectura-comercial-modal',
  imports: [BaseModal, CommonModule, FormsModule, SearchInput],
  templateUrl: './proyectos-arquitectura-comercial-modal.html',
})
export class ProyectosArquitecturaComercialModal implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  proyectos: ProjectGetDTO[] = [];
  loading = false;
  searchText = '';
  togglingId: number | null = null;

  constructor(
    private projectService: ProjectService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get proyectosFiltrados(): ProjectGetDTO[] {
    const term = this.searchText.trim().toLowerCase();
    const lista = term
      ? this.proyectos.filter((p) => p.projectDescription.toLowerCase().includes(term))
      : this.proyectos;
    return [...lista].sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
  }

  load(): void {
    this.loading = true;
    this.projectService.getProjectsPaged({ pageSize: 500 }).subscribe({
      next: (res) => {
        this.proyectos = res.data;
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

  toggle(p: ProjectGetDTO): void {
    if (this.togglingId === p.projectId) return;
    this.togglingId = p.projectId;
    this.projectService.toggleArquitecturaComercial(p.projectId).subscribe({
      next: (res) => {
        p.tieneArquitecturaComercial = res.tieneArquitecturaComercial;
        this.togglingId = null;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.togglingId = null;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  trackById(_: number, p: ProjectGetDTO): number {
    return p.projectId;
  }
}
