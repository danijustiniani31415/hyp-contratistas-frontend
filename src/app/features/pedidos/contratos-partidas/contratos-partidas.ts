import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchSelect } from '../../../shared/components/search-select/search-select';
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { FabButton } from '../../../shared/components/fab-button/fab-button';
import { LbPageHeader } from '../../../shared/components/lb-page-header/lb-page-header';
import {
  PedidosService,
  Contrato,
  ContratoCreate,
  Partida,
  PartidaCreate,
  Moneda,
  ConsumoPartida,
} from '../../../core/services/pedidos.service';
import { PersonasService, CatalogoItem } from '../../../core/services/personas.service';

type Tab = 'CONTRATOS' | 'PARTIDAS';

/** Imputación contable de Pedidos: Contrato (con qué cliente/proyecto se factura) y Partida
 * (a qué línea del presupuesto de obra se carga el gasto) — catálogos chicos, scoped por
 * proyecto, editables acá en vez de por SQL directo. [REVISADO] Estado en signals — mismo motivo
 * que pedidos.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-pedidos-contratos-partidas',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, BaseModal, FabButton, LbPageHeader],
  templateUrl: './contratos-partidas.html',
  styleUrl: './contratos-partidas.css',
})
export class PedidosContratosPartidas implements OnInit {
  tab = signal<Tab>('CONTRATOS');

  proyectos = signal<CatalogoItem[]>([]);
  proyectoFiltro: number | null = null;

  contratos = signal<Contrato[]>([]);
  partidas = signal<Partida[]>([]);
  monedas = signal<Moneda[]>([]);
  consumos = signal<Record<number, ConsumoPartida>>({});
  loading = signal(false);

  showModalContrato = signal(false);
  guardandoContrato = signal(false);
  errorContrato = signal('');
  formContrato: ContratoCreate = this.contratoVacio();

  showModalPartida = signal(false);
  guardandoPartida = signal(false);
  errorPartida = signal('');
  formPartida: PartidaCreate = this.partidaVacia();

  constructor(
    private service: PedidosService,
    private personasService: PersonasService,
  ) {}

  ngOnInit(): void {
    this.personasService.getCatalogos().subscribe((c) => this.proyectos.set(c.proyectos));
    this.service.listMonedas().subscribe((m) => this.monedas.set(m));
  }

  cambiarTab(t: Tab): void {
    this.tab.set(t);
  }

  onProyectoFiltroChange(): void {
    this.cargar();
  }

  cargar(): void {
    if (!this.proyectoFiltro) {
      this.contratos.set([]);
      this.partidas.set([]);
      return;
    }
    this.loading.set(true);
    this.service.listContratos(this.proyectoFiltro).subscribe({
      next: (c) => {
        this.contratos.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.service.listPartidas(this.proyectoFiltro).subscribe((p) => {
      this.partidas.set(p);
      this.consumos.set({});
      for (const partida of p) {
        if (!partida.montoPresupuestado) continue;
        this.service.getConsumoPartida(partida.id).subscribe((c) => {
          this.consumos.update((m) => ({ ...m, [partida.id]: c }));
        });
      }
    });
  }

  consumoDe(partidaId: number): ConsumoPartida | undefined {
    return this.consumos()[partidaId];
  }

  // ── Contrato ─────────────────────────────────────────────────────────
  abrirNuevoContrato(): void {
    this.formContrato = this.contratoVacio();
    if (this.proyectoFiltro) this.formContrato.proyectoId = this.proyectoFiltro;
    this.errorContrato.set('');
    this.showModalContrato.set(true);
  }

  cerrarModalContrato(): void {
    this.showModalContrato.set(false);
  }

  guardarContrato(): void {
    if (!this.formContrato.proyectoId || !this.formContrato.codigo.trim() || !this.formContrato.vigenteDesde) {
      this.errorContrato.set('Proyecto, código y vigencia desde son obligatorios.');
      return;
    }
    this.errorContrato.set('');
    this.guardandoContrato.set(true);
    this.service.crearContrato(this.formContrato).subscribe({
      next: () => {
        this.guardandoContrato.set(false);
        this.showModalContrato.set(false);
        if (this.proyectoFiltro === this.formContrato.proyectoId) this.cargar();
      },
      error: (err) => {
        this.guardandoContrato.set(false);
        this.errorContrato.set(err?.error?.message ?? 'No se pudo crear el contrato.');
      },
    });
  }

  private contratoVacio(): ContratoCreate {
    return { proyectoId: 0, codigo: '', descripcion: '', vigenteDesde: this.hoy(), vigenteHasta: null };
  }

  // ── Partida ──────────────────────────────────────────────────────────
  abrirNuevaPartida(): void {
    this.formPartida = this.partidaVacia();
    if (this.proyectoFiltro) this.formPartida.proyectoId = this.proyectoFiltro;
    this.errorPartida.set('');
    this.showModalPartida.set(true);
  }

  cerrarModalPartida(): void {
    this.showModalPartida.set(false);
  }

  guardarPartida(): void {
    if (!this.formPartida.proyectoId || !this.formPartida.codigo.trim() || !this.formPartida.nombre.trim()) {
      this.errorPartida.set('Proyecto, código y nombre son obligatorios.');
      return;
    }
    if (this.formPartida.montoPresupuestado && !this.formPartida.monedaId) {
      this.errorPartida.set('Si ingresas un monto presupuestado, selecciona la moneda.');
      return;
    }
    this.errorPartida.set('');
    this.guardandoPartida.set(true);
    this.service.crearPartida(this.formPartida).subscribe({
      next: () => {
        this.guardandoPartida.set(false);
        this.showModalPartida.set(false);
        if (this.proyectoFiltro === this.formPartida.proyectoId) this.cargar();
      },
      error: (err) => {
        this.guardandoPartida.set(false);
        this.errorPartida.set(err?.error?.message ?? 'No se pudo crear la partida.');
      },
    });
  }

  private partidaVacia(): PartidaCreate {
    return { proyectoId: 0, codigo: '', nombre: '', monedaId: null, montoPresupuestado: null };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  proyectoNombre(id: number): string {
    return this.proyectos().find((p) => p.id === id)?.nombre ?? '';
  }
}
