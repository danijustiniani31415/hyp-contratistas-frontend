import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

import { SignaturePad } from '../signature-pad/signature-pad';
import { FirmaPersonalService } from '../../../core/firma/firma-personal.service';
import { FirmaPersonalDto } from '../../../core/firma/firma-personal.dto';
import { LoaderService } from '../../../core/services/loader.service';
import { ErrorService } from '../../../core/services/error.service';

/**
 * Panel para registrar la firma del usuario logueado: muestra la que tiene hoy (si tiene) y un
 * lienzo para dibujar una nueva.
 *
 * Es UNA firma por persona (`person.signature_*`), así que este panel es el mismo en las dos
 * pantallas de configuración que la ofrecen —Contabilidad → Firma y Gestión Administrativa →
 * Tu firma— y también dentro del modal que salta al firmar una planilla sin tener firma. Antes
 * cada pantalla tenía su copia; si el lienzo o las validaciones se separaban, la misma ficha
 * quedaba con firmas distintas según por dónde se registró.
 */
@Component({
  selector: 'app-firma-personal',
  standalone: true,
  imports: [CommonModule, SignaturePad],
  templateUrl: './firma-personal.html',
})
export class FirmaPersonal implements OnInit {
  @ViewChild('pad') pad!: SignaturePad;

  /** Texto de la fila de estado. Cada pantalla lo ajusta a lo que se firma ahí. */
  @Input() descripcion = 'Firma que se estampa en los documentos que firmes';

  /** Emite la firma recién guardada (la usa el modal para continuar con la acción pendiente). */
  @Output() guardada = new EventEmitter<FirmaPersonalDto>();

  current: FirmaPersonalDto | null = null;
  hasDrawing = false;

  constructor(
    private service: FirmaPersonalService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loaderService.show();
    this.service.get().subscribe({
      next: (res) => {
        this.current = res;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  clear(): void {
    this.pad?.clear();
  }

  save(): void {
    const dataUrl = this.pad?.toDataUrl();
    if (!dataUrl) {
      Swal.fire({ icon: 'warning', title: 'Firma vacía', text: 'Dibuja la firma antes de guardar.' });
      return;
    }

    this.loaderService.show();
    this.service.save(dataUrl).subscribe({
      next: (res) => {
        this.current = res;
        this.clear();
        this.loaderService.hide();
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: 'Firma guardada', timer: 1500, showConfirmButton: false });
        this.guardada.emit(res);
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
