import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SignaturePad } from '../../../shared/components/signature-pad/signature-pad';
import { CartaOfertaFirmaService } from './services/carta-oferta-firma.service';
import { CartaOfertaFirmaPublico } from './dtos/carta-oferta-firma.dto';

/**
 * Página PÚBLICA de la carta oferta (acceso por token, sin login).
 *
 * Reemplaza al flujo en el que la carta iba adjunta en un correo, el postulante la imprimía, la
 * firmaba a mano y la devolvía por correo para que GTH la subiera al intranet. Acá el postulante:
 *   1. lee su carta oferta (la que GTH cargó, servida por el backend desde SharePoint);
 *   2. dibuja y guarda su firma, que queda en su ficha de la base maestra;
 *   3. presiona «Firmar» y el backend la estampa en la última página del PDF y lo deja en el file
 *      digital como su carta oferta firmada, a la espera de la revisión de GTH.
 *
 * El botón «Firmar» solo se habilita cuando ya hay una firma registrada: firmar es estampar la firma
 * guardada, no el trazo que está en el lienzo.
 */
@Component({
  standalone: true,
  selector: 'app-carta-oferta-firma',
  imports: [CommonModule, SignaturePad],
  templateUrl: './carta-oferta-firma.html',
  styleUrl: './carta-oferta-firma.css',
})
export class CartaOfertaFirma implements OnInit, OnDestroy {
  @ViewChild('pad') pad?: SignaturePad;

  token = '';

  cargando = true;
  /** true cuando la carga falla o el token no es válido. */
  errorCarga = false;
  mensajeError = '';

  data: CartaOfertaFirmaPublico | null = null;

  // ── Visor de la carta ───────────────────────────────────────────────────
  /** Object URL del PDF ya descargado, saneado para poder ir en el src del iframe. */
  documentoUrl: SafeResourceUrl | null = null;
  documentoCargando = false;
  documentoError = '';
  /** Se conserva sin sanear para poder revocarlo al salir y para el botón de descarga. */
  private blobUrl = '';

  // ── Firma ───────────────────────────────────────────────────────────────
  /** true cuando hay trazo en el lienzo (lo emite el signature-pad). */
  hayTrazo = false;
  guardandoFirma = false;
  firmando = false;
  /** true tras firmar en esta misma visita: muestra la pantalla de confirmación. */
  firmadoAhora = false;

  constructor(
    private route: ActivatedRoute,
    private service: CartaOfertaFirmaService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorCarga = true;
      this.mensajeError = 'El enlace de tu carta oferta no es válido.';
      this.cargando = false;
      return;
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    this.revocarBlob();
  }

  // ── Carga ───────────────────────────────────────────────────────────────

  private cargar(): void {
    this.cargando = true;
    // App zoneless: se fuerza el refresco para que la página aparezca sin un click extra.
    this.service.getPublico(this.token).subscribe({
      next: (data) => {
        this.data = data;
        this.cargando = false;
        this.cdr.detectChanges();
        // El PDF se pide después del contexto y no en paralelo: si el token es inválido, el error se
        // muestra una sola vez y no se dispara una descarga que va a fallar igual.
        this.cargarDocumento();
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.errorCarga = true;
        this.mensajeError =
          err.error?.message ??
          'No pudimos abrir tu carta oferta. Verifica el enlace del correo e inténtalo de nuevo.';
        this.cdr.detectChanges();
      },
    });
  }

  private cargarDocumento(): void {
    this.documentoCargando = true;
    this.documentoError = '';
    this.cdr.detectChanges();

    this.service.getDocumento(this.token).subscribe({
      next: (blob) => {
        this.revocarBlob();
        this.blobUrl = URL.createObjectURL(blob);
        this.documentoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
        this.documentoCargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentoCargando = false;
        this.documentoError =
          'No pudimos mostrar el documento. Recarga la página o escríbele a Gestión de Talento Humano.';
        this.cdr.detectChanges();
      },
    });
  }

  private revocarBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = '';
    }
  }

  /** Abre el PDF en otra pestaña, para quien prefiera leerlo a pantalla completa o descargarlo. */
  abrirEnPestana(): void {
    if (this.blobUrl) window.open(this.blobUrl, '_blank');
  }

  // ── Estado de la página ─────────────────────────────────────────────────

  /** true si el documento ya está firmado (en esta visita o de antes). */
  get yaFirmada(): boolean {
    return this.firmadoAhora || !!this.data?.yaFirmada;
  }

  /** true si GTH ya aprobó la carta firmada: no se puede volver a firmar ni cambiar la firma. */
  get aprobada(): boolean {
    return !!this.data?.aprobada;
  }

  /** Firma registrada en su ficha, si tiene. Es la que se va a estampar. */
  get firmaDataUrl(): string | null {
    return this.data?.firmaDataUrl ?? null;
  }

  get tieneFirmaRegistrada(): boolean {
    return !!this.firmaDataUrl;
  }

  /** El lienzo solo se muestra mientras la firma pueda cambiar. */
  get puedeRegistrarFirma(): boolean {
    return !this.aprobada && !this.guardandoFirma && !this.firmando;
  }

  /**
   * El botón «Firmar» exige una firma YA GUARDADA: lo que se estampa es la firma de su ficha, no el
   * trazo del lienzo. Así no se puede firmar con algo que nunca quedó registrado.
   */
  get puedeFirmar(): boolean {
    return this.tieneFirmaRegistrada && !this.firmando && !this.guardandoFirma && !this.aprobada;
  }

  /** Por qué no se puede firmar todavía (va como texto de ayuda y tooltip del botón). */
  get motivoBloqueo(): string | null {
    if (this.aprobada) return 'Tu carta oferta ya fue revisada y aprobada: el proceso está cerrado.';
    if (!this.tieneFirmaRegistrada)
      return 'Dibuja tu firma en el recuadro y presiona «Guardar firma» para habilitar la firma del documento.';
    return null;
  }

  // ── Firma ───────────────────────────────────────────────────────────────

  limpiarTrazo(): void {
    this.pad?.clear();
  }

  guardarFirma(): void {
    const dataUrl = this.pad?.toDataUrl();
    if (!dataUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Firma vacía',
        text: 'Dibuja tu firma en el recuadro antes de guardarla.',
      });
      return;
    }

    this.guardandoFirma = true;
    this.cdr.detectChanges();

    this.service.guardarFirma(this.token, dataUrl).subscribe({
      next: (res) => {
        this.guardandoFirma = false;
        if (this.data) {
          this.data.firmaDataUrl = res.firmaDataUrl;
          this.data.firmaActualizadaEn = res.firmaActualizadaEn;
        }
        this.limpiarTrazo();
        Swal.fire({
          icon: 'success',
          title: 'Firma registrada',
          text: 'Ya puedes firmar tu carta oferta con el botón «Firmar».',
          timer: 2200,
          showConfirmButton: false,
        });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoFirma = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar tu firma',
          text: err.error?.message ?? 'Inténtalo de nuevo en unos minutos.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  firmar(): void {
    if (!this.puedeFirmar) return;

    Swal.fire({
      icon: 'question',
      title: this.yaFirmada ? '¿Volver a firmar la carta?' : '¿Firmar tu carta oferta?',
      html: this.yaFirmada
        ? 'Se reemplazará el documento que ya firmaste por uno nuevo con tu firma actual.'
        : 'Confirma que leíste tu carta oferta y que estás de acuerdo con las condiciones. ' +
          'Tu firma quedará estampada en el documento.',
      showCancelButton: true,
      confirmButtonText: 'Firmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-logo-blue)',
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.firmando = true;
      this.cdr.detectChanges();

      this.service.firmar(this.token).subscribe({
        next: (r) => {
          this.firmando = false;
          this.firmadoAhora = true;
          if (this.data) {
            this.data.yaFirmada = true;
            this.data.firmadaEn = r.firmadaEn;
          }
          Swal.fire({ icon: 'success', title: '¡Carta firmada!', text: r.message });
          this.cdr.detectChanges();
          // Se recarga el visor: a partir de acá el backend sirve el documento CON su firma.
          this.cargarDocumento();
        },
        error: (err: HttpErrorResponse) => {
          this.firmando = false;
          Swal.fire({
            icon: 'error',
            title: 'No se pudo firmar',
            text: err.error?.message ?? 'Inténtalo de nuevo en unos minutos.',
          });
          this.cdr.detectChanges();
        },
      });
    });
  }
}
