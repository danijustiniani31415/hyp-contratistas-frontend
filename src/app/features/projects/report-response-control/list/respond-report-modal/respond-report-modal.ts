import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { ResidentReportIncidenceService } from '../../../../../core/services/residentReportIncidence.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';
import { ResidentReportResponseCreateDto } from '../../../../../core/dtos/reportResponseControl/responseCreateDto.model';
import { ApiMessageDTO } from '../../../../../core/dtos/api/ApiMessage.model';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { FileSelector, SelectedFile } from '../../../../../shared/components/file-selector/file-selector';
import { ImagePreview } from '../../../../../shared/components/image-preview/image-preview';
import { CameraPhoto, CameraWeb } from '../../../../../shared/components/camera-web/camera-web';

@Component({
  selector: 'app-respond-report-modal',
  imports: [CommonModule, FormsModule, BaseModal, FileSelector, ImagePreview, CameraWeb],
  templateUrl: './respond-report-modal.html',
  styleUrl: './respond-report-modal.css',
})
export class RespondReportModal {
  @Input() selectedReportIncidenceId: number = 0;

  showCamera = false;
  previews: string[] = [];
  maxImages = 3;

  createDto: ResidentReportResponseCreateDto = {
    residentReportIncidenceId: 0,
    residentResponseDescription: '',
    images: [] as File[],
  };

  @Input() showEditModal: boolean = false;
  @Output() closeResponseModal = new EventEmitter<void>();

  @Output() loadListData = new EventEmitter();

  constructor(
    private residentReportIncidenceService: ResidentReportIncidenceService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
  ) {}

  createResponse(event: MouseEvent) {
    event.stopPropagation();
    if (!this.createDto.residentResponseDescription.trim()) {
      return;
    }
    this.createDto.residentReportIncidenceId = this.selectedReportIncidenceId;
    const formData = new FormData();
    formData.append("residentResponseDescription", this.createDto.residentResponseDescription);
    formData.append("residentReportIncidenceId", String(this.createDto.residentReportIncidenceId));
    this.createDto.images.forEach((x)=>{
      formData.append("images", x);
    });
    this.loaderService.show();
    this.residentReportIncidenceService.createResponse(formData).subscribe({
      next: (response: ApiMessageDTO) => {
        this.closeResponseModal.emit();
        this.loaderService.hide();
        this.cdr.detectChanges();
        this.loadListData.emit();
        Swal.fire({
          title: response.message ?? 'Item creado exitosamente',
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
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
