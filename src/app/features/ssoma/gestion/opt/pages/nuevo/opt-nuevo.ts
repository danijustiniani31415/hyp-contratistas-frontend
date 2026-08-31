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
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { forkJoin } from 'rxjs';
import { OptService } from '../../services/opt.service';
import { PetsService } from '../../../pets/pets.service';
import {
  OptPetDto,
  OptCriterioVerificacionDto,
  CrearOptRequest,
  OptTrabajadorRequest,
  OptVerificacionRequest,
  OptPasoRequest,
} from '../../dtos/opt.dtos';
import { ProjectService } from '../../../../../../core/services/project.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { WorkerHabilitacionListDto } from '../../../../../../features/habilitacion/dtos/trabajador.model';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../../shared/components/photo-grid-picker/photo-grid-picker';
import Swal from 'sweetalert2';

interface TrabajadorForm {
  trabajador: WorkerSearchItemDto;
  tipoTrabajador: string;
  tiempoEnObra: string;
  aniosExperiencia: string;
  firmaBase64: string;
}

interface VerificacionForm {
  criterioId: number;
  pregunta: string;
  orden: number;
  resultado: boolean;
}

interface PasoForm {
  id: number;
  numeroDisplay: string;
  descripcion: string;
  resultado: string;
  desviacionObservada: string;
}

@Component({
  selector: 'app-opt-nuevo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SearchSelect, DocumentViewer, AbrilModalPanel, PhotoGridPicker],
  templateUrl: './opt-nuevo.html',
  styleUrl: './opt-nuevo.css',
})
export class OptNuevo implements OnInit, AfterViewInit {
  paso = 1;
  readonly totalPasos = 3;
  readonly pasoLabels = ['Observación', 'Trabajadores', 'Retroalimentación'];
  guardando = false;
  loadingCatalogos = false;

  // Catálogos
  pets: OptPetDto[] = [];
  criterios: OptCriterioVerificacionDto[] = [];
  proyectos: any[] = [];
  petSeleccionado: OptPetDto | null = null;
  // PASO 1
  proyectoId: number | null = null;
  petId: number | null = null;
  fecha = new Date().toISOString().split('T')[0];
  tipoObservacion = '';
  cuentaConPet = false;
  area = '';
  seInformaTrabajador = false;
  observadorNombre = '';
  observadorCargo = '';
  petVisorUrl = '';
  petVisorNombre = '';

  // Observador — fijo, resuelto desde el usuario logueado (no editable)
  workersObservador: WorkerHabilitacionListDto[] = [];
  observadorId: number | null = null;
  observadorActual: WorkerSearchItemDto | null = null;
  resolviendoObservador = true;
  sinWorkerVinculado = false;

  // PASO 2
  trabajadores: TrabajadorForm[] = [];
  verificaciones: VerificacionForm[] = [];
  pasos: PasoForm[] = [];
  trabajadorObservadoId: number | null = null;
  pasoNextId = 1;

  // PASO 3
  seFelicito = false;
  seRecibieronComentarios = false;
  seRetroalimento = false;
  seObtuvoCCompromiso = false;
  accionRequerida = '';
  accionObservacion = '';

  // PASO 3 — fotos de la actividad
  fotosAreaBase64: string[] = [];
  fotosAreaPreview: string[] = [];

  // Canvas observador
  @ViewChild('canvasObs') canvasObs!: ElementRef<HTMLCanvasElement>;
  private ctxObs?: CanvasRenderingContext2D;
  private drawingObs = false;
  firmaObsBase64 = '';

  // Canvases trabajadores
  @ViewChildren('canvasTrab') canvasTrabList!: QueryList<ElementRef<HTMLCanvasElement>>;
  private ctxTrab: Map<number, CanvasRenderingContext2D> = new Map();
  private drawingTrabId: number | null = null;
  firmasTrabBase64: Map<number, string> = new Map();

  readonly tiposTrabajador = ['Obrero', 'Operario', 'Capataz', 'Técnico', 'Ingeniero', 'Supervisor', 'Otro'];
  readonly accionesRequeridas = ['Elaborar el PETS', 'Mantener el PETS', 'Modificar el PETS', 'Entrenamiento'];
  readonly tiposObservacion = [
    { value: 'Planeada', label: 'Planeada' },
    { value: 'No Planeada', label: 'No Planeada' },
  ];
  readonly accionesRequeridasOptions = this.accionesRequeridas.map((a) => ({ value: a, label: a }));

  constructor(
    private optService: OptService,
    private petsService: PetsService,
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
      catalogos: this.optService.getCatalogos(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, active: true }),
      workers: this.trabajadorHabService.getTrabajadores({ pageSize: 9999, soloVerificacion: true }),
    }).subscribe({
      next: ({ catalogos, proyectos, workers }) => {
        this.pets = catalogos.pets;
        this.criterios = catalogos.criterios;
        this.proyectos = proyectos.data;
        this.workersObservador = workers.data;
        this.verificaciones = catalogos.criterios.map((c) => ({
          criterioId: c.id,
          pregunta: c.pregunta,
          orden: c.orden,
          resultado: false,
        }));
        this.loadingCatalogos = false;
        this.cdr.markForCheck();
        this.resolverObservadorActual();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingCatalogos = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * El Observador ya no es un campo editable: se resuelve siempre desde el trabajador
   * vinculado al usuario logueado (Abril vía Person, contratista vía ss_contratista_usuario).
   * Si no hay vínculo, se bloquea el formulario completo.
   */
  private resolverObservadorActual(): void {
    this.resolviendoObservador = true;
    this.workerSearchService.getMe().subscribe({
      next: (me) => {
        this.observadorActual = me;
        this.sinWorkerVinculado = false;
        this.resolviendoObservador = false;
        this.observadorId = me.id;
        this.observadorNombre = me.apellidoNombre;
        this.observadorCargo = me.cargo || me.puesto || '';
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

  // ── PET ───────────────────────────────────────────────────────────────────
  onPetChange(): void {
    this.petSeleccionado = this.pets.find((p) => p.id === Number(this.petId)) ?? null;
    this.petVisorUrl = '';
    this.petVisorNombre = '';
    this.cdr.markForCheck();

    if (this.petSeleccionado) {
      if (this.pasos.length > 0) {
        Swal.fire({
          icon: 'question',
          title: 'Reemplazar pasos',
          text: `¿Traer los pasos de "${this.petSeleccionado.nombre}"? Esto reemplaza los ${this.pasos.length} paso(s) que ya tienes en la lista.`,
          showCancelButton: true,
          confirmButtonText: 'Sí, traer pasos',
          cancelButtonText: 'No, mantener los míos',
        }).then((res) => {
          if (res.isConfirmed) this.cargarPasosDelPet(this.petSeleccionado!.id);
        });
      } else {
        this.cargarPasosDelPet(this.petSeleccionado.id);
      }
    }
  }

  // Trae automáticamente los pasos del catálogo del PETS seleccionado — así OPT
  // deja de requerir tipear a mano el "paso a paso" cada vez que se observa una
  // tarea que ya tiene un PETS estructurado en la plataforma.
  private cargarPasosDelPet(petId: number): void {
    this.petsService.getPasos(petId).subscribe({
      next: (pasosPet) => {
        if (pasosPet.length === 0) return;
        this.pasos = pasosPet.map((p) => ({
          id: this.pasoNextId++,
          numeroDisplay: '',
          descripcion: p.descripcion,
          resultado: '',
          desviacionObservada: '',
        }));
        this.renumerarPasos();
        this.cdr.markForCheck();
      },
      error: () => {
        // Sin catálogo de pasos para este PETS todavía: no bloquea — se puede
        // seguir tipeando los pasos a mano como antes.
      },
    });
  }

  private readonly SHAREPOINT_SITE = 'https://abrilinmob.sharepoint.com/sites/SSOMA-Powerapps/';

  abrirVisorPet(): void {
    if (!this.petSeleccionado?.sharepointUrl) return;
    let path = this.petSeleccionado.sharepointUrl;
    if (path.startsWith(this.SHAREPOINT_SITE)) {
      path = path.slice(this.SHAREPOINT_SITE.length);
    }
    this.petVisorNombre = this.petSeleccionado.nombre;
    this.petVisorUrl = path;
    this.cdr.markForCheck();
  }

  cerrarVisorPet(): void {
    this.petVisorUrl = '';
    this.petVisorNombre = '';
    this.cdr.markForCheck();
  }

  // ── TRABAJADORES ──────────────────────────────────────────────────────────
  onTrabajadorObservadoChange(id: number | null): void {
    if (!id) return;
    const w = this.workersObservador.find((x) => x.workerId === id);
    if (!w) return;
    const dto: WorkerSearchItemDto = {
      id: w.workerId,
      apellidoNombre: w.apellidoNombre,
      dni: w.dni,
      puesto: w.puesto,
      categoria: w.categoria,
      fechaIngreso: w.fechaIngreso,
      empresaActual: w.empresaNombre,
      activo: w.estadoWorker !== 'RETIRADO',
      aniosExperiencia: w.aniosExperiencia,
    };
    this.agregarTrabajador(dto);
    setTimeout(() => {
      this.trabajadorObservadoId = null;
      this.cdr.markForCheck();
    }, 50);
  }

  agregarTrabajador(w: WorkerSearchItemDto): void {
    if (this.trabajadores.some((t) => t.trabajador.id === w.id)) return;
    this.trabajadores.push({
      trabajador: w,
      tipoTrabajador: w.categoria ?? '',
      tiempoEnObra: this.calcularTiempoEnObra(w.fechaIngreso),
      aniosExperiencia: w.aniosExperiencia?.toString() ?? '',
      firmaBase64: '',
    });
    this.firmasTrabBase64.set(w.id, '');
    this.cdr.markForCheck();
  }

  private calcularTiempoEnObra(fechaIngreso?: string): string {
    if (!fechaIngreso) return '';
    const inicio = new Date(fechaIngreso);
    const hoy = new Date();
    const meses = (hoy.getFullYear() - inicio.getFullYear()) * 12
      + (hoy.getMonth() - inicio.getMonth());
    if (meses < 1) return 'Menos de 1 mes';
    if (meses < 12) return `${meses} mes${meses > 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0
      ? `${anios} año${anios > 1 ? 's' : ''} ${resto} mes${resto > 1 ? 'es' : ''}`
      : `${anios} año${anios > 1 ? 's' : ''}`;
  }

  quitarTrabajador(id: number): void {
    this.trabajadores = this.trabajadores.filter((t) => t.trabajador.id !== id);
    this.firmasTrabBase64.delete(id);
    this.cdr.markForCheck();
  }

  // ── PASOS ────────────────────────────────────────────────────────────────
  agregarPaso(): void {
    const orden = this.pasos.length + 1;
    this.pasos.push({
      id: this.pasoNextId++,
      numeroDisplay: String(orden),
      descripcion: '',
      resultado: '',
      desviacionObservada: '',
    });
    this.cdr.markForCheck();
  }

  quitarPaso(id: number): void {
    this.pasos = this.pasos.filter((p) => p.id !== id);
    this.renumerarPasos();
    this.cdr.markForCheck();
  }

  renumerarPasos(): void {
    this.pasos.forEach((p, i) => {
      p.numeroDisplay = String(i + 1);
    });
  }

  // ── CANVAS OBSERVADOR ────────────────────────────────────────────────────
  initCanvasObs(): void {
    if (!this.canvasObs) return;
    this.ctxObs = this.canvasObs.nativeElement.getContext('2d')!;
    this.ctxObs.strokeStyle = '#0F6E56';
    this.ctxObs.lineWidth = 2;
    this.ctxObs.lineCap = 'round';
    this.cdr.markForCheck();
  }

  startDrawObs(e: MouseEvent): void {
    if (!this.ctxObs) this.initCanvasObs();
    this.drawingObs = true;
    this.ctxObs!.beginPath();
    this.ctxObs!.moveTo(e.offsetX, e.offsetY);
  }

  drawObs(e: MouseEvent): void {
    if (!this.drawingObs || !this.ctxObs) return;
    this.ctxObs.lineTo(e.offsetX, e.offsetY);
    this.ctxObs.stroke();
  }

  stopDrawObs(): void {
    this.drawingObs = false;
    if (this.canvasObs) {
      this.firmaObsBase64 = this.canvasObs.nativeElement.toDataURL('image/png').split(',')[1];
    }
  }

  startDrawObsTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctxObs) this.initCanvasObs();
    const rect = this.canvasObs.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingObs = true;
    this.ctxObs!.beginPath();
    this.ctxObs!.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawObsTouch(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawingObs || !this.ctxObs) return;
    const rect = this.canvasObs.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    this.ctxObs.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    this.ctxObs.stroke();
  }

  clearCanvasObs(): void {
    if (this.canvasObs) {
      const canvas = this.canvasObs.nativeElement;
      this.canvasObs.nativeElement.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      this.firmaObsBase64 = '';
      this.cdr.markForCheck();
    }
  }

  // ── CANVAS TRABAJADORES ──────────────────────────────────────────────────
  getCanvasTrab(idx: number): HTMLCanvasElement | null {
    const list = this.canvasTrabList?.toArray();
    return list?.[idx]?.nativeElement ?? null;
  }

  initCtxTrab(id: number, idx: number): CanvasRenderingContext2D | null {
    const canvas = this.getCanvasTrab(idx);
    if (!canvas) return null;
    if (!this.ctxTrab.has(id)) {
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#0F6E56';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      this.ctxTrab.set(id, ctx);
    }
    return this.ctxTrab.get(id)!;
  }

  startDrawTrab(e: MouseEvent, id: number, idx: number): void {
    const ctx = this.initCtxTrab(id, idx);
    if (!ctx) return;
    this.drawingTrabId = id;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }

  drawTrab(e: MouseEvent, id: number): void {
    if (this.drawingTrabId !== id) return;
    const ctx = this.ctxTrab.get(id);
    if (!ctx) return;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  }

  stopDrawTrab(id: number, idx: number): void {
    this.drawingTrabId = null;
    const canvas = this.getCanvasTrab(idx);
    if (canvas) {
      this.firmasTrabBase64.set(id, canvas.toDataURL('image/png').split(',')[1]);
    }
  }

  startDrawTrabTouch(e: TouchEvent, id: number, idx: number): void {
    e.preventDefault();
    const ctx = this.initCtxTrab(id, idx);
    if (!ctx) return;
    const canvas = this.getCanvasTrab(idx)!;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    this.drawingTrabId = id;
    ctx.beginPath();
    ctx.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  }

  drawTrabTouch(e: TouchEvent, id: number): void {
    e.preventDefault();
    if (this.drawingTrabId !== id) return;
    const ctx = this.ctxTrab.get(id);
    const canvas = this.canvasTrabList.toArray().find((_, i) => this.trabajadores[i]?.trabajador.id === id);
    if (!ctx || !canvas) return;
    const rect = canvas.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    ctx.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    ctx.stroke();
  }

  clearCanvasTrab(id: number, idx: number): void {
    const canvas = this.getCanvasTrab(idx);
    if (canvas) {
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      this.firmasTrabBase64.set(id, '');
      this.ctxTrab.delete(id);
      this.cdr.markForCheck();
    }
  }

  // ── NAVEGACIÓN WIZARD ────────────────────────────────────────────────────
  get puedeAvanzar(): boolean {
    if (this.sinWorkerVinculado || this.resolviendoObservador) return false;
    switch (this.paso) {
      case 1:
        return (
          (this.proyectoId ?? 0) > 0 &&
          !!this.fecha &&
          !!this.tipoObservacion &&
          !!this.area &&
          !!this.observadorNombre
        );
      case 2:
        return this.trabajadores.length >= 1;
      default:
        return true;
    }
  }

  siguiente(): void {
    if (!this.validarPaso()) return;
    this.paso++;
    if (this.paso === 3) {
      setTimeout(() => this.initCanvasObs(), 100);
    }
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  anterior(): void {
    this.paso--;
    this.cdr.markForCheck();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFotoAreaChange(files: FileList): void {
    for (let i = 0; i < files.length && this.fotosAreaBase64.length < 10; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        this.fotosAreaPreview.push(dataUrl);
        this.fotosAreaBase64.push(dataUrl.split(',')[1]);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(files[i]);
    }
  }

  quitarFotoArea(idx: number): void {
    this.fotosAreaBase64.splice(idx, 1);
    this.fotosAreaPreview.splice(idx, 1);
    this.cdr.markForCheck();
  }

  validarPaso(): boolean {
    if (this.paso === 1) {
      if (!this.proyectoId || this.proyectoId <= 0) {
        Swal.fire({ icon: 'warning', title: 'Selecciona un proyecto', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.tipoObservacion) {
        Swal.fire({ icon: 'warning', title: 'Selecciona el tipo de observación', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
      if (!this.fecha) {
        Swal.fire({ icon: 'warning', title: 'Ingresa la fecha', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
    }
    if (this.paso === 2) {
      if (this.trabajadores.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Agrega al menos un trabajador', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        return false;
      }
    }
    if (this.paso === 3) {
      if (this.fotosAreaBase64.length < 3) {
        Swal.fire({ icon: 'warning', title: 'Mínimo 3 fotos de la actividad', text: 'Agrega al menos 3 fotos de la actividad observada para continuar.', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
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

    const trabajadoresReq: OptTrabajadorRequest[] = this.trabajadores.map((t) => ({
      trabajadorId: t.trabajador.id,
      tipoTrabajador: t.tipoTrabajador || undefined,
      tiempoEnObra: t.tiempoEnObra || undefined,
      aniosExperiencia: t.aniosExperiencia || undefined,
      firmaTrabajadorBase64: this.firmasTrabBase64.get(t.trabajador.id) || undefined,
    }));

    const verificacionesReq: OptVerificacionRequest[] = this.verificaciones.map((v) => ({
      criterioId: v.criterioId,
      resultado: v.resultado,
    }));

    const pasosReq: OptPasoRequest[] = this.pasos.map((p, i) => ({
      numeroDisplay: p.numeroDisplay,
      descripcion: p.descripcion,
      nivel: 1,
      resultado: p.resultado || undefined,
      desviacionObservada: p.desviacionObservada || undefined,
      orden: i + 1,
    }));

    const request: CrearOptRequest = {
      proyectoId: Number(this.proyectoId ?? 0),
      petId: this.petId ? Number(this.petId) : undefined,
      fecha: this.fecha,
      tipoObservacion: this.tipoObservacion,
      cuentaConPet: this.cuentaConPet,
      area: this.area || undefined,
      seInformaTrabajador: this.seInformaTrabajador,
      observadorId: this.observadorId ?? undefined,
      observadorNombre: this.observadorNombre || undefined,
      observadorCargo: this.observadorCargo || undefined,
      firmaObservadorBase64: this.firmaObsBase64 || undefined,
      seFelicito: this.seFelicito,
      seRecibieronComentarios: this.seRecibieronComentarios,
      seRetroalimento: this.seRetroalimento,
      seObtuvoCCompromiso: this.seObtuvoCCompromiso,
      accionRequerida: this.accionRequerida || undefined,
      accionObservacion: this.accionObservacion || undefined,
      trabajadores: trabajadoresReq,
      verificaciones: verificacionesReq,
      pasos: pasosReq,
      fotosAreaBase64: this.fotosAreaBase64,
    };

    this.optService.crearOpt(request).subscribe({
      next: ({ id }) => {
        this.guardando = false;
        this.loaderService.hide();
        Swal.fire({
          icon: 'success',
          title: 'OPT registrada',
          text: `OPT #${id} creada correctamente.`,
          confirmButtonText: 'Ver detalle',
          showCancelButton: true,
          cancelButtonText: 'Nueva OPT',
        }).then((res) => {
          if (res.isConfirmed) {
            this.router.navigate(['/ssoma/gestion/opt', id]);
          } else {
            this.router.navigate(['/ssoma/gestion/opt/nuevo']);
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
    this.router.navigate(['/ssoma/gestion/opt/lista']);
  }
}
