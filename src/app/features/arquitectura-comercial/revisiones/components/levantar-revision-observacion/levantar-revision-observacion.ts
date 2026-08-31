import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../shared/components/photo-grid-picker/photo-grid-picker';
import { SearchSelect } from '../../../../../shared/components/search-select/search-select';
import { RevisionesService } from '../../../../../core/services/arquitectura-comercial/revisiones.service';
import { ArquitecturaComercialService } from '../../../../../core/services/arquitectura-comercial.service';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { compressImages } from '../../../../../shared/utils/image-compress';
import { RevisionObservacionListItemDTO } from '../../../../../core/dtos/arquitectura-comercial/revisiones.model';
import { SupervisorAcDTO } from '../../../../../core/dtos/arquitectura-comercial/actividades.model';

@Component({
  standalone: true,
  selector: 'app-levantar-revision-observacion',
  imports: [AbrilModalPanel, PhotoGridPicker, CommonModule, FormsModule, SearchSelect],
  templateUrl: './levantar-revision-observacion.html',
  styleUrl: './levantar-revision-observacion.css',
})
export class LevantarRevisionObservacion implements OnInit {
  @Input({ required: true }) observacion!: RevisionObservacionListItemDTO;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  comentario = '';
  foto: File | null = null;
  fotoPreview: string[] = [];
  submitted = false;
  guardando = false;

  trabajadores: SupervisorAcDTO[] = [];
  levantaPorWorkerId: number | null = null;

  constructor(
    private service: RevisionesService,
    private arqComercialService: ArquitecturaComercialService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.levantaPorWorkerId = this.observacion.levantaPorWorkerId;
    this.arqComercialService.getSupervisoresAc(true).subscribe({
      next: (data) => { this.trabajadores = data; this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => this.errorService.handleError(err),
    });
  }

  onFotoSeleccionada(files: FileList): void {
    compressImages(Array.from(files).slice(0, 1)).then(([file]) => {
      this.foto = file;
      this.fotoPreview = [URL.createObjectURL(file)];
      this.cdr.markForCheck();
    });
  }

  quitarFoto(): void {
    if (this.fotoPreview[0]) URL.revokeObjectURL(this.fotoPreview[0]);
    this.foto = null;
    this.fotoPreview = [];
  }

  save(): void {
    this.submitted = true;
    if (!this.levantaPorWorkerId) return;

    this.guardando = true;
    this.loaderService.show();
    this.service
      .levantarObservacion(this.observacion.id, this.comentario.trim() || null, this.foto, this.levantaPorWorkerId)
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.guardando = false;
          Swal.fire({ title: 'Observación levantada', icon: 'success', timer: 2000 });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.guardando = false;
          this.errorService.handleError(err);
        },
      });
  }
}
