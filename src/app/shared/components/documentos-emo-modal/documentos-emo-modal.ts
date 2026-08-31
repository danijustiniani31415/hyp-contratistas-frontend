import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BaseModal } from '../base-modal/base-modal';
import { DocumentViewer } from '../document-viewer/document-viewer';
import { EmoService } from '../../../features/ssoma/salud-ocupacional/services/emo.service';
import { InterconsultaClinicaService } from '../../../features/clinica/services/interconsulta-clinica.service';
import { EmoPorTrabajadorDto } from '../../../features/ssoma/salud-ocupacional/dtos/emo.model';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';
import { hoyIsoLocal } from '../../utils/fecha-local.util';

@Component({
  selector: 'app-documentos-emo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, DocumentViewer],
  templateUrl: './documentos-emo-modal.html',
  styleUrl: './documentos-emo-modal.css',
})
export class DocumentosEmoModal implements OnChanges {
  @Input() emo: EmoPorTrabajadorDto | null = null;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  uploading: Record<string, boolean> = {};
  visorUrl = '';
  visorNombre = '';

  /** Fecha de lectura para el flujo "Pendiente de lectura (médico Abril)". */
  fechaLecturaAbril = '';

  constructor(
    private service: EmoService,
    private interconsultaService: InterconsultaClinicaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.fechaLecturaAbril = hoyIsoLocal();
    }
    if (changes['open'] && !this.open) {
      this.uploading = {};
      this.visorUrl = '';
      this.visorNombre = '';
    }
  }

  /** true = a este EMO le falta la lectura y la debe subir el médico de Abril (no la clínica). */
  get pendienteLecturaAbril(): boolean {
    return !!this.emo?.requiereLecturaAbril && !this.emo?.urlResultado;
  }

  verDocumento(url: string | undefined | null, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  onFileSelected(event: Event, tipo: 'Aptitud' | 'EMO' | 'Lectura'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.emo?.emoId) return;
    input.value = '';

    if (tipo === 'Lectura' && this.pendienteLecturaAbril) {
      this.onArchivoLecturaAbril(file);
      return;
    }

    this.uploading[tipo] = true;
    this.loaderService.show();
    this.service.subirDocumentoEmo(this.emo.emoId, file, tipo).subscribe({
      next: (res) => {
        this.uploading[tipo] = false;
        this.loaderService.hide();
        if (tipo === 'Aptitud') this.emo!.urlAptitud = res.url;
        else if (tipo === 'EMO') this.emo!.urlEmoCompleto = res.url;
        else this.emo!.urlResultado = res.url;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Documento subido', timer: 1400, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.uploading[tipo] = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  /** Completa la lectura de un EMO "Pendiente de lectura (médico Abril)": sube el adjunto,
   *  guarda la fecha y aprueba, igual que si lo estuviera subiendo la clínica. */
  onArchivoLecturaAbril(file: File): void {
    if (!this.emo?.emoId) return;
    if (!this.fechaLecturaAbril) {
      Swal.fire({ icon: 'warning', title: 'Falta la fecha de lectura' });
      return;
    }

    this.uploading['Lectura'] = true;
    this.loaderService.show();
    this.service.completarLecturaAbril(this.emo.emoId, file, this.fechaLecturaAbril).subscribe({
      next: (res) => {
        this.uploading['Lectura'] = false;
        this.loaderService.hide();
        this.emo!.urlResultado = res.url;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Lectura registrada y aprobada', timer: 1600, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.uploading['Lectura'] = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onInformeInterconsultaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.emo?.interconsultaId) return;
    input.value = '';

    this.uploading['Interconsulta'] = true;
    this.loaderService.show();
    this.interconsultaService.subirInformeInterconsulta(this.emo.interconsultaId, file).subscribe({
      next: (res) => {
        this.uploading['Interconsulta'] = false;
        this.loaderService.hide();
        this.emo!.interconsultaUrlInforme = res.url;
        this.emo!.interconsultaEstado = 'Atendida';
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Informe subido', timer: 1400, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.uploading['Interconsulta'] = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
