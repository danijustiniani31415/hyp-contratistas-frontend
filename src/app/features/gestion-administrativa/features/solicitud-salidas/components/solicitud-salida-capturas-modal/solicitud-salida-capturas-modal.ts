import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DraggableImage } from '../../../../../../shared/components/draggable-image/draggable-image';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SolicitudSalidasService } from '../../services/solicitud-salidas.service';
import {
  SolicitudSalidaDetalleDto,
  TrayectoDetalleDto,
} from '../../dtos/solicitud-salida-detalle.dto';

interface PendienteRow {
  file: File | null;
  preview: string | null;
  monto: number | null;
}

@Component({
  standalone: true,
  selector: 'app-solicitud-salida-capturas-modal',
  imports: [CommonModule, FormsModule, BaseModal, DraggableImage],
  templateUrl: './solicitud-salida-capturas-modal.html',
})
export class SolicitudSalidaCapturasModal implements OnInit, OnDestroy {
  @Input({ required: true }) solicitudId!: number;
  /** Emite al cerrar: `true` si se subió al menos una captura (el padre debe recargar el listado). */
  @Output() close = new EventEmitter<boolean>();

  detalle: SolicitudSalidaDetalleDto | null = null;

  /**
   * True cuando se subió al menos una captura en esta sesión del modal. Sirve para que el padre
   * recargue el listado (y con ello `puedeRendirse`) solo si algo cambió, sin pedir datos de más.
   */
  private algoSubido = false;

  /** Map trayectoId → filas pendientes (cada trayecto tiene su propio set de filas en edición). */
  pendientesByTrayecto = new Map<number, PendienteRow[]>();

  constructor(
    private service: SolicitudSalidasService,
    private loader: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.pendientesByTrayecto.forEach((rows) =>
      rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); }),
    );
  }

  cargar(): void {
    this.loader.show();
    this.service.getDetalle(this.solicitudId).subscribe({
      next: (data) => {
        this.detalle = data;
        // Inicializa una fila vacía por cada trayecto (para invitar a agregar capturas)
        data.trayectos.forEach((t) => {
          if (!this.pendientesByTrayecto.has(t.id)) {
            this.pendientesByTrayecto.set(t.id, [{ file: null, preview: null, monto: null }]);
          }
        });
        this.loader.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
        this.close.emit(this.algoSubido);
      },
    });
  }

  cerrar(): void {
    this.pendientesByTrayecto.forEach((rows) =>
      rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); }),
    );
    this.pendientesByTrayecto.clear();
    this.close.emit(this.algoSubido);
  }

  pendientesDe(trayectoId: number): PendienteRow[] {
    return this.pendientesByTrayecto.get(trayectoId) ?? [];
  }

  agregarFila(trayectoId: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    rows.push({ file: null, preview: null, monto: null });
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  eliminarFila(trayectoId: number, index: number): void {
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    const removed = rows.splice(index, 1)[0];
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    if (rows.length === 0) rows.push({ file: null, preview: null, monto: null });
    this.pendientesByTrayecto.set(trayectoId, rows);
  }

  onFileChange(trayectoId: number, index: number, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const rows = this.pendientesByTrayecto.get(trayectoId) ?? [];
    const row = rows[index];
    if (!row) return;
    if (row.preview) URL.revokeObjectURL(row.preview);
    row.file = file;
    row.preview = URL.createObjectURL(file);
    input.value = '';
  }

  filasValidasDe(trayectoId: number): PendienteRow[] {
    return this.pendientesDe(trayectoId).filter(
      (r) => r.file !== null && r.monto !== null && r.monto >= 0,
    );
  }

  puedeSubirTrayecto(trayectoId: number): boolean {
    const rows = this.pendientesDe(trayectoId);
    if (rows.length === 0) return false;
    // Todas las filas deben estar completas (file + monto), AL MENOS UNA debe estar lista para subir
    const completas = rows.filter((r) => r.file !== null && r.monto !== null && r.monto >= 0);
    return completas.length === rows.length;
  }

  totalCapturasTrayecto(t: TrayectoDetalleDto): number {
    return t.capturas.reduce((acc, c) => acc + (c.monto || 0), 0);
  }

  subirTrayecto(trayectoId: number): void {
    if (!this.puedeSubirTrayecto(trayectoId)) return;
    const rows = this.pendientesDe(trayectoId);
    const items = rows.map((r) => ({ file: r.file as File, monto: r.monto as number }));

    this.loader.show();
    this.service.uploadCapturasToTrayecto(trayectoId, items).subscribe({
      next: (creadas) => {
        this.algoSubido = true;
        // Push creadas al trayecto correspondiente
        if (this.detalle) {
          const t = this.detalle.trayectos.find((tr) => tr.id === trayectoId);
          if (t) t.capturas = [...t.capturas, ...creadas];
        }
        // Reset filas de ese trayecto
        rows.forEach((r) => { if (r.preview) URL.revokeObjectURL(r.preview); });
        this.pendientesByTrayecto.set(trayectoId, [{ file: null, preview: null, monto: null }]);

        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: `${creadas.length} captura(s) subida(s)`,
          timer: 1800,
          showConfirmButton: false,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loader.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
