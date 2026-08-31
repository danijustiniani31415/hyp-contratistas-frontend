import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Canvas para dibujar una firma con el mouse o el dedo.
 *
 * Es el mismo lienzo en los dos sitios donde alguien registra su firma —la del Gerente General en
 * Contabilidad y la del postulante en su carta oferta de Onboarding—, y las dos terminan en las
 * mismas columnas `person.signature_*` y se estampan con el mismo helper del backend. Por eso el
 * lienzo vive acá y no duplicado en cada feature: si el trazo o el tamaño exportado difirieran, la
 * misma ficha podría quedar con firmas de distinta calidad según por dónde se registró.
 *
 * El componente NO guarda nada: solo dibuja y expone la imagen. Quién la persiste y contra qué
 * endpoint es decisión de la feature que lo usa.
 *
 * Uso:
 * ```html
 * <app-signature-pad #pad (drawingChange)="hayTrazo = $event" />
 * <button [disabled]="!hayTrazo" (click)="guardar(pad.toDataUrl())">Guardar</button>
 * ```
 */
@Component({
  standalone: true,
  selector: 'app-signature-pad',
  imports: [CommonModule],
  templateUrl: './signature-pad.html',
})
export class SignaturePad implements AfterViewInit {
  /**
   * Resolución del lienzo en píxeles. Es la del PNG exportado, así que de acá depende qué tan nítida
   * se ve la firma estampada en el PDF. El alto/ancho en pantalla los define el CSS: el canvas se
   * estira al ancho disponible y las coordenadas del puntero se escalan solas.
   */
  @Input() anchoCanvas = 600;
  @Input() altoCanvas = 200;

  /** Color y grosor del trazo. */
  @Input() color = '#111111';
  @Input() grosor = 2.5;

  /** Emite true en el primer trazo y false al limpiar: es lo que habilita el botón de guardar. */
  @Output() drawingChange = new EventEmitter<boolean>();

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  /** true si hay algo dibujado en el lienzo. El padre lo recibe por `drawingChange`. */
  hasDrawing = false;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.ctx.lineWidth = this.grosor;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.color;
  }

  /**
   * PNG del lienzo como data URL, listo para mandar al backend. Devuelve null si no hay nada
   * dibujado, para que el padre no envíe un lienzo en blanco.
   */
  toDataUrl(): string | null {
    if (!this.hasDrawing) return null;
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  /** Borra el lienzo. */
  clear(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
    this.setDrawing(false);
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────

  /**
   * Posición del puntero en coordenadas del canvas. El canvas se muestra estirado por CSS, así que
   * hay que reescalar: sin esto el trazo se dibuja desplazado respecto al cursor.
   */
  private pos(e: PointerEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  onPointerDown(e: PointerEvent): void {
    if (!this.ctx) return;
    e.preventDefault();
    // setPointerCapture: si el dedo o el mouse se sale del canvas a mitad del trazo, los eventos
    // siguen llegando acá y la línea no se corta.
    this.canvasRef.nativeElement.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.drawing = true;
    this.lastX = p.x;
    this.lastY = p.y;
    // Un punto/clic simple deja una marca.
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.ctx.lineWidth / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
    this.setDrawing(true);
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.drawing || !this.ctx) return;
    e.preventDefault();
    const p = this.pos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.lastX = p.x;
    this.lastY = p.y;
  }

  onPointerUp(): void {
    this.drawing = false;
  }

  private setDrawing(valor: boolean): void {
    if (this.hasDrawing === valor) return;
    this.hasDrawing = valor;
    this.drawingChange.emit(valor);
  }
}
