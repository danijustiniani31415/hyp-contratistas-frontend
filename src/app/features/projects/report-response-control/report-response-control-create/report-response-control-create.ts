import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ResidentReportIncidenceCreateDTO } from '../../../../core/dtos/reportResponseControl/incidentCreateDto.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { CameraWeb } from '../../../../shared/components/camera-web/camera-web';
import { CameraPhoto } from "../../../../shared/components/camera-web/camera-web";
import { FileSelector, SelectedFile } from "../../../../shared/components/file-selector/file-selector";
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { ProjectResidentService } from '../../../../core/services/projectResident.service';
import { ProjectSimpleDTO } from '../../../../core/dtos/project/projectSimple.model';
import { ResidentReportIncidenceService } from '../../../../core/services/residentReportIncidence.service';
import Swal from 'sweetalert2';

@Component({
  standalone: true,
  selector: 'app-report-response-control-create',
  imports: [FormsModule, CommonModule, CameraWeb, FileSelector, BaseModal],
  templateUrl: './report-response-control-create.html',
  styleUrl: './report-response-control-create.css',
})
export class ReportResponseControlCreate implements OnInit {
  showCamera = false;
  previews: string[] = [];
  maxImages = 3;
  projects: ProjectSimpleDTO[] = [];

  createDto: ResidentReportIncidenceCreateDTO = {
    residentReportIncidenceDescription: '',
    projectId: 0,
    images: [] as File[],
  };

  @Output() closeCreateModal = new EventEmitter<void>();
  @Output() loadIncidences = new EventEmitter<void>();


  constructor(
    private projectResidentService: ProjectResidentService,
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects() {
    this.loaderService.show();
    this.projectResidentService.getProjectsDescription().subscribe({
      next: (data) => {
        this.projects = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });
  }

  onClose() {
    this.previews = [];
    this.createDto.images = [];
    this.closeCreateModal.emit();
  }

  saveResidentReportIncidence() {
    if (!this.createDto.residentReportIncidenceDescription.trim()) {
      return;
    }
    const formData = new FormData();
    formData.append("residentReportIncidenceDescription", this.createDto.residentReportIncidenceDescription);
    formData.append("projectId", String(this.createDto.projectId));
    this.createDto.images.forEach((x)=>{
      formData.append("images", x);
    });
    this.loaderService.show();
    this.residentReportIncidenceService.createResidentReportIncidence(formData).subscribe({
      next: (response) => {
        this.loadIncidences.emit();
        this.loaderService.hide();
        
        Swal.fire({
          title: response.message ?? 'Item creado exitosamente',
          icon: 'success',
          draggable: true,
        });
        this.closeCreateModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      }
    });

    /*
    this.loaderService.show();
    this.areaService.createArea(this.createDto).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeCreateModal.emit();
        this.createDto = { areaDescription: '', active: true };
        this.loaderService.hide();
        this.cdr.detectChanges();
        
        Swal.fire({
          title: response.message ?? 'Proyecto creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });*/
  }

  openCamera() {
    this.showCamera = true;
  }

  onPhotoTaken(photo: CameraPhoto) {
    if (!this.canAddImage()) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `Solo puedes subir ${this.maxImages} imágenes`,
      });
      return;
    }

    this.previews.push(photo.preview);
    this.createDto.images.push(photo.file);

    this.showCamera = false;
  }

  removeImage(index: number) {
    URL.revokeObjectURL(this.previews[index]);
    this.previews.splice(index, 1);
    this.createDto.images.splice(index, 1);
  }

  onImageSelected(image: SelectedFile) {
    if (!this.canAddImage()) {
      URL.revokeObjectURL(image.preview);

      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `Solo puedes subir ${this.maxImages} imágenes`,
      });

      return;
    }

    this.previews.push(image.preview);
    this.createDto.images.push(image.file);
  }

  canAddImage(): boolean {
    return this.previews.length < this.maxImages;
  }
}
