import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { SearchSelect } from '../../shared/components/search-select/search-select';
import { PersonasService, CatalogosPersonas } from '../../core/services/personas.service';
import {
  PlanillaCalculoService,
  PlanillaPeriodoListItem,
  ConceptoPlanilla,
} from '../../core/services/planilla-calculo.service';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-planillas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LbPageHeader, BaseModal, SearchSelect],
  templateUrl: './planillas.html',
  styleUrl: './planillas.css',
})
export class Planillas implements OnInit {
  meses = MESES;
  periodos = signal<PlanillaPeriodoListItem[]>([]);
  loading = signal(false);
  catalogos = signal<CatalogosPersonas | null>(null);

  showNuevoPeriodo = signal(false);
  nuevoForm = { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1, proyectoId: null as number | null };
  creando = signal(false);
  crearError = signal('');

  showConceptos = signal(false);
  conceptos = signal<ConceptoPlanilla[]>([]);
  conceptoForm = this.conceptoVacio();
  editandoConceptoId = signal<number | null>(null);
  guardandoConcepto = signal(false);
  conceptoError = signal('');

  constructor(
    private service: PlanillaCalculoService,
    private personasService: PersonasService,
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.personasService.getCatalogos().subscribe((c) => this.catalogos.set(c));
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listPeriodos().subscribe({
      next: (res) => {
        this.periodos.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  nombreMes(mes: number): string {
    return this.meses[mes - 1] ?? String(mes);
  }

  // ── Nuevo período ────────────────────────────────────────────────────
  abrirNuevoPeriodo(): void {
    this.nuevoForm = { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1, proyectoId: null };
    this.crearError.set('');
    this.showNuevoPeriodo.set(true);
  }

  cerrarNuevoPeriodo(): void {
    this.showNuevoPeriodo.set(false);
  }

  crearPeriodo(): void {
    this.creando.set(true);
    this.crearError.set('');
    this.service.crearPeriodo(this.nuevoForm).subscribe({
      next: () => {
        this.creando.set(false);
        this.showNuevoPeriodo.set(false);
        this.cargar();
      },
      error: (err) => {
        this.creando.set(false);
        this.crearError.set(err?.error?.message ?? 'No se pudo crear el período.');
      },
    });
  }

  // ── Conceptos de planilla ───────────────────────────────────────────
  private conceptoVacio() {
    return { codigo: '', nombre: '', tipo: 'INGRESO', categoriaLaboral: null as string | null, formaCalculo: 'FIJO', valor: 0, activo: true };
  }

  abrirConceptos(): void {
    this.cargarConceptos();
    this.showConceptos.set(true);
  }

  cerrarConceptos(): void {
    this.showConceptos.set(false);
  }

  private cargarConceptos(): void {
    this.service.listConceptos().subscribe((c) => this.conceptos.set(c));
  }

  editarConcepto(c: ConceptoPlanilla): void {
    this.editandoConceptoId.set(c.id);
    this.conceptoForm = {
      codigo: c.codigo,
      nombre: c.nombre,
      tipo: c.tipo,
      categoriaLaboral: c.categoriaLaboral,
      formaCalculo: c.formaCalculo,
      valor: c.valor,
      activo: c.activo,
    };
  }

  nuevoConcepto(): void {
    this.editandoConceptoId.set(null);
    this.conceptoForm = this.conceptoVacio();
  }

  guardarConcepto(): void {
    if (!this.conceptoForm.codigo || !this.conceptoForm.nombre) return;
    this.guardandoConcepto.set(true);
    this.conceptoError.set('');

    const id = this.editandoConceptoId();
    const obs = id
      ? this.service.actualizarConcepto(id, this.conceptoForm)
      : this.service.crearConcepto(this.conceptoForm);

    obs.subscribe({
      next: () => {
        this.guardandoConcepto.set(false);
        this.nuevoConcepto();
        this.cargarConceptos();
      },
      error: (err) => {
        this.guardandoConcepto.set(false);
        this.conceptoError.set(err?.error?.message ?? 'No se pudo guardar el concepto.');
      },
    });
  }

  toggleConceptoActivo(c: ConceptoPlanilla): void {
    this.service.actualizarConcepto(c.id, {
      nombre: c.nombre, tipo: c.tipo, categoriaLaboral: c.categoriaLaboral,
      formaCalculo: c.formaCalculo, valor: c.valor, activo: !c.activo,
    }).subscribe(() => this.cargarConceptos());
  }
}
