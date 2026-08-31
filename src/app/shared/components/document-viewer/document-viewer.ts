import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SharepointUploadService } from '../../../features/habilitacion/services/sharepoint-upload.service';
import { ErrorService } from '../../../core/services/error.service';

declare const pdfjsLib: any;

const PDFJS_WORKER_SRC =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

type VisorTipo = 'pdf' | 'img' | 'office' | 'no-preview';

const PDF_EXTS = ['pdf'];
const IMG_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const OFFICE_EXTS = ['docx', 'xlsx', 'pptx', 'doc', 'xls'];

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-viewer.html',
  styleUrl: './document-viewer.css',
})
export class DocumentViewer implements OnChanges, OnDestroy {
  @Input() archivoUrl = '';
  @Input() nombre = '';
  @Input() libraryCtx = '';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;

  isOpen = false;
  loading = false;
  tipo: VisorTipo | null = null;
  safeUrl: SafeResourceUrl | null = null;
  imgUrl = '';
  tempUrl = '';
  nombreDisplay = '';
  private blobUrl = '';

  pdfPageCount = 0;
  searchQuery = '';
  searchMatches: HTMLElement[] = [];
  searchIdx = 0;

  constructor(
    private sharepointService: SharepointUploadService,
    private sanitizer: DomSanitizer,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['archivoUrl']) {
      const url = changes['archivoUrl'].currentValue as string;
      if (url) {
        this.nombreDisplay = this.nombre || this.derivarNombre(url);
        this.abrir(url);
      } else {
        this.reset();
      }
    }
    if (changes['nombre']?.currentValue && this.isOpen) {
      this.nombreDisplay = changes['nombre'].currentValue as string;
    }
  }

  ngOnDestroy(): void {
    this.reset();
  }

  close(): void {
    this.reset();
    this.closed.emit();
  }

  descargar(): void {
    if (!this.tempUrl) return;
    const a = document.createElement('a');
    a.href = this.tempUrl;
    a.download = this.nombreDisplay;
    a.click();
  }

  private abrir(archivoUrl: string): void {
    const ext = archivoUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    this.tipo = this.detectarTipo(ext);
    this.loading = true;
    this.isOpen = true;
    this.safeUrl = null;
    this.imgUrl = '';
    this.tempUrl = '';

    this.sharepointService.getArchivoUrl(archivoUrl, this.libraryCtx || undefined).subscribe({
      next: (res) => {
        this.tempUrl = res.url;
        if (this.tipo === 'pdf' || this.tipo === 'img') {
          // @microsoft.graph.downloadUrl trae Content-Disposition: attachment, lo que
          // fuerza al browser a descargar en vez de renderizar dentro del iframe/img.
          // Lo descargamos como blob y creamos un object URL sin ese header.
          this.cargarComoBlob(res.url);
        } else if (this.tipo === 'office') {
          const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(res.url)}`;
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(officeUrl);
          this.loading = false;
          this.cdr.detectChanges();
        } else {
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.isOpen = false;
        this.errorService.handleError(err);
        this.closed.emit();
        this.cdr.detectChanges();
      },
    });
  }

  private cargarComoBlob(url: string): void {
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        this.revokeBlobUrl();
        this.blobUrl = URL.createObjectURL(blob);
        if (this.tipo === 'pdf') {
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.renderizarPdf(this.blobUrl), 50);
        } else if (this.tipo === 'img') {
          this.imgUrl = this.blobUrl;
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
      .catch(() => {
        // Fallback: usa la URL directa aunque el browser fuerce descarga.
        if (this.tipo === 'pdf') {
          this.loading = false;
          this.cdr.detectChanges();
          setTimeout(() => this.renderizarPdf(this.tempUrl), 50);
        } else if (this.tipo === 'img') {
          this.imgUrl = this.tempUrl;
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = '';
    }
  }

  private reset(): void {
    this.isOpen = false;
    this.loading = false;
    this.tipo = null;
    this.safeUrl = null;
    this.imgUrl = '';
    this.tempUrl = '';
    this.pdfPageCount = 0;
    this.searchQuery = '';
    this.searchMatches = [];
    this.searchIdx = 0;
    if (this.pdfContainer) this.pdfContainer.nativeElement.innerHTML = '';
    this.revokeBlobUrl();
  }

  private detectarTipo(ext: string): VisorTipo {
    if (PDF_EXTS.includes(ext)) return 'pdf';
    if (IMG_EXTS.includes(ext)) return 'img';
    if (OFFICE_EXTS.includes(ext)) return 'office';
    return 'no-preview';
  }

  derivarNombre(url: string): string {
    return url.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
  }

  private async renderizarPdf(url: string): Promise<void> {
    console.log('[DV] renderizarPdf llamado', url);

    if (typeof pdfjsLib === 'undefined') {
      console.error('[DV] pdfjsLib no definido');
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

    const container = this.pdfContainer?.nativeElement;
    console.log('[DV] pdfContainer:', container);
    if (!container) {
      console.error('[DV] pdfContainer no encontrado en DOM');
      return;
    }

    container.innerHTML = '';
    this.pdfPageCount = 0;
    this.searchQuery = '';
    this.searchMatches = [];
    this.searchIdx = 0;

    try {
      const pdf = await pdfjsLib.getDocument(url).promise;
      console.log('[DV] PDF cargado, páginas:', pdf.numPages);
      this.pdfPageCount = pdf.numPages;
      this.cdr.detectChanges();

      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 1.5 });
        console.log(`[DV] Renderizando página ${n}, size: ${viewport.width}x${viewport.height}`);

        const wrapper = document.createElement('div');
        wrapper.className = 'dv-pdf-page';
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        console.log(`[DV] Canvas página ${n} renderizado`);

        const textLayer = document.createElement('div');
        textLayer.className = 'dv-text-layer';
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        await pdfjsLib.renderTextLayer({ textContent, container: textLayer, viewport, textDivs: [] }).promise;

        wrapper.appendChild(canvas);
        wrapper.appendChild(textLayer);
        container.appendChild(wrapper);
        console.log(`[DV] Página ${n} añadida al DOM`);
      }

      console.log('[DV] Renderizado completo');
    } catch (e) {
      console.error('[DV] Error renderizando PDF:', e);
    }
  }

  buscarTexto(): void {
    const container = this.pdfContainer?.nativeElement;
    if (!container) return;

    container.querySelectorAll('.dv-highlight, .dv-highlight-active').forEach((el) => {
      el.classList.remove('dv-highlight', 'dv-highlight-active');
    });
    this.searchMatches = [];
    this.searchIdx = 0;

    const query = this.searchQuery.trim().toLowerCase();
    if (!query) { this.cdr.detectChanges(); return; }

    container.querySelectorAll<HTMLElement>('.dv-text-layer span').forEach((span) => {
      if (span.textContent?.toLowerCase().includes(query)) {
        span.classList.add('dv-highlight');
        this.searchMatches.push(span);
      }
    });

    if (this.searchMatches.length) {
      this.searchMatches[0].classList.add('dv-highlight-active');
      this.searchMatches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    this.cdr.detectChanges();
  }

  navegarBusqueda(dir: number): void {
    if (!this.searchMatches.length) return;
    this.searchMatches[this.searchIdx].classList.remove('dv-highlight-active');
    this.searchIdx = (this.searchIdx + dir + this.searchMatches.length) % this.searchMatches.length;
    const el = this.searchMatches[this.searchIdx];
    el.classList.add('dv-highlight-active');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.cdr.detectChanges();
  }
}
