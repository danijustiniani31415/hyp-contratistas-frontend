import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { SearchSelect } from '../../shared/components/search-select/search-select';
import { MultiSearchSelect } from '../../shared/components/multi-search-select/multi-search-select';
import { BaseModal } from '../../shared/components/base-modal/base-modal';
import { AbrilModalPanel } from '../../shared/components/abril-modal-panel/abril-modal-panel';
import { DatePicker } from '../../shared/components/date-picker/date-picker';
import { TimePicker } from '../../shared/components/time-picker/time-picker';
import { FileSelector, SelectedFile } from '../../shared/components/file-selector/file-selector';
import { PhotoGridPicker } from '../../shared/components/photo-grid-picker/photo-grid-picker';
import { SignaturePad } from '../../shared/components/signature-pad/signature-pad';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';
import { SectionTabs, SectionTab } from '../../shared/components/section-tabs/section-tabs';
import { ViewToggle } from '../../shared/components/view-toggle/view-toggle';
import { FabButton } from '../../shared/components/fab-button/fab-button';
import { Paginator } from '../../shared/components/paginator/paginator';
import { ViewToggleMode } from '../../shared/components/view-toggle/view-toggle.model';

/**
 * Catálogo de componentes reales — Las Bravas / HP Constructores.
 *
 * Cada bloque instancia el componente compartido TAL COUAL existe hoy en el código (mismo
 * selector, mismos @Input reales), no una recreación en HTML suelto. Sirve para decidir, mirando
 * la app de verdad, cuál queda como el único estándar por categoría antes de construir Las Bravas.
 *
 * No requiere login (ruta pública, ver app.routes.ts) para poder abrirlo directo con `npm start`.
 */
@Component({
  selector: 'app-catalogo-ui',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SearchSelect,
    MultiSearchSelect,
    BaseModal,
    AbrilModalPanel,
    DatePicker,
    TimePicker,
    FileSelector,
    PhotoGridPicker,
    SignaturePad,
    StatusBadge,
    SectionTabs,
    ViewToggle,
    FabButton,
    Paginator,
  ],
  templateUrl: './catalogo-ui.html',
  styleUrl: './catalogo-ui.css',
})
export class CatalogoUi implements AfterViewInit {
  @ViewChild('chartA') chartARef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartB') chartBRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartC') chartCRef?: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    const labels = ['EPP', 'Herramientas', 'Materiales', 'Equipos'];
    const data = [42, 18, 65, 9];
    const base = {
      type: 'bar' as const,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,.2)' } },
        },
      },
    };

    if (this.chartARef) {
      // A · paleta DESIGN-VICTOR.md sección 9: azul, verde, naranja, rojo en ese orden.
      new Chart(this.chartARef.nativeElement, {
        ...base,
        data: {
          labels,
          datasets: [{ data, backgroundColor: ['#2E6DB4', '#1B6B3A', '#D97706', '#C0392B'], borderRadius: 4 }],
        },
      });
    }
    if (this.chartBRef) {
      // B · monocromo navy (una sola familia de tonos) — look "enterprise BI" más sobrio.
      new Chart(this.chartBRef.nativeElement, {
        ...base,
        data: {
          labels,
          datasets: [{ data, backgroundColor: ['#1E3A5F', '#3D5A80', '#6C8DAD', '#A9C1D9'], borderRadius: 4 }],
        },
      });
    }
    if (this.chartCRef) {
      // C · patrón real de dashboard-proyecto: línea + relleno suave, color fijo por métrica.
      const semanas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
      const color = '#0f4c75';
      new Chart(this.chartCRef.nativeElement, {
        type: 'line',
        data: {
          labels: semanas,
          datasets: [{
            label: 'N° de Trabajadores (promedio)',
            data: [12, 15, 14, 18, 20],
            borderColor: color,
            backgroundColor: color + '26',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { font: { size: 9 }, precision: 0, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
            x: { ticks: { font: { size: 9.5, weight: 'bold' }, color: '#64748b' }, grid: { display: false } },
          },
        },
      });
    }
  }


  // ── combobox ──────────────────────────────────────────────────────────
  almacenes = [
    { id: 1, name: 'Almacén Central Lima' },
    { id: 2, name: 'Almacén Las Bravas' },
    { id: 3, name: 'Almacén Sauce Zen' },
  ];
  almacenSel: number | null = null;

  categorias = [
    { id: 1, name: 'EPP' },
    { id: 2, name: 'Herramientas' },
    { id: 3, name: 'Materiales' },
    { id: 4, name: 'Equipos' },
  ];
  categoriasSel: number[] = [];

  // ── modal ─────────────────────────────────────────────────────────────
  showBaseModal = false;
  showPanelTeal = false;
  showPanelBlue = false;
  showDrawer = false;

  productoNombre = '';
  productoCategoria: number | null = null;

  // ── fecha / hora ──────────────────────────────────────────────────────
  fecha: string | null = null;
  hora: string | null = null;

  // ── archivos ──────────────────────────────────────────────────────────
  archivoNombre = '';
  fotos: string[] = [];

  onFileSelected(sel: SelectedFile): void {
    this.archivoNombre = sel.file.name;
  }

  onFotosSelected(files: FileList): void {
    Array.from(files).forEach((f) => this.fotos.push(URL.createObjectURL(f)));
  }

  removeFoto(i: number): void {
    this.fotos.splice(i, 1);
  }

  // ── firma ─────────────────────────────────────────────────────────────
  hayFirma = false;
  lugarFirma = 'Las Bravas — Almacén Central';
  fechaHoraFirma = new Date().toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── tabs / toggle ─────────────────────────────────────────────────────
  tabs: SectionTab[] = [
    { id: 'rac', label: 'RAC', badge: 6 },
    { id: 'opt', label: 'OPT', badge: 2 },
    { id: 'insp', label: 'Insp.', badge: 2 },
    { id: 'charlas', label: 'Charlas', badge: 2 },
  ];
  tabActiva: string | null = 'rac';

  /** Réplica del estilo de "Indicadores Proactivos" (íconos + azul subrayado) que confirmaste. */
  tabsConIcono = [
    { id: 'rac', label: 'Seguimiento', icon: 'ti-chart-bar' },
    { id: 'opt', label: 'Dashboard SSOMA', icon: 'ti-grid-dots' },
    { id: 'insp', label: 'Por Proyecto', icon: 'ti-clipboard-list' },
    { id: 'charlas', label: 'Desempeño Supervisor', icon: 'ti-user-check' },
    { id: 'reactivos', label: 'Reactivos IF/IG/IA', icon: 'ti-arrows-shuffle' },
  ];

  modosVista: ViewToggleMode[] = [
    { value: 'sistema', label: 'Buscar en sistema', icon: '<i class="ti ti-search"></i>' } as ViewToggleMode,
    { value: 'manual', label: 'Ingresar DNI manualmente', icon: '<i class="ti ti-keyboard"></i>' } as ViewToggleMode,
  ];
  modoVista = 'sistema';

  // ── paginador ─────────────────────────────────────────────────────────
  paginaActual = 2;

  // ── pantallas reales de referencia ───────────────────────────────────
  pantallasReferencia = [
    {
      titulo: 'Tarjetas de resumen (Desempeño Supervisor)',
      ruta: '/ssoma/gestion/indicadores-proactivos/indicadores-ssoma/desempeno-supervisor',
      nota: 'El grid de tarjetas con % + RAC/OPT/Insp./Charlas que marcaste — es markup propio de esta pantalla, no un componente compartido todavía.',
    },
    {
      titulo: 'Modal "Nuevo RAC" (barra azul)',
      ruta: '/ssoma/gestion/rac/nuevo',
      nota: 'Este SÍ es app-abril-modal-panel real — está reproducido como demo en vivo más abajo, en la sección Modal.',
    },
    {
      titulo: 'Panel "Agregar a lista negra"',
      ruta: '/ssoma/gestion/amonestaciones',
      nota: 'El toggle "Buscar en sistema / Ingresar DNI manualmente" — abajo en la sección Toggle segmentado hay un candidato con app-view-toggle.',
    },
    {
      titulo: 'Gantt real (Cronograma de Actividades)',
      ruta: '/projects/cronograma-actividades',
      nota: 'Usa dhtmlx-gantt. Su sistema de color YA está definido y confirmado en DESIGN-VICTOR.md sección 2.2 (10 colores por rama, acento border-left, badge de fase) — no hace falta redecidirlo, solo confirmar si sigue igual para Las Bravas.',
    },
  ];
}
