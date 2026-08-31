import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { PasoEjecucionService } from '../../services/paso-ejecucion.service';
import { SharepointUploadService } from '../../../../../habilitacion/services/sharepoint-upload.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { PasoActividadDto, PasoEjecucionDto, CreateEjecucionDto, PasoEjecucionArchivoDto } from '../../dtos/paso.dtos';

@Component({
  selector: 'app-ejecucion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilModalPanel, DocumentViewer],
  templateUrl: './ejecucion-modal.component.html',
  styleUrl: './ejecucion-modal.component.css',
})
export class EjecucionModalComponent implements OnInit {
  @Input() actividad!: PasoActividadDto;
  // FIX-F4: receive the selected month/year from parent so fechaProgramada is correct
  @Input() mesSeleccionado: number = new Date().getMonth() + 1;
  @Input() anioSeleccionado: number = new Date().getFullYear();
  @Output() closed = new EventEmitter<void>();
  @Output() ejecucionCreada = new EventEmitter<PasoEjecucionDto>();

  form: CreateEjecucionDto = {
    actividadId: 0,
    fechaEjecutada: '',
    observaciones: '',
    participantesCount: undefined,
  };

  evidenciaFile: File | null = null;
  ejecucionGuardada: PasoEjecucionDto | null = null;
  isDragOver = false;
  saving = false;
  uploadProgress = false;

  visorUrl = '';
  visorNombre = '';

  ngOnInit(): void {
    this.ejecucionGuardada = null;
    this.form.actividadId = this.actividad.id;
    // FIX-F4: set fechaProgramada to first day of selected month (ISO format)
    const anio = this.anioSeleccionado;
    const mes  = String(this.mesSeleccionado).padStart(2, '0');
    this.form.fechaProgramada = `${anio}-${mes}-01`;
    // Default fechaEjecutada to today
    const hoy = new Date();
    this.form.fechaEjecutada = hoy.toISOString().substring(0, 10);
  }

  constructor(
    private ejecucionService: PasoEjecucionService,
    private sharepointService: SharepointUploadService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.evidenciaFile = input.files[0];
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.evidenciaFile = file;
  }

  removeFile(): void {
    this.evidenciaFile = null;
  }

  get canSave(): boolean {
    return !!this.form.fechaEjecutada;
  }

  get archivosExistentes(): PasoEjecucionArchivoDto[] {
    if (this.ejecucionGuardada?.archivos?.length) return this.ejecucionGuardada.archivos;
    const ejecuciones = this.actividad?.ejecuciones ?? [];
    return ejecuciones
      .flatMap(e => e.archivos ?? [])
      .sort((a, b) => a.orden - b.orden);
  }

  nombreArchivo(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }

  abrirVisor(archivoUrl: string, nombre?: string): void {
    this.visorNombre = nombre || this.nombreArchivo(archivoUrl);
    this.visorUrl = archivoUrl;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
  }

  descargarDocumento(archivoUrl: string): void {
    this.sharepointService.getArchivoUrl(archivoUrl).subscribe({
      next: (res) => {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = this.nombreArchivo(archivoUrl);
        a.click();
      },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  guardar(): void {
    if (!this.canSave) return;
    this.saving = true;
    this.ejecucionService.create(this.form).subscribe({
      next: (ejecucion) => {
        if (this.evidenciaFile) {
          this.uploadProgress = true;
          this.ejecucionService.agregarArchivo(ejecucion.id, this.evidenciaFile).subscribe({
            next: (updated) => {
              this.saving = false;
              this.uploadProgress = false;
              this.ejecucionGuardada = updated;
              this.ejecucionCreada.emit(updated);
              this.cdr.detectChanges();
            },
            error: (err: HttpErrorResponse) => {
              this.saving = false;
              this.uploadProgress = false;
              Swal.fire('Advertencia', 'Ejecución guardada, pero falló la carga de evidencia.', 'warning');
              this.ejecucionCreada.emit(ejecucion);
              this.cdr.detectChanges();
            },
          });
        } else {
          this.saving = false;
          this.ejecucionCreada.emit(ejecucion);
          this.cdr.detectChanges();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        Swal.fire('Error', err.error?.message ?? 'No se pudo registrar la ejecución', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
