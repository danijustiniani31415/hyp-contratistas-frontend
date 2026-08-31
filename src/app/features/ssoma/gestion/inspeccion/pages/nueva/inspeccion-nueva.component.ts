import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { InspeccionService } from '../../inspeccion.service';
import {
  InspeccionTipoDto,
  InspeccionChecklistItemDto,
  CrearInspeccionRequest,
  InspeccionRespuestaRequest,
  InspeccionHallazgoRequest,
} from '../../inspeccion.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../../features/habilitacion/dtos/trabajador.model';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import Swal from 'sweetalert2';

interface RespuestaForm {
  itemId: number;
  pregunta: string;
  categoria: string;
  orden: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA' | '';
  observacion: string;
  showObs: boolean;
}

interface ChecklistGrupoForm {
  categoria: string;
  items: RespuestaForm[];
}

interface HallazgoForm {
  uid: number;
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area: string;
  responsableNombre: string;
  responsableCargo: string;
  fechaLimite: string;
  accionCorrectiva: string;
  fotosBase64: string[];
  fotosPreview: string[];
  expandido: boolean;
}

@Component({
  selector: 'app-inspeccion-nueva',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel],
  templateUrl: './inspeccion-nueva.component.html',
  styleUrl: './inspeccion-nueva.component.css',
})
export class InspeccionNuevaComponent implements OnInit, AfterViewInit {
  paso = 1;
  readonly totalPasos = 4;
  readonly pasoLabels = ['Cabecera', 'Checklist', 'Hallazgos', 'Cierre'];
  guardando = false;
  loadingCatalogos = false;
  checklistLoading = false;

  // Catálogos
  tipos: InspeccionTipoDto[] = [];
  proyectos: any[] = [];
  workers: WorkerHabilitacionListDto[] = [];

  /** Lista larga (crece con nuevos tipos/ámbitos) -> combobox, no <select> nativo. */
  get tiposOpts(): { id: number; label: string }[] {
    return this.tipos.map((t) => ({ id: t.id, label: `${t.nombre} (${t.ambito})` }));
  }

  /** Gerencial/cruzada: sin checklist, varios coordinadores agregan hallazgos sueltos al mismo registro. */
  get esColaborativa(): boolean {
    return this.tipos.find((t) => t.id === this.tipoId)?.esColaborativa ?? false;
  }

  // Paso 1
  proyectoId = 0;
  tipoId = 0;
  esPlanificada = true;
  fecha = new Date().toISOString().split('T')[0];
  horaInicio = '';
  horaFin = '';
  area = '';
  responsableArea = '';
  responsableAreaId: number | null = null;

  // Paso 2 — checklist
  grupos: ChecklistGrupoForm[] = [];
  respuestas: RespuestaForm[] = [];
  ultimoTipoIdCargado = 0;

  // Paso 3 — hallazgos
  hallazgos: HallazgoForm[] = [];
  hallazgoNextUid = 1;
  mostrarFormHallazgo = false;
  nuevoHallazgo: HallazgoForm = this.emptyHallazgo();
  hallazgoResponsableId: number | null = null;

  onHallazgoResponsableChange(id: number | null): void {
    this.hallazgoResponsableId = id;
    if (!id) {
      this.nuevoHallazgo.responsableNombre = '';
      this.nuevoHallazgo.responsableCargo = '';
    } else {
      const w = this.workers.find(x => x.workerId === id);
      if (w) {
        this.nuevoHallazgo.responsableNombre = w.apellidoNombre;
        const partes = [w.puesto].filter(Boolean);
        this.nuevoHallazgo.responsableCargo = partes.join(' / ');
      }
    }
    this.cdr.markForCheck();
  }

  // Paso 4 — cierre. Inspector: fijo, resuelto del usuario logueado (no editable)
  inspectorId: number | null = null;
  inspectorNombre = '';
  inspectorCargo = '';
  inspectorEmpresa = '';
  inspectorEmpresaId: number | null = null;
  observadorActual: WorkerSearchItemDto | null = null;
  resolviendoObservador = true;
  sinWorkerVinculado = false;
  representanteId: number | null = null;
  representanteNombre = '';
  representanteCargo = '';
  descripcionCausas = '';
  conclusiones = '';

  // Paso 4 — fotos de área
  fotosAreaBase64: string[] = [];
  fotosAreaPreview: string[] = [];
  @ViewChild('fotoAreaInput') fotoAreaInput!: ElementRef<HTMLInputElement>;

  // Canvas inspector
  @ViewChild('canvasInspector') canvasInspector!: ElementRef<HTMLCanvasElement>;
  private ctxInspector?: CanvasRenderingContext2D;
  private drawingInspector = false;
  firmaInspectorBase64 = '';

  // Canvas representante
  @ViewChild('canvasRepresentante') canvasRepresentante!: ElementRef<HTMLCanvasElement>;
  private ctxRepresentante?: CanvasRenderingContext2D;
  private drawingRepresentante = false;
  firmaRepresentanteBase64 = '';

  // Photo input refs
  @ViewChildren('fotoInput') fotoInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor(
    private inspeccionService: InspeccionService,
    private projectService: ProjectService,
    private trabajadorHabService: TrabajadorHabService,
    private workerSearchService: WorkerSearchService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadingCatalogos = true;
    forkJoin({
      catalogos: this.inspeccionService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorHabService.getTrabajadores({ pageSize: 9999, soloVerificacion: true }),
    }).subscribe({
      next: ({ catalogos, proyectos, workers }) => {
        this.tipos = catalogos.tipos;
        this.proyectos = proyectos.data;
        this.workers = workers.data;
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
        this.resolverInspectorActual();
      },
      error: () => {
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * El Inspector ya no es un campo editable: se resuelve siempre desde el trabajador
   * vinculado al usuario logueado (Abril vía Person, contratista vía ss_contratista_usuario).
   * Si no hay vínculo, se bloquea el formulario completo.
   */
  private resolverInspectorActual(): void {
    this.resolviendoObservador = true;
    this.workerSearchService.getMe().subscribe({
      next: (me) => {
        this.observadorActual = me;
        this.sinWorkerVinculado = false;
        this.resolviendoObservador = false;
        this.inspectorId = me.id;
        this.inspectorNombre = me.apellidoNombre;
        this.inspectorCargo = me.cargo || me.puesto || '';
        this.inspectorEmpresa = me.empresaActual || '';
        this.inspectorEmpresaId = me.empresaActualId ?? null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.observadorActual = null;
        this.sinWorkerVinculado = true;
        this.resolviendoObservador = false;
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {}

  onResponsableChange(id: number | null): void {
    this.responsableAreaId = id;
    if (!id) {
      this.responsableArea = '';
    } else {
      const w = this.workers.find(x => x.workerId === id);
      if (w) this.responsableArea = w.apellidoNombre;
    }
    this.cdr.markForCheck();
  }

  get puedeAvanzar(): boolean {
    if (this.sinWorkerVinculado || this.resolviendoObservador) return false;
    if (this.paso === 1) {
      return (this.proyectoId ?? 0) > 0 && !!this.tipoId && !!this.fecha;
    }
    if (this.paso === 2) {
      return this.respuestas.length > 0 && this.cntRespondidos === this.respuestas.length;
    }
    if (this.paso === 4) {
      return this.fotosAreaBase64.length >= 3;
    }
    return true;
  }

  // ── CHECKLIST ──────────────────────────────────────────────────────────────

  cargarChecklist(): void {
    if (!this.tipoId || this.tipoId === this.ultimoTipoIdCargado) return;
    this.checklistLoading = true;
    this.cdr.markForCheck();
    this.inspeccionService.getChecklist(this.tipoId).subscribe({
      next: (items) => {
        this.respuestas = items.map((item) => ({
          itemId: item.id,
          pregunta: item.pregunta,
          categoria: item.categoria ?? 'General',
          orden: item.orden,
          resultado: '',
          observacion: '',
          showObs: false,
        }));
        this.grupos = this.agrupar(this.respuestas);
        this.ultimoTipoIdCargado = this.tipoId;
        this.checklistLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.checklistLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private agrupar(items: RespuestaForm[]): ChecklistGrupoForm[] {
    const map = new Map<string, RespuestaForm[]>();
    for (const item of items) {
      const cat = item.categoria ?? 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries()).map(([categoria, its]) => ({ categoria, items: its }));
  }

  setRespuesta(item: RespuestaForm, val: 'Cumple' | 'NoCumple' | 'NA'): void {
    item.resultado = item.resultado === val ? '' : val;
    item.showObs = item.resultado === 'NoCumple';
    if (!item.showObs) item.observacion = '';
    this.cdr.markForCheck();
  }

  get cntCumple(): number {
    return this.respuestas.filter((r) => r.resultado === 'Cumple').length;
  }

  get cntNoCumple(): number {
    return this.respuestas.filter((r) => r.resultado === 'NoCumple').length;
  }

  get cntNA(): number {
    return this.respuestas.filter((r) => r.resultado === 'NA').length;
  }

  get cntRespondidos(): number {
    return this.respuestas.filter((r) => r.resultado !== '').length;
  }

  get tasaRealtime(): number {
    const d = this.cntCumple + this.cntNoCumple;
    return d > 0 ? Math.round((this.cntCumple / d) * 100) : 0;
  }

  get tasaClass(): string {
    const t = this.tasaRealtime;
    if (t >= 80) return 'score-verde';
    if (t >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  // ── HALLAZGOS ──────────────────────────────────────────────────────────────

  emptyHallazgo(): HallazgoForm {
    return {
      uid: this.hallazgoNextUid++,
      descripcion: '',
      tipo: 'Mayor',
      area: '',
      responsableNombre: '',
      responsableCargo: '',
      fechaLimite: '',
      accionCorrectiva: '',
      fotosBase64: [],
      fotosPreview: [],
      expandido: true,
    };
  }

  agregarHallazgo(): void {
    this.nuevoHallazgo = this.emptyHallazgo();
    this.hallazgoResponsableId = null;
    this.mostrarFormHallazgo = true;
    this.cdr.markForCheck();
  }

  confirmarHallazgo(): void {
    if (!this.nuevoHallazgo.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Ingresa la descripción del hallazgo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    if (this.nuevoHallazgo.fotosBase64.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Agrega al menos una foto al hallazgo', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
      return;
    }
    this.hallazgos.push({ ...this.nuevoHallazgo });
    this.mostrarFormHallazgo = false;
    this.cdr.markForCheck();
  }

  cancelarHallazgo(): void {
    this.mostrarFormHallazgo = false;
    this.cdr.markForCheck();
  }

  quitarHallazgo(uid: number): void {
    this.hallazgos = this.hallazgos.filter((h) => h.uid !== uid);
    this.cdr.markForCheck();
  }

  setTipoHallazgo(h: HallazgoForm, tipo: 'Critico' | 'Mayor' | 'Menor'): void {
    h.tipo = tipo;
    this.cdr.markForCheck();
  }

  onFotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    const h = this.nuevoHallazgo;
    for (let i = 0; i < files.length && h.fotosBase64.length < 5; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        h.fotosPreview.push(dataUrl);
        h.fotosBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  quitarFoto(h: HallazgoForm, idx: number): void {
    h.fotosBase64.splice(idx, 1);
    h.fotosPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  onRepresentanteChange(id: number | null): void {
    this.representanteId = id;
    if (!id) {
      this.representanteNombre = '';
      this.representanteCargo = '';
    } else {
      const w = this.workers.find(x => x.workerId === id);
      if (w) {
        this.representanteNombre = w.apellidoNombre;
        const partes = [w.puesto].filter(Boolean);
        this.representanteCargo = partes.join(' / ');
      }
    }
    this.cdr.markForCheck();
  }

  onFotoAreaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    for (let i = 0; i < input.files.length && this.fotosAreaBase64.length < 10; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        this.fotosAreaPreview.push(dataUrl);
        this.fotosAreaBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(input.files[i]);
    }
    input.value = '';
  }

  quitarFotoArea(idx: number): void {
    this.fotosAreaBase64.splice(idx, 1);
    this.fotosAreaPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  tipoHallazgoClass(tipo: string): string {
    if (tipo === 'Critico') return 'badge-critico';
    if (tipo === 'Mayor') return 'badge-mayor';
    return 'badge-menor';
  }

  // ── CANVAS INSPECTOR ───────────────────────────────────────────────────────

  initCanvasInspector(): void {
    if (!this.canvasInspector) return;
    this.ctxInspector = this.canvasInspector.nativeElement.getContext('2d')!;
    this.ctxInspector.strokeStyle = '#0F6E56';
    this.ctxInspector.lineWidth = 2;
    this.ctxInspector.lineCap = 'round';
  }

  startDrawInspector(e: MouseEvent): void {
    if (!this.ctxInspector) this.initCanvasInspector();
    this.drawingInspector = true;
    this.ctxInspector!.beginPath();
    this.ctxInspector!.moveTo(e.offsetX, e.offsetY);
  }

  drawInspector(e: MouseEvent): void {
    if (!this.drawingInspector || !this.ctxInspector) return;
    this.ctxInspector.lineTo(e.offsetX, e.offsetY);
    this.ctxInspector.stroke();
  }

  stopDrawInspector(): void {
    this.drawingInspector = false;
    if (this.canvasInspector) {
      this.firmaInspectorBase64 = this.canvasInspector.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawInspectorTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxInspector) this.initCanvasInspector();
    const rect = this.canvasInspector.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingInspector = true;
    this.ctxInspector!.beginPath();
    this.ctxInspector!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawInspectorTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingInspector || !this.ctxInspector) return;
    const rect = this.canvasInspector.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxInspector.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxInspector.stroke();
  }

  clearCanvasInspector(): void {
    if (this.canvasInspector) {
      const c = this.canvasInspector.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      this.firmaInspectorBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── CANVAS REPRESENTANTE ───────────────────────────────────────────────────

  initCanvasRepresentante(): void {
    if (!this.canvasRepresentante) return;
    this.ctxRepresentante = this.canvasRepresentante.nativeElement.getContext('2d')!;
    this.ctxRepresentante.strokeStyle = '#0F6E56';
    this.ctxRepresentante.lineWidth = 2;
    this.ctxRepresentante.lineCap = 'round';
  }

  startDrawRepresentante(e: MouseEvent): void {
    if (!this.ctxRepresentante) this.initCanvasRepresentante();
    this.drawingRepresentante = true;
    this.ctxRepresentante!.beginPath();
    this.ctxRepresentante!.moveTo(e.offsetX, e.offsetY);
  }

  drawRepresentante(e: MouseEvent): void {
    if (!this.drawingRepresentante || !this.ctxRepresentante) return;
    this.ctxRepresentante.lineTo(e.offsetX, e.offsetY);
    this.ctxRepresentante.stroke();
  }

  stopDrawRepresentante(): void {
    this.drawingRepresentante = false;
    if (this.canvasRepresentante) {
      this.firmaRepresentanteBase64 = this.canvasRepresentante.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawRepresentanteTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxRepresentante) this.initCanvasRepresentante();
    const rect = this.canvasRepresentante.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingRepresentante = true;
    this.ctxRepresentante!.beginPath();
    this.ctxRepresentante!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawRepresentanteTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingRepresentante || !this.ctxRepresentante) return;
    const rect = this.canvasRepresentante.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxRepresentante.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxRepresentante.stroke();
  }

  clearCanvasRepresentante(): void {
    if (this.canvasRepresentante) {
      const c = this.canvasRepresentante.nativeElement;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      this.firmaRepresentanteBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── WIZARD NAV ─────────────────────────────────────────────────────────────

  siguiente(): void {
    if (!this.validarPaso()) return;
    if (this.paso === 1 && this.esColaborativa) {
      // Gerencial/cruzada: sin checklist, se salta directo a Hallazgos.
      this.respuestas = [];
      this.grupos = [];
      this.paso = 3;
    } else {
      if (this.paso === 1) this.cargarChecklist();
      this.paso++;
    }
    if (this.paso === 4) {
      setTimeout(() => {
        this.initCanvasInspector();
        this.initCanvasRepresentante();
      }, 100);
    }
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  anterior(): void {
    this.paso = this.paso === 3 && this.esColaborativa ? 1 : this.paso - 1;
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  validarPaso(): boolean {
    if (this.paso === 1) {
      if (!this.proyectoId) {
        Swal.fire({ icon: 'warning', title: 'Selecciona un proyecto', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.tipoId) {
        Swal.fire({ icon: 'warning', title: 'Selecciona el tipo de inspección', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.fecha) {
        Swal.fire({ icon: 'warning', title: 'Ingresa la fecha', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
    }
    if (this.paso === 4) {
      if (this.fotosAreaBase64.length < 3) {
        Swal.fire({ icon: 'warning', title: 'Mínimo 3 fotos del área', text: 'Agrega al menos 3 fotos del área inspeccionada para continuar.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        return false;
      }
    }
    return true;
  }

  guardar(): void {
    if (this.guardando) return;
    if (!this.validarPaso()) return;
    this.guardando = true;
    this.loaderService.show();

    const respuestasReq: InspeccionRespuestaRequest[] = this.respuestas
      .filter((r) => r.resultado !== '')
      .map((r) => ({
        itemId: r.itemId,
        resultado: r.resultado as 'Cumple' | 'NoCumple' | 'NA',
        observacion: r.observacion || undefined,
      }));

    const hallazgosReq: InspeccionHallazgoRequest[] = this.hallazgos.map((h) => ({
      descripcion: h.descripcion,
      tipo: h.tipo,
      area: h.area || undefined,
      responsableNombre: h.responsableNombre || undefined,
      responsableCargo: h.responsableCargo || undefined,
      fechaLimite: h.fechaLimite || undefined,
      accionCorrectiva: h.accionCorrectiva || undefined,
      fotosBase64: h.fotosBase64,
    }));

    const request: CrearInspeccionRequest = {
      proyectoId: Number(this.proyectoId),
      tipoId: Number(this.tipoId),
      empresaId: this.inspectorEmpresaId ?? undefined,
      esPlanificada: this.esPlanificada,
      fecha: this.fecha,
      horaInicio: this.horaInicio || undefined,
      horaFin: this.horaFin || undefined,
      area: this.area || undefined,
      responsableArea: this.responsableArea || undefined,
      // El worker del inspector, no solo su nombre: es lo que permite atribuir la inspección
      // en Desempeño Supervisor aunque después le corrijan el nombre en la ficha.
      inspectorWorkerId: this.inspectorId ?? undefined,
      inspectorNombre: this.inspectorNombre || undefined,
      inspectorCargo: this.inspectorCargo || undefined,
      inspectorEmpresa: this.inspectorEmpresa || undefined,
      firmaInspectorBase64: this.firmaInspectorBase64 || undefined,
      representanteNombre: this.representanteNombre || undefined,
      representanteCargo: this.representanteCargo || undefined,
      firmaRepresentanteBase64: this.firmaRepresentanteBase64 || undefined,
      descripcionCausas: this.descripcionCausas || undefined,
      conclusiones: this.conclusiones || undefined,
      esColaborativa: this.esColaborativa,
      respuestas: respuestasReq,
      hallazgos: hallazgosReq,
      fotosAreaBase64: this.fotosAreaBase64,
    };

    this.inspeccionService.crear(request).subscribe({
      next: ({ id }) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'Inspección registrada',
          text: `Inspección #${id} creada correctamente.`,
          confirmButtonText: 'Ver detalle',
          showCancelButton: true,
          cancelButtonText: 'Nueva inspección',
        }).then((res) => {
          if (res.isConfirmed) {
            this.router.navigate(['/ssoma/gestion/inspeccion', id]);
          } else {
            this.router.navigate(['/ssoma/gestion/inspeccion/nueva']);
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/inspeccion/lista']);
  }
}
