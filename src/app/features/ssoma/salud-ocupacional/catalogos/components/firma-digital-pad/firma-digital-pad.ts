import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { CatalogosSaludService } from '../../../services/catalogos-salud.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';

/**
 * Lienzo para que el médico dibuje su firma digital con mouse/touch, lo más parecida
 * posible a la de su DNI. Se exporta como PNG con fondo transparente (el canvas nunca se
 * rellena de blanco, solo se limpia) para que se vea bien impresa en el SSO-FO-149.
 */
@Component({
  selector: 'app-firma-digital-pad',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel],
  templateUrl: './firma-digital-pad.html',
  styleUrl: './firma-digital-pad.css',
})
export class FirmaDigitalPad implements AfterViewInit, OnChanges {
  @Input() open = false;
  @Input() medicoId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private dibujando = false;
  private tieneTrazo = false;
  saving = false;

  ngAfterViewInit(): void {
    this.setupCanvas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.tieneTrazo = false;
      this.saving = false;
      // El canvas puede no existir aún la primera vez que se abre (ngIf recién lo crea).
      setTimeout(() => this.setupCanvas(), 0);
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = '#111827';
    }
  }

  private posDesdeEvento(ev: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const punto = 'touches' in ev ? ev.touches[0] : ev;
    return {
      x: (punto.clientX - rect.left) * (canvas.width / rect.width),
      y: (punto.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  onStart(ev: MouseEvent | TouchEvent): void {
    ev.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.dibujando = true;
    const { x, y } = this.posDesdeEvento(ev, canvas);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onMove(ev: MouseEvent | TouchEvent): void {
    if (!this.dibujando) return;
    ev.preventDefault();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    const { x, y } = this.posDesdeEvento(ev, canvas);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.tieneTrazo = true;
  }

  onEnd(): void {
    this.dibujando = false;
  }

  limpiar(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.tieneTrazo = false;
  }

  get canGuardar(): boolean {
    return this.tieneTrazo && !this.saving && !!this.medicoId;
  }

  guardar(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.canGuardar || !this.medicoId) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      this.saving = true;
      this.loaderService.show();
      this.catalogos.subirFirmaDigital(this.medicoId!, blob, 'firma-digital.png').subscribe({
        next: () => {
          this.saving = false;
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Firma digital guardada', timer: 1500, showConfirmButton: false });
          this.saved.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    }, 'image/png');
  }

  constructor(
    private catalogos: CatalogosSaludService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  close(): void {
    this.closed.emit();
  }
}
