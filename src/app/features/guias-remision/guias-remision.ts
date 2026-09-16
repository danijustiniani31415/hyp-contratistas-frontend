import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { LbNav } from '../../shared/components/lb-nav/lb-nav';
import {
  GuiasRemisionService,
  GuiaRemisionListItem,
  GuiaRemisionDetalle,
  GuiaRemisionCreate,
} from '../../core/services/guias-remision.service';
import { PersonasService, AlmacenCatalogoItem } from '../../core/services/personas.service';
import { CatalogoService, ProductoListItem } from '../../core/services/catalogo.service';
import { LbAuthService } from '../../core/services/lb-auth.service';

const ESTADOS = ['BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'ANULADA'];
const MOTIVOS = [
  { value: '04', label: 'Traslado entre establecimientos de la misma empresa' },
  { value: '02', label: 'Compra (devolución a proveedor)' },
  { value: '13', label: 'Otros' },
];
const UNIDADES = ['NIU', 'KGM', 'MTR', 'ZZ'];

/** [REVISADO] Estado en signals — mismo motivo que compras.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-guias-remision',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, Paginator, LbNav],
  templateUrl: './guias-remision.html',
  styleUrl: './guias-remision.css',
})
export class GuiasRemision implements OnInit {
  guias = signal<GuiaRemisionListItem[]>([]);
  estadoFiltro = '';
  estados = ESTADOS;
  motivos = MOTIVOS;
  unidades = UNIDADES;
  page = signal(1);
  pageSize = 20;
  totalRecords = signal(0);
  totalPages = signal(1);
  loading = signal(false);

  almacenes = signal<AlmacenCatalogoItem[]>([]);
  productos = signal<ProductoListItem[]>([]);

  showModal = signal(false);
  error = signal('');
  guardando = signal(false);
  form: GuiaRemisionCreate = this.formVacio();
  esTrasladoPropio = true;

  showDetalle = signal(false);
  detalle = signal<GuiaRemisionDetalle | null>(null);
  enviando = signal(false);

  constructor(
    private service: GuiasRemisionService,
    private personasService: PersonasService,
    private catalogoService: CatalogoService,
    public authService: LbAuthService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.almacenes.set(c.almacenes));
    this.catalogoService.listProductos('', 1, 200).subscribe((r) => this.productos.set(r.data));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.list(this.estadoFiltro, this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.guias.set(res.data);
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

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  // ── Nueva guía ───────────────────────────────────────────────────────
  abrirNuevo(): void {
    this.form = this.formVacio();
    this.esTrasladoPropio = true;
    this.error.set('');
    this.showModal.set(true);
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  onTrasladoPropioChange(): void {
    if (this.esTrasladoPropio) {
      this.form.motivoTraslado = '04';
      this.form.destinatarioRuc = '';
      this.form.destinatarioRazonSocial = '';
    } else {
      this.form.motivoTraslado = '13';
      this.form.almacenDestinoId = undefined;
    }
  }

  onModalidadChange(): void {
    if (this.form.modalidadTraslado === '01') {
      this.form.vehiculoPlaca = '';
      this.form.conductorNombres = '';
      this.form.conductorLicencia = '';
    } else {
      this.form.transportistaRuc = '';
      this.form.transportistaRazonSocial = '';
    }
  }

  agregarItem(): void {
    this.form.items.push({ productoId: 0, talla: '', cantidad: 1, unidadMedida: 'NIU' });
  }

  quitarItem(i: number): void {
    this.form.items.splice(i, 1);
  }

  /** SUNAT exige transportista (público) o vehículo+conductor (privado) para que la guía sea válida. */
  get formValido(): boolean {
    if (!this.form.almacenOrigenId || !this.form.items.length || !this.form.fechaTraslado) return false;
    if (this.form.modalidadTraslado === '01') return !!this.form.transportistaRuc;
    return !!this.form.vehiculoPlaca && !!this.form.conductorNombres && !!this.form.conductorLicencia;
  }

  guardar(): void {
    if (!this.formValido) return;
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
        this.error.set(err?.error?.message ?? 'No se pudo crear la guía de remisión.');
      },
    });
  }

  private formVacio(): GuiaRemisionCreate {
    return {
      motivoTraslado: '04',
      modalidadTraslado: '02',
      fechaTraslado: new Date().toISOString().slice(0, 10),
      pesoBrutoTotal: 0,
      pesoBrutoUnidad: 'KGM',
      almacenOrigenId: 0,
      observacion: '',
      items: [{ productoId: 0, talla: '', cantidad: 1, unidadMedida: 'NIU' }],
    };
  }

  // ── Detalle y envío a SUNAT ──────────────────────────────────────────
  verDetalle(id: number): void {
    this.service.getById(id).subscribe((d) => {
      this.detalle.set(d);
      this.showDetalle.set(true);
    });
  }

  cerrarDetalle(): void {
    this.showDetalle.set(false);
  }

  enviar(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Transmitir esta guía al SEE de SUNAT?',
      text: 'Se firmará y enviará el XML electrónicamente. No se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Sí, transmitir',
      cancelButtonText: 'Volver',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.enviando.set(true);
      this.service.enviar(id).subscribe({
        next: (d) => {
          this.enviando.set(false);
          this.detalle.set(d);
          this.cargar();
          if (d.estado === 'RECHAZADA') {
            Swal.fire({ icon: 'error', title: 'SUNAT rechazó la guía', text: d.cdrDescripcion ?? 'Revisa el detalle del CDR.' });
          } else {
            Swal.fire({ icon: 'success', title: 'Guía aceptada por SUNAT' });
          }
        },
        error: (err) => {
          this.enviando.set(false);
          Swal.fire({ icon: 'error', title: 'No se pudo transmitir', text: err?.error?.message ?? 'Error al conectar con SUNAT.' });
        },
      });
    });
  }

  consultarEstado(): void {
    const id = this.detalle()?.id;
    if (!id) return;
    this.enviando.set(true);
    this.service.consultarEstado(id).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.detalle.set(d);
        this.cargar();
        if (d.estado === 'ENVIADA') {
          Swal.fire({ icon: 'info', title: 'SUNAT todavía no genera el CDR', text: 'Vuelve a intentar en unos segundos.' });
        } else if (d.estado === 'RECHAZADA') {
          Swal.fire({ icon: 'error', title: 'SUNAT rechazó la guía', text: d.cdrDescripcion ?? 'Revisa el detalle del CDR.' });
        } else {
          Swal.fire({ icon: 'success', title: 'Guía aceptada por SUNAT' });
        }
      },
      error: (err) => {
        this.enviando.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudo consultar', text: err?.error?.message ?? 'Error al conectar con SUNAT.' });
      },
    });
  }
}
