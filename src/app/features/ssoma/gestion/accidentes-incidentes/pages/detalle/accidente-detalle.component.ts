import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AccidenteIncidenteService } from '../../accidente-incidente.service';
import { FlashReportDetalleDto, NIVELES_CONSECUENCIA } from '../../accidente-incidente.dtos';
import { environment } from '../../../../../../../environments/environment';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { EntregablesTabComponent } from './entregables-tab/entregables-tab.component';
import { Rm050TabComponent } from './rm050-tab/rm050-tab.component';
import { SeguimientoMedicoTabComponent } from './seguimiento-medico-tab/seguimiento-medico-tab.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-accidente-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent, EntregablesTabComponent, Rm050TabComponent, SeguimientoMedicoTabComponent],
  templateUrl: './accidente-detalle.component.html',
  styleUrl: './accidente-detalle.component.css',
})
export class AccidenteDetalleComponent implements OnInit {
  id!: number;
  detalle: FlashReportDetalleDto | null = null;
  loading = true;
  enviando = false;
  foto1Blob: string | null = null;
  foto2Blob: string | null = null;
  foto1Loading = false;
  foto2Loading = false;
  foto1Error = false;
  foto2Error = false;
  lightboxUrl: string | null = null;
  pdfViewerUrl: string | null = null;
  get pdfViewerSafeUrl(): SafeResourceUrl | null {
    return this.pdfViewerUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfViewerUrl) : null;
  }
  tabActiva: 'flash' | 'entregables' | 'rm050' | 'seguimiento' = 'flash';

  setTab(tab: 'flash' | 'entregables' | 'rm050' | 'seguimiento'): void {
    this.tabActiva = tab;
    this.cdr.detectChanges();
  }

  readonly nivelesConsecuencia = NIVELES_CONSECUENCIA;

  private cargarBlobFoto(slot: 1 | 2): void {
    if (slot === 1) { this.foto1Loading = true; this.foto1Error = false; }
    else { this.foto2Loading = true; this.foto2Error = false; }

    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes/${this.id}/foto/${slot}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (slot === 1) { this.foto1Blob = blobUrl; this.foto1Loading = false; }
        else { this.foto2Blob = blobUrl; this.foto2Loading = false; }
        this.cdr.detectChanges();
      })
      .catch(() => {
        if (slot === 1) { this.foto1Loading = false; this.foto1Error = true; }
        else { this.foto2Loading = false; this.foto2Error = true; }
        this.cdr.detectChanges();
      });
  }

  abrirLightbox(url: string | null): void {
    if (!url) return;
    this.lightboxUrl = url;
    this.cdr.detectChanges();
  }

  cerrarLightbox(): void {
    this.lightboxUrl = null;
    this.cdr.detectChanges();
  }

  descargarFoto(blobUrl: string | null, slot: 1 | 2): void {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `foto${slot}_${this.detalle?.codigo ?? this.id}`;
    a.click();
  }

  verPdf(): void {
    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes/${this.id}/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        if (this.pdfViewerUrl) URL.revokeObjectURL(this.pdfViewerUrl);
        this.pdfViewerUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.cdr.detectChanges();
      });
  }

  cerrarPdfViewer(): void {
    if (this.pdfViewerUrl) URL.revokeObjectURL(this.pdfViewerUrl);
    this.pdfViewerUrl = null;
    this.cdr.detectChanges();
  }

  confirmarReclasificar(): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Reclasificar como Accidente?',
      html: `<p style="font-size:13px">Este Incidente se convertirá en <strong>Accidente</strong>.<br>
             Se crearán los entregables y el seguimiento médico correspondientes.<br>
             Esta acción <strong>no se puede deshacer</strong>.</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, reclasificar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.service.reclasificar(this.id).subscribe({
        next: (_res: { message: string; accidenteTrabajoId?: number }) => {
          Swal.fire({ icon: 'success', title: 'Reclasificado correctamente', timer: 1800, showConfirmButton: false });
          this.cargar();
        },
        error: (err: HttpErrorResponse) => this.errorService.handleError(err),
      });
    });
  }

  verMintra(): void {
    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes/${this.id}/mintra`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        window.open(URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })), '_blank');
      });
  }

  descargarPdf(): void {
    const token = localStorage.getItem('access_token');
    const url = `${environment.apiUrl}api/v1/ssoma-accidentes-incidentes/${this.id}/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `FlashReport_${this.detalle?.codigo ?? this.id}.pdf`;
        a.click();
      });
  }

  private fetchArchivo(path: string, download: boolean): void {
    const token = localStorage.getItem('access_token');
    const endpoint = download ? 'descargar' : 'ver';
    const url = `${environment.apiUrl}api/v1/habilitacion/archivos/${endpoint}?url=${encodeURIComponent(path)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const mime = download ? blob.type : (blob.type || 'application/pdf');
        const typed = new Blob([blob], { type: mime });
        const blobUrl = URL.createObjectURL(typed);
        if (download) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = path.split('/').pop() ?? 'archivo';
          a.click();
        } else {
          window.open(blobUrl, '_blank');
        }
      });
  }

  abrirArchivo(path: string): void { this.fetchArchivo(path, false); }
  descargarArchivo(path: string): void { this.fetchArchivo(path, true); }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: AccidenteIncidenteService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getDetalle(this.id).subscribe({
      next: (res) => {
        this.detalle = res;
        this.loading = false;
        this.loaderService.hide();
        if (res.urlFoto1) this.cargarBlobFoto(1);
        if (res.urlFoto2) this.cargarBlobFoto(2);
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  irAEditar(): void {
    this.router.navigate(['/ssoma/gestion/accidentes-incidentes', this.id, 'editar']);
  }

  volver(): void {
    this.location.back();
  }

  async confirmarEnviar(): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Enviar Flash Report?',
      html: `Se generará el PDF del Flash Report <strong>${this.detalle?.codigo}</strong>, se subirá a SharePoint y se enviará por correo a SSOMA y Proyectos.<br><br>Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0F6E56',
      input: 'checkbox',
      inputPlaceholder: 'No enviar email (solo regularización)',
    });
    if (!result.isConfirmed) return;

    const enviarEmail = !result.value;

    this.enviando = true;
    this.cdr.detectChanges();
    this.loaderService.show();

    this.service.enviar(this.id, enviarEmail).subscribe({
      next: async (res) => {
        this.enviando = false;
        this.loaderService.hide();
        await Swal.fire({
          icon: 'success',
          title: 'Flash Report enviado',
          text: res.message,
          timer: 2500,
          showConfirmButton: false,
        });
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.enviando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  nivelLabel(n?: number): string {
    return n && n >= 1 && n <= 6 ? this.nivelesConsecuencia[n] : '—';
  }

  nivelClass(n?: number): string {
    if (!n) return '';
    if (n <= 2) return 'nivel-bajo';
    if (n <= 3) return 'nivel-medio';
    if (n <= 4) return 'nivel-alto';
    return 'nivel-critico';
  }

  tipoClass(codigo: string): string {
    const map: Record<string, string> = { AC: 'tipo-accidente', IN: 'tipo-incidente', NC: 'tipo-nc', AL: 'tipo-alerta' };
    return map[codigo] ?? 'tipo-incidente';
  }

  estadoClass(estado: string): string {
    if (estado === 'Enviado') return 'estado-enviado';
    return 'estado-borrador';
  }
}
