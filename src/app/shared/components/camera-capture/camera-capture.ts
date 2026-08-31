import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Cámara embebida para selfies con timestamp. Nunca sube nada por sí sola — solo captura un
 * frame a base64 JPEG cuando el padre llama a `capturarFoto()`. Si el navegador niega el permiso
 * o no hay cámara, muestra un estado de error claro con reintento (nunca una pantalla en blanco).
 */
@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.css',
})
export class CameraCapture implements OnInit, OnDestroy {
  @Input() facingMode: 'user' | 'environment' = 'user';
  /** Se emite cuando el video ya está reproduciendo — el padre puede usar `videoElement` para
   * calcular el embedding facial en vivo antes de que el usuario capture. */
  @Output() listo = new EventEmitter<void>();
  @Output() errorCamara = new EventEmitter<string>();

  @ViewChild('video', { static: true }) private videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  cargando = true;
  mensajeError: string | null = null;
  private stream: MediaStream | null = null;

  get videoElement(): HTMLVideoElement {
    return this.videoRef.nativeElement;
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.iniciar();
  }

  ngOnDestroy(): void {
    this.detener();
  }

  async iniciar(): Promise<void> {
    this.cargando = true;
    this.mensajeError = null;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.mensajeError = 'Este navegador no permite acceder a la cámara. Usa Chrome o Safari actualizado.';
      this.cargando = false;
      this.cdr.detectChanges();
      this.errorCamara.emit(this.mensajeError);
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode, width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false,
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cargando = false;
      this.cdr.detectChanges();
      this.listo.emit();
    } catch (err: any) {
      this.cargando = false;
      this.mensajeError =
        err?.name === 'NotAllowedError'
          ? 'Se denegó el permiso de cámara. Habilítalo en la configuración del navegador e intenta de nuevo.'
          : err?.name === 'NotFoundError'
            ? 'No se encontró ninguna cámara en este dispositivo.'
            : 'No se pudo abrir la cámara. Intenta de nuevo.';
      this.cdr.detectChanges();
      this.errorCamara.emit(this.mensajeError);
    }
  }

  /** Dibuja el frame actual del video en un canvas y devuelve un JPEG en base64 (sin prefijo data:URI). */
  capturarFoto(): string | null {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1] ?? null;
  }

  detener(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
