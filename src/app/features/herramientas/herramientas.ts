import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  HerramientasService,
  PrestamoListItem,
  PrestamoDetalle,
  PrestamoCreate,
} from '../../core/services/herramientas.service';
import { PersonasService, PersonaListItem, CatalogoItem, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-herramientas',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './herramientas.html',
  styleUrl: './herramientas.css',
})
export class Herramientas implements OnInit {
  prestamos = signal<PrestamoListItem[]>([]);
  search = '';
  soloAbiertos = true;
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  personas = signal<PersonaListItem[]>([]);
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  proyectos = signal<CatalogoItem[]>([]);
  productosRetornables = signal<ProductoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: PrestamoCreate = this.formVacio();

  showDetalle = signal(false);
  detalle = signal<PrestamoDetalle | null>(null);

  constructor(
    private service: HerramientasService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.list('', 1, 200).subscribe((r) => this.personas.set(r.data));
    this.personasService.getCatalogos().subscribe((c) => {
      this.almacenes.set(c.almacenes);
      this.proyectos.set(c.proyectos);
    });
    this.catalogoService.listProductos('', 1, 200).subscribe((r) => {
      this.productosRetornables.set(r.data.filter((p) => p.esRetornable));
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, this.soloAbiertos, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.prestamos.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
  }

  private buscarDebounce?: ReturnType<typeof setTimeout>;
  onSearchInput(): void {
    clearTimeout(this.buscarDebounce);
    this.buscarDebounce = setTimeout(() => this.onFiltroChange(), 350);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  // ── Crear préstamo ──────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = this.formVacio();
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', cantidad: 1 });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  guardar(): void {
    if (!this.form.almacenId || !this.form.personaId || !this.form.items.length) return;
    this.error.set('');
    this.guardando.set(true);
    this.service.crear(this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.showModal.set(false);
        this.page.set(1);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo registrar el préstamo.');
      },
    });
  }

  private formVacio(): PrestamoCreate {
    return { almacenId: 0, personaId: 0, proyectoId: null, fechaDevolucionEstimada: null, observacion: '', items: [{ productoId: 0, talla: '', cantidad: 1 }] };
  }

  // ── Detalle y devolución ─────────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  devolver(itemId: number): void {
    const prestamoId = this.detalle()?.id;
    if (!prestamoId) return;
    Swal.fire({
      title: '¿Cómo vuelve este ítem?',
      input: 'select',
      inputOptions: { DEVUELTO: 'Devuelto en buen estado', PERDIDO: 'Perdido', DANADO: 'Dañado' },
      inputValue: 'DEVUELTO',
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.service.devolverItem(prestamoId, itemId, res.value).subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.cargar();
        },
        error: (err) => {
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'No se pudo registrar la devolución.' });
        },
      });
    });
  }
}
