import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ConstructionLogbookControlService } from '../../../core/services/constructionLogbookControl.service';
import { forkJoin, scheduled } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ApiMessageDTO } from '../../../core/dtos/api/ApiMessage.model';
import { TableComponentData } from '../../../core/models/constructionLogbookControl/tableComponentData.model';
import { ProjectResidentService } from '../../../core/services/projectResident.service';
import { CreateModalData } from '../../../core/models/constructionLogbookControl/createModalData.model';
import { DomSanitizer } from '@angular/platform-browser';
import { FilePreview } from '../../../shared/components/file-preview/file-preview';
import { AbrilPageHeaderComponent } from '../../../shared/components/abril-page-header/abril-page-header.component';

import { PROJECTS_TABS } from '../shared/projects-tabs';
@Component({
  selector: 'app-construction-logbook-control',
  imports: [CommonModule, FormsModule, FilePreview, AbrilPageHeaderComponent],
  standalone: true,
  templateUrl: './construction-logbook-control.html',
  styleUrl: './construction-logbook-control.css',
})
export class ConstructionLogbookControl {
  readonly tabs = PROJECTS_TABS;
  anioActual = new Date().getFullYear();

  tableComponentData: TableComponentData = {
    tableData: [],
    iframeUrl: null,
    filters: {
      projects: [],
      residents: [],
      periods: [],
    },
    selectedFilters: {
      periodDate: '',
      userId: 0,
      projectId: 0,
      page: 1,
    },
  };

  createModalData: CreateModalData = {
    projectOptions: [],
    createDto: {
      projectId: 0,
      pdfs: [],
      periodDate: '',
    },
    selectedFiles: [],
    showImageAdder: true,
    periodOptions: [],
  };

  currentPage = 1;
  totalPages = 0;
  pageSize = 10;
  totalRecords = 0;

  loader = false;

  showCreateModal = false;
  showEditModal = false;

  constructor(
    private constructionLogbookControlService: ConstructionLogbookControlService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private projectResidentService: ProjectResidentService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.generatePeriodOptions();
  }

  loadInitialData(page: number = 1) {
    this.loader = true;
    forkJoin({
      constructionLogbooks: this.constructionLogbookControlService.getConstructionLogbookControlPaged(this.tableComponentData.selectedFilters),
      filters: this.constructionLogbookControlService.getFiltersData(),
    }).subscribe({
      next: ({ constructionLogbooks, filters }) => {
        this.tableComponentData.tableData = constructionLogbooks.data;
        this.tableComponentData.filters = filters;
        this.currentPage = constructionLogbooks.page;
        this.totalPages = constructionLogbooks.totalPages;
        this.pageSize = constructionLogbooks.pageSize;
        this.totalRecords = constructionLogbooks.totalRecords;
        this.loader = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCreateFilters() {
    this.loader = true;
    this.projectResidentService.getWithResidentByUserId().subscribe({
      next: (data) => {
        this.createModalData.projectOptions = data;
        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  openCreateModal(event: MouseEvent) {
    event.stopPropagation();
    this.showCreateModal = true;
    this.loadCreateFilters();
  }

  closeModal(event: MouseEvent, number: number) {
    if (number == 1) {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.createModalData.showImageAdder = true;
      this.createModalData.selectedFiles = [];
      this.createModalData.createDto.pdfs = [];
      this.createModalData.createDto.periodDate = '';
      this.createModalData.createDto.projectId = 0;
      return;
    }
    if (event.target === event.currentTarget) {
      this.showCreateModal = false;
      this.showEditModal = false;
      this.createModalData.showImageAdder = true;
      this.createModalData.selectedFiles = [];
      this.createModalData.createDto.pdfs = [];
      this.createModalData.createDto.periodDate = '';
      this.createModalData.createDto.projectId = 0;
    }
  }

  loadConstructionLogbookControls(page: number = 1) {
    this.loader = true;
    this.cdr.detectChanges();
    this.tableComponentData.selectedFilters.page = page;
    this.constructionLogbookControlService.getConstructionLogbookControlPaged(this.tableComponentData.selectedFilters).subscribe({
      next: (response) => {
        this.tableComponentData.tableData = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.pageSize = response.pageSize;
        this.totalRecords = response.totalRecords;

        this.loader = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
      },
    });
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer?.files) return;
    const file = e.dataTransfer.files[0];
    if (file.type !== 'application/pdf') {
      return;
    }
    this.assignFile(file);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.assignFile(file);
    }
  }

  removeFile(index: number) {
    this.createModalData.createDto.pdfs.splice(index, 1);

    this.createModalData.selectedFiles.splice(index, 1);

    this.createModalData.showImageAdder = this.createModalData.selectedFiles.length < 4;

    this.cdr.detectChanges();
  }

  private assignFile(file: File) {
    if (file.type !== 'application/pdf') return;

    if (this.createModalData.selectedFiles.length >= 4) return;

    this.createModalData.createDto.pdfs.push(file);

    this.createModalData.selectedFiles.push({
      name: file.name,
      size: this.formatFileSize(file.size),
      file: file,
    });

    this.createModalData.showImageAdder = this.createModalData.selectedFiles.length < 4;

    this.cdr.detectChanges();
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  showPdf(event: MouseEvent, fileUrl: string) {
    event.stopPropagation();
    this.tableComponentData.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    this.cdr.detectChanges();
  }

  private generatePeriodOptions() {
    const now = new Date();

    // Mes actual
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Mes anterior
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    this.createModalData.periodOptions = [
      this.mapToOption(currentMonth),
      this.mapToOption(previousMonth),
    ];
  }

  private mapToOption(date: Date) {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
    });

    const formatted = formatter.format(date);

    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    return {
      label: capitalized,
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`,
    };
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.loadConstructionLogbookControls(this.currentPage + 1);
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.loadConstructionLogbookControls(this.currentPage - 1);
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.loadConstructionLogbookControls(page);
      this.cdr.detectChanges();
    }
  }

  get pages(): number[] {
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    let start = this.currentPage - Math.floor(maxButtons / 2);
    let end = this.currentPage + Math.floor(maxButtons / 2);

    if (start < 1) {
      start = 1;
      end = maxButtons;
    }

    if (end > this.totalPages) {
      end = this.totalPages;
      start = this.totalPages - maxButtons + 1;
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  saveConstructionLogbookControl() {
    this.loader = true;
    const formData = new FormData();
    formData.append('projectId', this.createModalData.createDto.projectId.toString());
    formData.append('periodDate', this.createModalData.createDto.periodDate);
    if (this.createModalData.createDto.pdfs) {
      for (const file of this.createModalData.createDto.pdfs) {
        formData.append('pdfs', file);
      }
    }
    console.log(formData.get('pdfs'));
    this.constructionLogbookControlService.createConstructionLogbookControl(formData).subscribe({
      next: (response: ApiMessageDTO) => {
        this.showCreateModal = false;
        this.createModalData.createDto = { projectId: 0, pdfs: [], periodDate: '' };
        this.loader = false;
        this.cdr.detectChanges();
        this.loadConstructionLogbookControls();
        this.createModalData.selectedFiles = [];

        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error(err);
        console.log();
      },
    });
  }

  error(err: HttpErrorResponse) {
    this.loader = false;
    this.cdr.detectChanges();

    if (err.status == 401) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión expirada',
        text: err.error?.message ?? '',
      });
      localStorage.clear();
      this.router.navigate(['/auth/login']);
      return;
    }

    if (err.status >= 400 && err.status < 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }

    if (err.status >= 500) {
      Swal.fire({
        icon: 'error',
        title: 'Error del servidor',
        text: err.error?.message ?? 'Ocurrió un error.',
      });
      return;
    }
  }
}
