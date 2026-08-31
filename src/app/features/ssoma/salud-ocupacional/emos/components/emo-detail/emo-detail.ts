import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { EmoService } from '../../../services/emo.service';
import {
  EmoDetalleDto,
  WorkerEmoHistorialDto,
} from '../../../dtos/emo.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import Swal from 'sweetalert2';
import { aptitudBadgeClass } from '../../../shared/aptitud.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../../../shared/dias-vencer.utils';

type TabKey = 'datos' | 'examenes' | 'restricciones' | 'convalidaciones' | 'clinica' | 'documentos' | 'historial';

@Component({
  selector: 'app-emo-detail',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel, DocumentViewer],
  templateUrl: './emo-detail.html',
  styleUrl: './emo-detail.css',
})
export class EmoDetail implements OnChanges, OnDestroy {
  @Input() emoId: number | null = null;
  @Input() canUpload = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  activeTab: TabKey = 'datos';
  uploadingDoc: Record<string, boolean> = {};
  visorUrl = '';
  visorNombre = '';
  emo: EmoDetalleDto | null = null;
  loading = false;

  historial: WorkerEmoHistorialDto | null = null;
  historialLoading = false;
  historialLoaded = false;

  private destroyed = false;

  constructor(
    private service: EmoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['emoId'] && this.emoId) {
      this.resetState();
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private resetState(): void {
    this.emo = null;
    this.activeTab = 'datos';
    this.historial = null;
    this.historialLoaded = false;
    this.historialLoading = false;
    this.uploadingDoc = {};
    this.visorUrl = '';
    this.visorNombre = '';
  }

  subirDocumento(event: Event, tipo: 'Aptitud' | 'EMO'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.emo) return;
    input.value = '';
    this.uploadingDoc[tipo] = true;
    this.loaderService.show();
    this.service.subirDocumentoEmo(this.emo.id, file, tipo).subscribe({
      next: (res) => {
        this.uploadingDoc[tipo] = false;
        this.loaderService.hide();
        if (tipo === 'Aptitud') this.emo!.urlAptitud = res.url;
        else this.emo!.urlEmoCompleto = res.url;
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Documento subido', timer: 1400, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingDoc[tipo] = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  load(): void {
    if (!this.emoId) return;
    this.loading = true;
    this.loaderService.show();
    this.service.getEmoDetalle(this.emoId).subscribe({
      next: (res) => {
        if (this.destroyed) return;
        this.emo = res;
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

  setTab(tab: TabKey): void {
    this.activeTab = tab;
    if (tab === 'historial' && !this.historialLoaded && this.emo) {
      this.loadHistorial();
    }
  }

  private loadHistorial(): void {
    if (!this.emo) return;
    this.historialLoading = true;
    this.service.getHistorialWorker(this.emo.workerId).subscribe({
      next: (res) => {
        if (this.destroyed) return;
        this.historial = res;
        this.historialLoaded = true;
        this.historialLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.historialLoading = false;
        this.errorService.handleError(err);
      },
    });
  }

  irAHistorialCompleto(): void {
    if (!this.emo) return;
    this.closed.emit();
    this.router.navigate(['/ssoma/salud-ocupacional/emos', this.emo.workerId, 'historial']);
  }

  aptitudClass(aptitud: string): string {
    return aptitudBadgeClass(aptitud);
  }

  diasClass(dias: number | null): string {
    if (dias == null) return '';
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number | null): string {
    if (dias == null) return '—';
    return diasVencerStyle(dias).label;
  }

  verDocumento(path: string | undefined | null, nombre = ''): void {
    if (!path) return;
    this.visorUrl = path;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  close(): void {
    this.closed.emit();
  }
}
