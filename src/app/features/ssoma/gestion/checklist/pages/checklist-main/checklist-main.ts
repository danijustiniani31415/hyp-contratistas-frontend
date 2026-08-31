import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ChecklistService } from '../../checklist.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { ProyectoHabilitadoService } from '../../../../shared/services/proyecto-habilitado.service';
import {
  ChecklistPlantillaListDto,
  ChecklistPlantillaDetalleDto,
  ChecklistPlantillaItemDto,
  ChecklistProyectoCardDto,
  ChecklistProyectoDetalleDto,
  ChecklistProyectoItemDto,
} from '../../checklist.dtos';
import {
  AbrilPageHeaderComponent,
  AbrilPageTab,
} from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { Paginator } from '../../../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../../../shared/utils/client-pager';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

type Tab = 'resumen' | 'plantillas';

@Component({
  selector: 'app-checklist-main',
  standalone: true,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, Paginator, SearchInput, SearchSelect],
  templateUrl: './checklist-main.html',
  styleUrl: './checklist-main.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistMainComponent implements OnInit {
  private svc = inject(ChecklistService);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);
  private cdr = inject(ChangeDetectorRef);
  private proyectoHabilitadoSvc = inject(ProyectoHabilitadoService);

  tab: Tab = 'resumen';

  // Proyectos
  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;

  // Resumen de checklists del proyecto
  checklistCards: ChecklistProyectoCardDto[] = [];
  loadingResumen = false;

  // Detalle de un checklist seleccionado
  detalleVisible = false;
  detalle: ChecklistProyectoDetalleDto | null = null;
  loadingDetalle = false;

  // Items guardando
  guardandoItemId: number | null = null;
  observacionTemp: { [itemId: number]: string } = {};

  // Activar checklist opcional
  plantillas: ChecklistPlantillaListDto[] = [];
  loadingPlantillas = false;

  plantillasSearchText = '';
  private readonly plantillasPager = new ClientPager<ChecklistPlantillaListDto>();

  get plantillasFiltradas(): ChecklistPlantillaListDto[] {
    return this.plantillas.filter(
      (p) => !this.plantillasSearchText.trim() || SearchInput.matches(p.nombre ?? '', this.plantillasSearchText),
    );
  }

  get plantillasCurrentPage(): number {
    return this.plantillasPager.currentPage;
  }

  get plantillasTotalPages(): number {
    return this.plantillasPager.totalPages(this.plantillasFiltradas);
  }

  get plantillasPaged(): ChecklistPlantillaListDto[] {
    return this.plantillasPager.page(this.plantillasFiltradas);
  }

  onPlantillasFilterChange(): void {
    this.plantillasPager.reset();
  }

  changePlantillasPage(page: number): void {
    this.plantillasPager.goTo(page);
  }

  // Ver plantilla como modelo (items) + edición cooperativa
  plantillaDetalleVisible = false;
  plantillaDetalle: ChecklistPlantillaDetalleDto | null = null;
  loadingPlantillaDetalle = false;
  editandoItemId: number | null = null;
  itemEditTexto = '';
  itemEditAdjunto = false;
  itemEditActivo = true;
  guardandoPlantillaItem = false;
  nuevoItemTexto = '';
  nuevoItemAdjunto = false;
  agregandoItem = false;
  activandoId: number | null = null;

  get headerTabs(): AbrilPageTab[] {
    return [
      { label: 'Por Proyecto', icono: 'ti-building', active: this.tab === 'resumen' },
      { label: 'Catálogo de Plantillas', icono: 'ti-template', active: this.tab === 'plantillas' },
    ];
  }

  onTabClick(t: AbrilPageTab): void {
    if (t.label === 'Por Proyecto') this.setTab('resumen');
    else this.setTab('plantillas');
  }

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'plantillas' && this.plantillas.length === 0) this.loadPlantillas();
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadProyectos();
  }

  private loadProyectos(): void {
    this.proyectoHabilitadoSvc.getHabilitados().subscribe({
      next: (res) => {
        this.proyectos = res.map((p) => ({
          projectId: p.projectId,
          projectDescription: p.projectDescription,
        }));
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  onProyectoChange(): void {
    if (!this.proyectoId) {
      this.checklistCards = [];
      this.detalleVisible = false;
      this.cdr.markForCheck();
      return;
    }
    this.detalleVisible = false;
    this.loadResumen();
  }

  loadResumen(): void {
    if (!this.proyectoId) return;
    this.loadingResumen = true;
    this.cdr.markForCheck();
    this.svc.getResumenProyecto(this.proyectoId).subscribe({
      next: (res) => {
        this.checklistCards = res.checklists;
        this.loadingResumen = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingResumen = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  abrirDetalle(card: ChecklistProyectoCardDto): void {
    this.detalleVisible = true;
    this.detalle = null;
    this.loadingDetalle = true;
    this.observacionTemp = {};
    this.cdr.markForCheck();
    this.svc.getChecklistDetalle(card.checklistProyectoId).subscribe({
      next: (d) => {
        this.detalle = d;
        this.loadingDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingDetalle = false;
        this.detalleVisible = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalle = null;
    this.cdr.markForCheck();
  }

  toggleItem(item: ChecklistProyectoItemDto): void {
    if (this.guardandoItemId === item.id) return;
    this.guardandoItemId = item.id;
    this.cdr.markForCheck();

    const nuevoEstado = !item.completado;
    this.svc
      .toggleItem(item.id, {
        completado: nuevoEstado,
        observacion: this.observacionTemp[item.id] || undefined,
      })
      .subscribe({
        next: (res) => {
          item.completado = nuevoEstado;
          item.fechaCompletado = nuevoEstado ? new Date().toISOString() : undefined;
          this.guardandoItemId = null;
          // Actualizar porcentaje en el detalle
          if (this.detalle) {
            this.detalle.porcentajeCompletado = res.porcentaje;
            this.detalle.estado = res.estado;
          }
          // Actualizar card del resumen
          const card = this.checklistCards.find(
            (c) => c.checklistProyectoId === this.detalle?.id,
          );
          if (card) {
            card.porcentajeCompletado = res.porcentaje;
            card.estado = res.estado as any;
            card.itemsCompletados = this.detalle!.items.filter((i) => i.completado).length;
          }
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoItemId = null;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  // ─── Activar checklist opcional ────────────────────────────────────────────

  loadPlantillas(): void {
    this.loadingPlantillas = true;
    this.cdr.markForCheck();
    this.svc.getPlantillas().subscribe({
      next: (p) => {
        this.plantillas = p;
        this.plantillasPager.reset();
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPlantillas = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Ver plantilla como modelo (con items) ─────────────────────────────────

  verPlantilla(p: ChecklistPlantillaListDto): void {
    this.plantillaDetalleVisible = true;
    this.plantillaDetalle = null;
    this.loadingPlantillaDetalle = true;
    this.nuevoItemTexto = '';
    this.nuevoItemAdjunto = false;
    this.cdr.markForCheck();
    this.svc.getPlantillaDetalle(p.id).subscribe({
      next: (d) => {
        this.plantillaDetalle = d;
        this.loadingPlantillaDetalle = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingPlantillaDetalle = false;
        this.plantillaDetalleVisible = false;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarPlantillaDetalle(): void {
    this.plantillaDetalleVisible = false;
    this.plantillaDetalle = null;
    this.editandoItemId = null;
    this.cdr.markForCheck();
  }

  agregarItemPlantilla(): void {
    if (!this.plantillaDetalle || !this.nuevoItemTexto.trim() || this.agregandoItem) return;
    this.agregandoItem = true;
    this.cdr.markForCheck();
    this.svc
      .addItemToPlantilla(this.plantillaDetalle.id, {
        descripcion: this.nuevoItemTexto.trim(),
        tieneAdjuntoRef: this.nuevoItemAdjunto,
      })
      .subscribe({
        next: (item) => {
          this.plantillaDetalle!.items.push(item);
          this.plantillaDetalle!.totalItems = this.plantillaDetalle!.items.length;
          const card = this.plantillas.find((pl) => pl.id === this.plantillaDetalle!.id);
          if (card) card.totalItems = this.plantillaDetalle!.totalItems;
          this.nuevoItemTexto = '';
          this.nuevoItemAdjunto = false;
          this.agregandoItem = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.agregandoItem = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  editarItemPlantilla(item: ChecklistPlantillaItemDto): void {
    this.editandoItemId = item.id;
    this.itemEditTexto = item.descripcion;
    this.itemEditAdjunto = item.tieneAdjuntoRef;
    this.itemEditActivo = item.activo;
    this.cdr.markForCheck();
  }

  cancelarEdicionItem(): void {
    this.editandoItemId = null;
    this.cdr.markForCheck();
  }

  guardarItemPlantilla(item: ChecklistPlantillaItemDto): void {
    if (!this.itemEditTexto.trim() || this.guardandoPlantillaItem) return;
    this.guardandoPlantillaItem = true;
    this.cdr.markForCheck();
    this.svc
      .updatePlantillaItem(item.id, {
        descripcion: this.itemEditTexto.trim(),
        tieneAdjuntoRef: this.itemEditAdjunto,
        activo: this.itemEditActivo,
      })
      .subscribe({
        next: () => {
          item.descripcion = this.itemEditTexto.trim();
          item.tieneAdjuntoRef = this.itemEditAdjunto;
          item.activo = this.itemEditActivo;
          this.guardandoPlantillaItem = false;
          this.editandoItemId = null;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoPlantillaItem = false;
          this.errorSvc.handleError(err);
          this.cdr.markForCheck();
        },
      });
  }

  activarChecklist(plantillaId: number): void {
    if (!this.proyectoId || this.activandoId === plantillaId) return;
    this.activandoId = plantillaId;
    this.cdr.markForCheck();
    this.svc.activarChecklist(this.proyectoId, { plantillaId }).subscribe({
      next: () => {
        this.activandoId = null;
        this.loadResumen();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.activandoId = null;
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  plantillaYaActiva(plantillaId: number): boolean {
    return this.checklistCards.some((c) => c.plantillaId === plantillaId);
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  estadoClass(estado: string): string {
    switch (estado) {
      case 'completado': return 'estado-completado';
      case 'en_progreso': return 'estado-en-progreso';
      default: return 'estado-pendiente';
    }
  }

  estadoLabel(estado: string): string {
    switch (estado) {
      case 'completado': return 'Completado';
      case 'en_progreso': return 'En progreso';
      default: return 'Pendiente';
    }
  }

  porcentajeColor(pct: number): string {
    if (pct === 100) return '#16a34a';
    if (pct >= 50) return '#d97706';
    return '#1e3a5f';
  }
}
