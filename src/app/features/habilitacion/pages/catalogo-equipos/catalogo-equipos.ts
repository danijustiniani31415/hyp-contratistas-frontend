import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { FabButton } from '../../../../shared/components/fab-button/fab-button';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { CatalogosHabService } from '../../services/catalogos-hab.service';
import { TipoEquipoAdminDto, ItemEquipoAdminDto } from '../../dtos/catalogos.model';

@Component({
  selector: 'app-catalogo-equipos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent, StatusBadge, AbrilBulkActionDirective, SearchInput, Paginator, FabButton],
  templateUrl: './catalogo-equipos.html',
  styleUrl: './catalogo-equipos.css',
})
export class CatalogoEquipos implements OnInit {
  loading = true;
  activeTab: 'tipos' | 'items' = 'tipos';

  tipos: TipoEquipoAdminDto[] = [];
  items: ItemEquipoAdminDto[] = [];

  searchTipos = '';
  searchItems = '';
  private readonly tiposPager = new ClientPager<TipoEquipoAdminDto>();
  private readonly itemsPager = new ClientPager<ItemEquipoAdminDto>();

  constructor(
    private catalogosService: CatalogosHabService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    forkJoin({
      tipos: this.catalogosService.getTiposEquipoAdmin(),
      items: this.catalogosService.getItemsEquipoAdmin(),
    }).subscribe({
      next: ({ tipos, items }) => {
        this.tipos = tipos;
        this.items = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  setTab(t: 'tipos' | 'items'): void {
    this.activeTab = t;
    this.cdr.markForCheck();
  }

  // ── Tipos de equipo ───────────────────────────────────────────────────

  get tiposFiltrados(): TipoEquipoAdminDto[] {
    const q = this.searchTipos.trim().toLowerCase();
    return this.tipos.filter((t) => !q || t.nombre.toLowerCase().includes(q));
  }

  get tiposPage(): TipoEquipoAdminDto[] {
    return this.tiposPager.page(this.tiposFiltrados);
  }

  get tiposCurrentPage(): number { return this.tiposPager.currentPage; }
  get tiposTotalPages(): number { return this.tiposPager.totalPages(this.tiposFiltrados); }
  onTiposSearchChange(): void { this.tiposPager.reset(); }
  tiposGoPage(p: number): void { this.tiposPager.goTo(p); }

  async nuevoTipo(): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Nuevo tipo de equipo',
      input: 'text',
      inputPlaceholder: 'Ej: Volquete',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'El nombre es requerido.' : undefined),
    });
    if (!value) return;
    this.loaderService.show();
    this.catalogosService.crearTipoEquipo(value.trim()).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  async editarTipo(tipo: TipoEquipoAdminDto): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Editar tipo de equipo',
      input: 'text',
      inputValue: tipo.nombre,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => (!v?.trim() ? 'El nombre es requerido.' : undefined),
    });
    if (!value) return;
    this.loaderService.show();
    this.catalogosService.actualizarTipoEquipo(tipo.id, value.trim()).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  toggleTipo(tipo: TipoEquipoAdminDto): void {
    this.loaderService.show();
    this.catalogosService.toggleTipoEquipo(tipo.id, !tipo.activo).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  // ── Ítems de equipo ───────────────────────────────────────────────────

  get itemsFiltrados(): ItemEquipoAdminDto[] {
    const q = this.searchItems.trim().toLowerCase();
    return this.items.filter((i) => !q || i.nombre.toLowerCase().includes(q));
  }

  get itemsPage(): ItemEquipoAdminDto[] {
    return this.itemsPager.page(this.itemsFiltrados);
  }

  get itemsCurrentPage(): number { return this.itemsPager.currentPage; }
  get itemsTotalPages(): number { return this.itemsPager.totalPages(this.itemsFiltrados); }
  onItemsSearchChange(): void { this.itemsPager.reset(); }
  itemsGoPage(p: number): void { this.itemsPager.goTo(p); }

  private tipoOptionsHtml(selectedId: number | null): string {
    const opciones = ['<option value="">— Genérico (todos los equipos) —</option>']
      .concat(
        this.tipos
          .filter((t) => t.activo)
          .map((t) => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${t.nombre}</option>`),
      );
    return opciones.join('');
  }

  async nuevoItem(): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Nuevo ítem / entregable',
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Ej: Certificado de Mantenimiento" />
        <select id="swal-tipo" class="swal2-select" style="display:flex;width:80%">${this.tipoOptionsHtml(null)}</select>
        <label style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:8px;font-size:14px">
          <input id="swal-vigencia" type="checkbox" /> Requiere fecha de vigencia
        </label>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement)?.value?.trim();
        const tipoEquipoId = (document.getElementById('swal-tipo') as HTMLSelectElement)?.value;
        const requiereVigencia = (document.getElementById('swal-vigencia') as HTMLInputElement)?.checked ?? false;
        if (!nombre) {
          Swal.showValidationMessage('El nombre es requerido.');
          return;
        }
        return { nombre, tipoEquipoId: tipoEquipoId ? Number(tipoEquipoId) : null, requiereVigencia };
      },
    });
    if (!value) return;
    this.loaderService.show();
    this.catalogosService.crearItemEquipo(value).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  async editarItem(item: ItemEquipoAdminDto): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Editar ítem / entregable',
      html: `
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${item.nombre.replace(/"/g, '&quot;')}" />
        <select id="swal-tipo" class="swal2-select" style="display:flex;width:80%">${this.tipoOptionsHtml(item.tipoEquipoId)}</select>
        <label style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:8px;font-size:14px">
          <input id="swal-vigencia" type="checkbox" ${item.requiereVigencia ? 'checked' : ''} /> Requiere fecha de vigencia
        </label>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const nombre = (document.getElementById('swal-nombre') as HTMLInputElement)?.value?.trim();
        const tipoEquipoId = (document.getElementById('swal-tipo') as HTMLSelectElement)?.value;
        const requiereVigencia = (document.getElementById('swal-vigencia') as HTMLInputElement)?.checked ?? false;
        if (!nombre) {
          Swal.showValidationMessage('El nombre es requerido.');
          return;
        }
        return { nombre, tipoEquipoId: tipoEquipoId ? Number(tipoEquipoId) : null, requiereVigencia };
      },
    });
    if (!value) return;
    this.loaderService.show();
    this.catalogosService.actualizarItemEquipo(item.id, value).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }

  toggleItem(item: ItemEquipoAdminDto): void {
    this.loaderService.show();
    this.catalogosService.toggleItemEquipo(item.id, !item.activo).subscribe({
      next: () => { this.loaderService.hide(); this.cargar(); },
      error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
    });
  }
}
