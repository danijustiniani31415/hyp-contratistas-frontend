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
import { DossierService } from '../../../../services/dossier.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import {
  DOSSIER_TIPOS,
  DossierDocumentoDto,
  DossierEstadoDocumento,
  DossierSemanaDetalleDto,
  DossierTipoDocumento,
} from '../../../../dtos/dossier.model';

@Component({
  selector: 'app-dossier-upload-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentViewer],
  templateUrl: './dossier-upload-modal.html',
  styleUrl: './dossier-upload-modal.css',
})
export class DossierUploadModal implements OnInit {
  @Input() semanaId!: number;
  @Output() closed = new EventEmitter<boolean>();

  detalle: DossierSemanaDetalleDto | null = null;
  loading = true;
  enviando = false;

  readonly tipos = DOSSIER_TIPOS;

  subiendoPor: Record<string, boolean> = {};
  eliminandoPor: Record<number, boolean> = {};

  viewerPath = '';
  viewerNombre = '';

  constructor(
    private dossierService: DossierService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dossierService.getDetalle(this.semanaId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  getDoc(tipo: DossierTipoDocumento): DossierDocumentoDto | undefined {
    return this.detalle?.documentos.find((d) => d.tipoDoc === tipo);
  }

  chipSemana(estado: string): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Rechazado' || estado === 'Enviado') return 'chip-orange';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  chipDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'chip-green';
    if (estado === 'NA') return 'chip-gray';
    return 'chip-blue';
  }

  labelDoc(estado: DossierEstadoDocumento): string {
    if (estado === 'Subido') return 'Subido';
    if (estado === 'NA') return 'N/A';
    if (estado === 'Aprobado') return 'Aprobado';
    if (estado === 'Observado') return 'Observado';
    return 'Pendiente';
  }

  onFileSelected(event: Event, tipo: DossierTipoDocumento): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.subiendoPor[tipo] = true;
    this.cdr.detectChanges();
    this.dossierService.subirDocumento(this.semanaId, tipo, file).subscribe({
      next: () => {
        this.subiendoPor[tipo] = false;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.subiendoPor[tipo] = false;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  marcarNa(tipo: DossierTipoDocumento): void {
    const doc = this.getDoc(tipo);
    if (!doc) {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo actualizar',
        text: `El documento "${tipo}" no existe para esta semana. Recarga la página o contacta a soporte.`,
      });
      return;
    }
    const esRevertir = doc.estado === 'NA';
    Swal.fire({
      icon: 'question',
      title: esRevertir ? '¿Revertir N/A?' : '¿Marcar como No Aplica?',
      text: esRevertir
        ? `El documento "${tipo}" volverá a estado Pendiente.`
        : `El documento "${tipo}" se marcará como No Aplica.`,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.dossierService.marcarDocumentoNa(doc.id).subscribe({
        next: () => this.load(),
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  verArchivo(archivoPath: string, nombre: string): void {
    this.viewerPath = archivoPath;
    this.viewerNombre = nombre;
    this.cdr.detectChanges();
  }

  onViewerClosed(): void {
    this.viewerPath = '';
    this.viewerNombre = '';
    this.cdr.detectChanges();
  }

  eliminarArchivo(archivoId: number, tipo: string): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar archivo?',
      text: `Se eliminará este archivo de "${tipo}".`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.eliminandoPor[archivoId] = true;
      this.cdr.detectChanges();
      this.dossierService.eliminarArchivo(archivoId).subscribe({
        next: () => {
          this.eliminandoPor[archivoId] = false;
          this.load();
        },
        error: (err: HttpErrorResponse) => {
          this.eliminandoPor[archivoId] = false;
          this.errorService.handleError(err);
          this.cdr.detectChanges();
        },
      });
    });
  }

  /**
   * "Aprobado" también cuenta como resuelto: si no, una semana cuyos documentos ya
   * fueron aprobados deja de poder enviarse (el botón queda deshabilitado para siempre)
   * aunque el backend sí la acepte — EnviarAsync solo rechaza los "Pendiente".
   * "Observado" no cuenta: ese sí lo tiene que volver a subir el contratista.
   */
  get todoResuelto(): boolean {
    if (!this.detalle) return false;
    return this.tipos.every((t) => {
      const doc = this.getDoc(t);
      return doc?.estado === 'Subido' || doc?.estado === 'NA' || doc?.estado === 'Aprobado';
    });
  }

  get tiposPendientes(): DossierTipoDocumento[] {
    if (!this.detalle) return [];
    return this.tipos.filter((t) => {
      const doc = this.getDoc(t);
      return doc?.estado !== 'Subido' && doc?.estado !== 'NA' && doc?.estado !== 'Aprobado';
    });
  }

  get puedeEnviar(): boolean {
    return (
      this.todoResuelto &&
      !!this.detalle &&
      this.detalle.estado !== 'Enviado' &&
      this.detalle.estado !== 'Aprobado' &&
      this.detalle.estado !== 'NoAplica'
    );
  }

  enviarDossier(): void {
    if (!this.puedeEnviar || this.enviando) return;
    Swal.fire({
      icon: 'question',
      title: '¿Enviar dossier?',
      text: 'Una vez enviado SSOMA revisará los documentos.',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.enviando = true;
      this.loaderService.show();
      this.dossierService.enviar(this.semanaId).subscribe({
        next: () => {
          this.enviando = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Dossier enviado', timer: 1500, showConfirmButton: false });
          this.closed.emit(true);
        },
        error: (err: HttpErrorResponse) => {
          this.enviando = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  cerrar(): void {
    this.closed.emit(false);
  }
}
