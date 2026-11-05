import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  AlmacenService,
  AlmacenGestion,
  StockListItem,
  MovimientoListItem,
  RegistrarMovimiento,
} from '../../core/services/almacen.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './almacen.html',
  styleUrl: './almacen.css',
})
export class AlmacenComponent implements OnInit {
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  almacenFiltro: number | null = null;
  search = '';
  stock = signal<StockListItem[]>([]);
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  movimientos = signal<MovimientoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: RegistrarMovimiento = this.formVacio();

  // ── Gestionar almacenes (datos que SUNAT ve en la guía de remisión) ──
  showAlmacenes = signal(false);
  almacenesGestion = signal<AlmacenGestion[]>([]);
  almacenEditando = signal<AlmacenGestion | null>(null);
  formAlmacen = { direccion: '', ubigeo: '', codigoEstablecimientoSunat: '0000' };
  guardandoAlmacen = signal(false);
  errorAlmacen = signal('');

  constructor(
    private service: AlmacenService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 5000).subscribe((r) => this.productos.set(r.data));
    this.cargar();
    this.cargarMovimientos();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listStock(this.almacenFiltro, this.search, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.stock.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  cargarMovimientos(): void {
    this.service.listMovimientos(this.almacenFiltro, 1, 10).subscribe((r) => this.movimientos.set(r.data));
  }

  onFiltroChange(): void {
    this.page.set(1);
    this.cargar();
    this.cargarMovimientos();
  }

  onSearch(): void {
    this.page.set(1);
    this.cargar();
  }

  private buscarDebounce?: ReturnType<typeof setTimeout>;
  onSearchInput(): void {
    clearTimeout(this.buscarDebounce);
    this.buscarDebounce = setTimeout(() => this.onSearch(), 350);
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  abrirNuevo(): void {
    this.form = this.formVacio();
    if (this.almacenFiltro) this.form.almacenId = this.almacenFiltro;
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  guardar(): void {
    if (!this.form.almacenId || !this.form.productoId || !this.form.cantidad) return;
    this.error.set('');
    this.guardando.set(true);
    this.service.registrarMovimiento(this.form).subscribe({
      next: () => {
        this.guardando.set(false);
        this.showModal.set(false);
        this.cargar();
        this.cargarMovimientos();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo registrar el movimiento.');
      },
    });
  }

  abrirAlmacenes(): void {
    this.almacenEditando.set(null);
    this.errorAlmacen.set('');
    this.service.listAlmacenes().subscribe((a) => this.almacenesGestion.set(a));
    this.showAlmacenes.set(true);
  }

  cerrarAlmacenes(): void {
    this.showAlmacenes.set(false);
  }

  editarAlmacen(a: AlmacenGestion): void {
    this.almacenEditando.set(a);
    this.errorAlmacen.set('');
    this.formAlmacen = {
      direccion: a.direccion ?? '',
      ubigeo: a.ubigeo ?? '',
      codigoEstablecimientoSunat: a.codigoEstablecimientoSunat,
    };
  }

  guardarAlmacen(): void {
    const a = this.almacenEditando();
    if (!a) return;
    this.errorAlmacen.set('');
    this.guardandoAlmacen.set(true);
    this.service.actualizarAlmacen(a.id, this.formAlmacen).subscribe({
      next: (actualizado) => {
        this.guardandoAlmacen.set(false);
        this.almacenesGestion.update((lista) => lista.map((x) => (x.id === actualizado.id ? actualizado : x)));
        this.almacenEditando.set(null);
      },
      error: (err) => {
        this.guardandoAlmacen.set(false);
        this.errorAlmacen.set(err?.error?.message ?? 'No se pudo guardar el almacén.');
      },
    });
  }

  private formVacio(): RegistrarMovimiento {
    return {
      almacenId: 0,
      productoId: 0,
      talla: '',
      tipoMovimiento: 'INGRESO',
      cantidad: 0,
      costoUnitario: null,
    };
  }
}
