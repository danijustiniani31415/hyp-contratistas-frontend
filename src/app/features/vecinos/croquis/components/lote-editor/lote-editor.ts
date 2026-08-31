import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../../environments/environment';
import { BaseModal } from '../../../../../shared/components/base-modal/base-modal';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { CroquisService } from '../../services/croquis.service';
import { CroquisLoteDTO, ProjectCroquisItemDTO } from '../../dtos/croquis.dto';

/** Lote en edición (con su polígono en coordenadas relativas 0–1). */
interface EditableLote {
  /** Id del lote existente (null si es nuevo). Se conserva para preservar el lote (y sus vecinos) al guardar. */
  projectCroquisLoteId: number | null;
  numeroLote: string;
  puntos: number[][];
}

@Component({
  selector: 'app-lote-editor',
  standalone: true,
  imports: [CommonModule, BaseModal],
  templateUrl: './lote-editor.html',
})
export class LoteEditor implements OnInit {
  @Input({ required: true }) croquis!: ProjectCroquisItemDTO;
  @Output() closeModal = new EventEmitter<void>();

  lotes: EditableLote[] = [];

  // Estado de dibujo.
  drawing = false;
  currentPoints: number[][] = [];
  selectedIndex: number | null = null;

  /** Paleta para distinguir lotes. */
  readonly colors = ['#64BC04', '#0086A5', '#F9A826', '#D30000', '#7C3AED', '#DB2777', '#0D9488', '#CA8A04'];

  constructor(
    private service: CroquisService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    if (!this.croquis.projectCroquisId) return;
    this.loaderService.show();
    this.service.getLotes(this.croquis.projectCroquisId).subscribe({
      next: (res) => {
        this.lotes = res.map((l) => ({
          projectCroquisLoteId: l.projectCroquisLoteId ?? null,
          numeroLote: l.numeroLote,
          puntos: l.puntos,
        }));
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  imageSrc(): string {
    const url = this.croquis.imageUrl ?? '';
    return url.startsWith('http') ? url : environment.apiUrl.replace(/\/$/, '') + url;
  }

  colorFor(i: number): string {
    return this.colors[i % this.colors.length];
  }

  // ── Dibujo ─────────────────────────────────────────────────────────────
  startDrawing(): void {
    this.drawing = true;
    this.currentPoints = [];
    this.selectedIndex = null;
  }

  /** Clic sobre el lienzo: agrega un vértice (en coords relativas 0–1). */
  onCanvasClick(event: MouseEvent): void {
    if (!this.drawing) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    this.currentPoints = [...this.currentPoints, [x, y]];
  }

  undoPoint(): void {
    this.currentPoints = this.currentPoints.slice(0, -1);
  }

  cancelDrawing(): void {
    this.drawing = false;
    this.currentPoints = [];
  }

  async finishLote(): Promise<void> {
    if (this.currentPoints.length < 3) return;
    const { value: numero } = await Swal.fire({
      title: 'Número / etiqueta del lote',
      input: 'text',
      inputPlaceholder: 'Ej. 14',
      showCancelButton: true,
      confirmButtonText: 'Guardar lote',
      confirmButtonColor: '#64BC04',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un número o etiqueta' : null),
    });
    if (!numero) return;

    this.lotes = [
      ...this.lotes,
      { projectCroquisLoteId: null, numeroLote: numero.trim(), puntos: this.currentPoints },
    ];
    this.drawing = false;
    this.currentPoints = [];
  }

  /** Renombra un lote (nuevo o ya registrado); el cambio se persiste al Guardar. */
  async renameLote(i: number): Promise<void> {
    const lote = this.lotes[i];
    if (!lote) return;
    const { value: numero } = await Swal.fire({
      title: 'Número / etiqueta del lote',
      input: 'text',
      inputValue: lote.numeroLote,
      inputPlaceholder: 'Ej. 14',
      showCancelButton: true,
      confirmButtonText: 'Renombrar',
      confirmButtonColor: '#64BC04',
      inputValidator: (v) => (!v?.trim() ? 'Ingresa un número o etiqueta' : null),
    });
    if (!numero) return;

    this.lotes = this.lotes.map((l, idx) =>
      idx === i ? { ...l, numeroLote: numero.trim() } : l,
    );
  }

  removeLote(i: number): void {
    this.lotes = this.lotes.filter((_, idx) => idx !== i);
    if (this.selectedIndex === i) this.selectedIndex = null;
  }

  selectLote(i: number): void {
    this.selectedIndex = this.selectedIndex === i ? null : i;
  }

  // ── Helpers de render (coords relativas → viewBox 0..100) ────────────────
  pointsToSvg(puntos: number[][]): string {
    return puntos.map((p) => `${p[0] * 100},${p[1] * 100}`).join(' ');
  }

  centroid(puntos: number[][]): { x: number; y: number } {
    const n = puntos.length || 1;
    const sx = puntos.reduce((a, p) => a + p[0], 0) / n;
    const sy = puntos.reduce((a, p) => a + p[1], 0) / n;
    return { x: sx * 100, y: sy * 100 };
  }

  // ── Guardar ──────────────────────────────────────────────────────────────
  save(): void {
    if (!this.croquis.projectCroquisId) return;
    const payload: CroquisLoteDTO[] = this.lotes.map((l) => ({
      projectCroquisLoteId: l.projectCroquisLoteId,
      numeroLote: l.numeroLote,
      puntos: l.puntos,
    }));

    this.loaderService.show();
    this.service.saveLotes(this.croquis.projectCroquisId, payload).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ title: 'Lotes guardados exitosamente', icon: 'success', draggable: true });
        this.closeModal.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  close(): void {
    this.closeModal.emit();
  }
}
