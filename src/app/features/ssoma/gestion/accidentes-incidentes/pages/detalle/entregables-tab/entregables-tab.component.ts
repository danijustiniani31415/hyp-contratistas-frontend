import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccidenteIncidenteService } from '../../../accidente-incidente.service';
import {
  EntregableDto,
  ActualizarEntregableRequest,
  ESTADOS_ENTREGABLE,
} from '../../../accidente-incidente.dtos';
import { SearchSelect } from '../../../../../../../shared/components/search-select/search-select';
import { DocumentViewer } from '../../../../../../../shared/components/document-viewer/document-viewer';

@Component({
  selector: 'app-entregables-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, DocumentViewer],
  templateUrl: './entregables-tab.component.html',
  styleUrl: './entregables-tab.component.css',
})
export class EntregablesTabComponent implements OnInit {
  @Input() accidenteId!: number;

  entregables: EntregableDto[] = [];
  cargando = true;
  editandoId?: number;
  editForm: Partial<ActualizarEntregableRequest> = {};
  guardando = false;
  subiendoId?: number;
  visorUrl = '';
  visorNombre = '';

  readonly estadosEntregable = ESTADOS_ENTREGABLE;
  readonly estadosEntregableOpts = ESTADOS_ENTREGABLE.map((s) => ({ value: s, label: s }));
  readonly tipoMedidaOpts = [
    { value: 'Correctiva', label: 'Correctiva' },
    { value: 'Preventiva', label: 'Preventiva' },
  ];
  readonly estadoMedidaOpts = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'En proceso', label: 'En proceso' },
    { value: 'Cumplido', label: 'Cumplido' },
    { value: 'No aplica', label: 'No aplica' },
  ];

  // ── Medidas de control ─────────────────────────────────────────────────────
  medidas: any[] = [];
  editandoMedidaId?: number;
  medidaForm: any = {};
  guardandoMedida = false;
  nuevaMedida = '';

  constructor(
    private service: AccidenteIncidenteService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.cargarMedidas();
  }

  cargar(): void {
    this.cargando = true;
    this.service.getEntregables(this.accidenteId).subscribe({
      next: (list) => {
        this.entregables = list;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  editar(e: EntregableDto): void {
    this.editandoId = e.id;
    this.editForm = {
      estado: e.estado,
      fechaLimite: e.fechaLimite ?? '',
      observacion: e.observacion ?? '',
      responsables: e.responsables.filter((r) => !r.workerId).map((r) => r.nombre),
      responsableWorkerIds: e.responsables.filter((r) => r.workerId).map((r) => r.workerId!),
    };
    this.cdr.detectChanges();
  }

  cancelarEdicion(): void {
    this.editandoId = undefined;
    this.cdr.detectChanges();
  }

  guardar(e: EntregableDto): void {
    this.guardando = true;
    const req: ActualizarEntregableRequest = {
      estado: this.editForm.estado ?? e.estado,
      fechaLimite: this.editForm.fechaLimite || undefined,
      observacion: this.editForm.observacion || undefined,
      responsables: this.editForm.responsables ?? [],
      responsableWorkerIds: this.editForm.responsableWorkerIds ?? [],
    };
    this.service.actualizarEntregable(e.id, req).subscribe({
      next: () => {
        this.editandoId = undefined;
        this.guardando = false;
        this.cargar();
      },
      error: () => {
        this.guardando = false;
        this.cdr.detectChanges();
      },
    });
  }

  onArchivoSelect(event: Event, e: EntregableDto): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.subiendoId = e.id;
    this.cdr.detectChanges();
    this.service.subirArchivoEntregable(e.id, input.files[0]).subscribe({
      next: () => {
        this.subiendoId = undefined;
        this.cargar();
      },
      error: () => {
        this.subiendoId = undefined;
        this.cdr.detectChanges();
      },
    });
    input.value = '';
  }

  verArchivo(url: string, nombre: string): void {
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  eliminarArchivo(archivoId: number): void {
    if (!confirm('¿Eliminar este archivo?')) return;
    this.service.eliminarArchivoEntregable(archivoId).subscribe({ next: () => this.cargar() });
  }

  estadoClass(estado: string): string {
    return {
      Pendiente: 'chip chip--pendiente',
      Presentado: 'chip chip--presentado',
      Observado: 'chip chip--observado',
      Aprobado: 'chip chip--aprobado',
      'No aplica': 'chip chip--noaplica',
    }[estado] ?? 'chip';
  }

  // ── Métodos medidas de control ─────────────────────────────────────────────

  cargarMedidas(): void {
    this.service.getMedidas(this.accidenteId).subscribe({
      next: (m) => { this.medidas = m; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  editarMedida(m: any): void {
    this.editandoMedidaId = m.id;
    this.medidaForm = { ...m };
    this.cdr.detectChanges();
  }

  cancelarMedida(): void {
    this.editandoMedidaId = undefined;
    this.medidaForm = {};
    this.cdr.detectChanges();
  }

  guardarMedida(m: any): void {
    this.guardandoMedida = true;
    this.service.updateMedida(m.id, this.medidaForm).subscribe({
      next: () => {
        this.guardandoMedida = false;
        this.editandoMedidaId = undefined;
        this.cargarMedidas();
      },
      error: () => { this.guardandoMedida = false; this.cdr.detectChanges(); }
    });
  }

  eliminarMedida(id: number): void {
    if (!confirm('¿Eliminar esta medida de control?')) return;
    this.service.deleteMedida(id).subscribe({ next: () => this.cargarMedidas() });
  }

  agregarMedida(): void {
    if (!this.nuevaMedida.trim()) return;
    this.service.addMedida(this.accidenteId, { descripcion: this.nuevaMedida, estado: 'Pendiente' }).subscribe({
      next: () => { this.nuevaMedida = ''; this.cargarMedidas(); },
    });
  }
}
