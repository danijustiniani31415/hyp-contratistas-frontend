import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { EvEvaluacionService } from '../../services/ev-evaluacion.service';
import { EvPlantillaService } from '../../services/ev-plantilla.service';
import { EvPeriodoService } from '../../services/ev-periodo.service';
import { EvPeriodoDto } from '../../dtos/ev-periodo.model';
import { EvEvaluacionResponseDto } from '../../dtos/ev-evaluacion.model';

interface ResidenteItem {
  userId: number;
  nombreCompleto: string;
  projectId: number | null;
  projectNombre: string | null;
  puedeVerTodos: boolean;
}

interface DetalleForm {
  plantillaId: number | null;
  criterio: string;
  puntaje: number | null;
  esNa: boolean;
}

@Component({
  selector: 'app-evaluar-residente',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './evaluar-residente.html',
  styleUrl: './evaluar-residente.css',
})
export class EvaluarResidente implements OnInit {
  periodo: EvPeriodoDto | null = null;
  areas: string[] = [];
  areaSeleccionada: string | null = null;
  residentes: ResidenteItem[] = [];
  residenteSeleccionado: ResidenteItem | null = null;
  detalles: DetalleForm[] = [];
  comentario = '';
  noAplica = false;
  noAplicaMotivo = '';
  guardando = false;
  misEvaluaciones: EvEvaluacionResponseDto[] = [];
  loading = true;
  errorMsg: string | null = null;
  successMsg: string | null = null;
  busqueda = '';
  dropdownAbierto = false;
  misEvalColapsado = true;
  miSubarea = '';
  proyectoFiltroId: number | null = null;
  mostrarSelectProyecto = false;
  puntajes = [1, 2, 3, 4, 5];
  /** Evaluación ya guardada para el (residente, área) actual, si existe — el backend no
   * permite re-evaluar en el mismo período (409), así que en vez de mostrar un formulario
   * en blanco que va a fallar al guardar, se muestran los puntajes que ya se enviaron. */
  evaluacionExistente: EvEvaluacionResponseDto | null = null;
  /** El evaluador puede corregir su propia nota hasta 24h después de haberla enviado —
   * pasado ese plazo, o si fue otro evaluador (no aplica acá, siempre es "yo"), queda fija. */
  corrigiendo = false;
  get dentroDeVentanaCorreccion(): boolean {
    if (!this.evaluacionExistente) return false;
    const creado = new Date(this.evaluacionExistente.createdAt).getTime();
    return Date.now() - creado <= 24 * 60 * 60 * 1000;
  }
  get soloLectura(): boolean { return this.evaluacionExistente !== null && !this.corrigiendo; }
  labelPuntaje: Record<number, string> = {
    1: 'Deficiente',
    2: 'Regular',
    3: 'Satisfactorio',
    4: 'Bueno',
    5: 'Sobresaliente',
  };

  get modoVerTodos(): boolean {
    return this.residentes.some((r) => r.puedeVerTodos);
  }

  get proyectos(): { id: number | null; nombre: string }[] {
    const seen = new Set<string>();
    const result: { id: number | null; nombre: string }[] = [];
    for (const r of this.residentes) {
      const key = String(r.projectId);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id: r.projectId, nombre: r.projectNombre ?? 'Sin proyecto' });
      }
    }
    return result;
  }

  get proyectoActivoNombre(): string {
    if (this.proyectoFiltroId === null) return 'Todos los proyectos';
    return this.proyectos.find((p) => p.id === this.proyectoFiltroId)?.nombre ?? 'Proyecto';
  }

  get residentesFiltrados(): ResidenteItem[] {
    if (this.modoVerTodos) {
      const q = this.busqueda.trim().toLowerCase();
      if (!q) return this.residentes;
      return this.residentes.filter((r) => r.nombreCompleto.toLowerCase().includes(q));
    }
    if (this.proyectoFiltroId !== null) {
      return this.residentes.filter((r) => r.projectId === this.proyectoFiltroId);
    }
    return this.residentes;
  }

  get notaCalculada(): number {
    const validos = this.detalles.filter((d) => !d.esNa && d.puntaje !== null);
    if (!validos.length) return 0;
    const prom = validos.reduce((s, d) => s + d.puntaje!, 0) / validos.length;
    return Math.round(prom * 4 * 10) / 10;
  }

  get puedeGuardar(): boolean {
    if (this.soloLectura) return false;
    if (!this.residenteSeleccionado || !this.areaSeleccionada) return false;
    if (this.noAplica) return this.noAplicaMotivo.trim().length > 0;
    return (
      this.detalles.some((d) => d.puntaje !== null || d.esNa) &&
      this.comentario.trim().length > 0
    );
  }

  constructor(
    private evalService: EvEvaluacionService,
    private plantillaService: EvPlantillaService,
    private periodoService: EvPeriodoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.evalService.getMiSubarea().subscribe({
      next: (res) => { this.miSubarea = res.subarea ?? ''; },
      error: () => {},
    });
    this.periodoService.getActivo().subscribe({
      next: (p) => {
        this.periodo = p;
        this.loading = false;
        this.loadAreas();
        this.loadMisEvaluaciones();
        this.cargarResidentes();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  cargarResidentes(): void {
    this.evalService.getResidentesEvaluables().subscribe({
      next: (list) => {
        this.residentes = list.map((r: any) => ({
          userId: r.userId,
          nombreCompleto: r.nombreCompleto,
          projectId: r.projectId ?? null,
          projectNombre: r.projectNombre ?? null,
          puedeVerTodos: r.puedeVerTodos ?? false,
        }));
        this.cdr.detectChanges();
      },
    });
  }

  seleccionarResidente(r: ResidenteItem): void {
    this.residenteSeleccionado = r;
    this.busqueda = '';
    this.dropdownAbierto = false;
    this.areaSeleccionada = null;
    this.detalles = [];
    const match = this.areas.find(
      (a) => a.toLowerCase() === this.miSubarea.toLowerCase(),
    );
    const areaAUsar = match ?? (this.areas.includes('Todos') ? 'Todos' : null);
    if (areaAUsar) this.selectArea(areaAUsar);
    this.cdr.detectChanges();
  }

  cambiarResidente(): void {
    this.residenteSeleccionado = null;
    this.areaSeleccionada = null;
    this.detalles = [];
    this.comentario = '';
    this.noAplica = false;
    this.noAplicaMotivo = '';
    this.busqueda = '';
    this.dropdownAbierto = false;
    this.evaluacionExistente = null;
    this.corrigiendo = false;
    this.cdr.detectChanges();
  }

  corregir(): void {
    this.corrigiendo = true;
    this.cdr.detectChanges();
  }

  cerrarDropdown(): void {
    setTimeout(() => {
      this.dropdownAbierto = false;
      this.cdr.detectChanges();
    }, 150);
  }

  loadAreas(): void {
    this.plantillaService.getAreas().subscribe({
      next: (a) => {
        this.areas = a;
        if (this.miSubarea && !this.areaSeleccionada) {
          const match = a.find(
            (area) => area.toLowerCase() === this.miSubarea.toLowerCase(),
          );
          const areaAUsar = match ?? (a.includes('Todos') ? 'Todos' : null);
          if (areaAUsar) this.selectArea(areaAUsar);
        }
        this.cdr.detectChanges();
      },
    });
  }

  loadMisEvaluaciones(): void {
    this.evalService.getMisEvaluaciones().subscribe({
      next: (e) => {
        this.misEvaluaciones = e;
        this.cdr.detectChanges();
      },
    });
  }

  selectArea(area: string): void {
    this.areaSeleccionada = area;
    this.corrigiendo = false;
    this.plantillaService.getByArea(area).subscribe({
      next: (criterios) => {
        this.evaluacionExistente = this.residenteSeleccionado
          ? this.misEvaluaciones.find(
              (e) => e.evaluadoUserId === this.residenteSeleccionado!.userId && e.areaNombre === area,
            ) ?? null
          : null;

        if (this.evaluacionExistente) {
          const ev = this.evaluacionExistente;
          this.detalles = criterios.map((c) => {
            const guardado = ev.detalles.find((d) => d.plantillaId === c.id);
            return {
              plantillaId: c.id,
              criterio: c.criterio,
              puntaje: guardado?.puntaje ?? null,
              esNa: guardado?.esNa ?? false,
            };
          });
          this.comentario = ev.comentario ?? '';
          this.noAplica = ev.noAplica;
          this.noAplicaMotivo = ev.noAplicaMotivo ?? '';
        } else {
          this.detalles = criterios.map((c) => ({
            plantillaId: c.id,
            criterio: c.criterio,
            puntaje: null,
            esNa: false,
          }));
        }
        this.cdr.detectChanges();
      },
    });
  }

  setPuntaje(idx: number, val: number): void {
    if (this.soloLectura) return;
    this.detalles[idx].puntaje = val;
    this.detalles[idx].esNa = false;
    this.cdr.detectChanges();
  }

  setNa(idx: number): void {
    if (this.soloLectura) return;
    this.detalles[idx].esNa = true;
    this.detalles[idx].puntaje = null;
    this.cdr.detectChanges();
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.residenteSeleccionado || !this.areaSeleccionada) return;
    this.guardando = true;
    this.errorMsg = null;
    const dto = {
      evaluadoUserId: this.residenteSeleccionado.userId,
      projectId: this.residenteSeleccionado.projectId,
      areaNombre: this.areaSeleccionada,
      comentario: this.comentario || null,
      noAplica: this.noAplica,
      noAplicaMotivo: this.noAplicaMotivo || null,
      detalles: this.detalles,
    };
    const request = this.corrigiendo && this.evaluacionExistente
      ? this.evalService.actualizar(this.evaluacionExistente.id, dto as any)
      : this.evalService.crear(dto as any);
    request.subscribe({
      next: (r: any) => {
        this.guardando = false;
        this.successMsg = `Evaluación guardada · Nota: ${r.nota}`;
        this.loadMisEvaluaciones();
        this.resetForm();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = null;
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (e: any) => {
        this.guardando = false;
        this.errorMsg = e.error?.message ?? 'Error al guardar la evaluación';
        this.cdr.detectChanges();
      },
    });
  }

  resetForm(): void {
    this.residenteSeleccionado = null;
    this.areaSeleccionada = null;
    this.detalles = [];
    this.comentario = '';
    this.noAplica = false;
    this.noAplicaMotivo = '';
    this.evaluacionExistente = null;
    this.corrigiendo = false;
  }

  yaEvaluo(residenteId: number, area: string): boolean {
    return this.misEvaluaciones.some(
      (e) => e.evaluadoUserId === residenteId && e.areaNombre === area,
    );
  }

  private readonly PROJ_PALETTE = [
    { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', accent: '#6366f1' },
    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', accent: '#22c55e' },
    { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', accent: '#f97316' },
    { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff', accent: '#a855f7' },
    { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', accent: '#0ea5e9' },
    { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3', accent: '#f43f5e' },
    { bg: '#fefce8', text: '#854d0e', border: '#fef08a', accent: '#ca8a04' },
    { bg: '#f0fdfa', text: '#134e4a', border: '#99f6e4', accent: '#14b8a6' },
  ];

  projColor(projectId: number | null): { bg: string; text: string; border: string; accent: string } {
    const idx = projectId === null ? 0 : Math.abs(projectId) % this.PROJ_PALETTE.length;
    return this.PROJ_PALETTE[idx];
  }

  yaEvaluoResidente(userId: number): boolean {
    return this.misEvaluaciones.some((e) => e.evaluadoUserId === userId);
  }

  get evalCount(): number {
    return this.residentes.filter((r) => this.yaEvaluoResidente(r.userId)).length;
  }

  scoreClass(nota: number | null): string {
    if (nota === null) return 'score-eq';
    if (nota >= 16) return 'score-hi';
    if (nota >= 12) return 'score-ok';
    return 'score-lo';
  }

  iniciales(nombreCompleto: string): string {
    return nombreCompleto
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }
}
