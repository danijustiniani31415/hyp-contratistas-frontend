import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import {
  EppService,
  EntregaEppListItem,
  EntregaEppCreate,
} from '../../core/services/epp.service';
import { PersonasService, PersonaListItem, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-epp',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbPageHeader],
  templateUrl: './epp.html',
  styleUrl: './epp.css',
})
export class Epp implements OnInit {
  entregas = signal<EntregaEppListItem[]>([]);
  search = '';
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  personas = signal<PersonaListItem[]>([]);
  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productosEpp = signal<ProductoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: EntregaEppCreate = this.formVacio();

  constructor(
    private service: EppService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.list('', 1, 200).subscribe((r) => this.personas.set(r.data));
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 200).subscribe((r) => {
      this.productosEpp.set(r.data.filter((p) => p.categoriaTipo === 'EPP'));
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.search, null, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.entregas.set(res.data);
        this.totalRecords.set(res.totalRecords);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
    if (!this.form.personaId || !this.form.almacenId || !this.form.items.length) return;
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
        this.error.set(err?.error?.message ?? 'No se pudo registrar la entrega.');
      },
    });
  }

  private formVacio(): EntregaEppCreate {
    return { personaId: 0, almacenId: 0, observacion: '', items: [{ productoId: 0, talla: '', cantidad: 1 }] };
  }
}
