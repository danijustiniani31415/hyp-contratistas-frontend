import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ScopeService, ScopeTemplateDTO, ScopeTemplateCreateDTO } from '../../scope/scope.service';
import { TemplateEdit } from './template-edit/template-edit';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateEdit, BaseModal],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates implements OnInit {
  templates: ScopeTemplateDTO[] = [];
  showCreateModal = false;
  newTemplateName = '';

  selectedTemplate: ScopeTemplateDTO | null = null;
  showEditModal = false;

  constructor(
    private scopeService: ScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loaderService.show();
    this.scopeService.getTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openCreateModal(): void {
    this.newTemplateName = '';
    this.showCreateModal = true;
  }

  create(): void {
    if (!this.newTemplateName.trim()) {
      Swal.fire({ icon: 'error', title: 'Campo requerido', text: 'Ingrese un nombre para la plantilla.' });
      return;
    }
    this.loaderService.show();
    const dto: ScopeTemplateCreateDTO = {
      templateName: this.newTemplateName.trim(),
      items: [],
    };
    this.scopeService.createTemplate(dto).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadTemplates();
        Swal.fire({ title: 'Plantilla creada', icon: 'success', draggable: true });
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  openEditModal(template: ScopeTemplateDTO): void {
    this.selectedTemplate = template;
    this.showEditModal = true;
  }

  delete(template: ScopeTemplateDTO, event: MouseEvent): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Estás seguro/a?',
      text: `Se eliminará la plantilla "${template.templateName}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#64BC04',
      cancelButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: '¡Sí, elimínalo!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loaderService.show();
        this.scopeService.deleteTemplate(template.scopeTemplateId).subscribe({
          next: () => {
            this.loadTemplates();
            Swal.fire({ title: '¡Eliminada!', icon: 'success', confirmButtonColor: '#64BC04' });
          },
          error: (err: HttpErrorResponse) => this.errorService.handleError(err),
        });
      }
    });
  }
}
