import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';
import { RacService } from '../../services/rac.service';
import { RacCategoriaDto, RacCreateRequest, RacInfraccionDto } from '../../dtos/rac.dtos';
import { CatalogosSaludService } from '../../../../salud-ocupacional/services/catalogos-salud.service';
import { EmpresaSimpleDto } from '../../../../salud-ocupacional/dtos/catalogos.model';
import { ProjectService } from '../../../../../../core/services/project.service';
import { ProjectGetDTO } from '../../../../../../core/dtos/project/project.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import { compressImages } from '../../../../../../shared/utils/image-compress';
import { TrabajadorHabService } from '../../../../../../features/habilitacion/services/trabajador-hab.service';
import { WorkerSearchService } from '../../../../salud-ocupacional/services/worker-search.service';
import { WorkerSearchItemDto } from '../../../../salud-ocupacional/dtos/worker-search.model';
import { WorkerHabilitacionListDto } from '../../../../../../features/habilitacion/dtos/trabajador.model';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { PhotoGridPicker } from '../../../../../../shared/components/photo-grid-picker/photo-grid-picker';

@Component({
  selector: 'app-rac-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, AbrilModalPanel, PhotoGridPicker],
  templateUrl: './rac-nuevo.html',
  styleUrl: './rac-nuevo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacNuevo implements OnInit {
  saving = false;
  loadingCatalogos = true;

  // Datos del evento
  proyectoId: number | null = null;
  fechaReporte = '';
  tipo = '';
  categoriaId: number | null = null;
  severidad = '';
  proyectoPiso = '';
  lugarDescripcion = '';
  descripcion = '';
  descripcionOcurrido = '';

  // Observador (reportante) — fijo, resuelto desde el usuario logueado (no editable)
  esAnonimoReportante = false;
  reportanteId: number | null = null;
  reportanteCargo = '';
  empresaReportanteId: number | null = null;
  empresaReportanteNombre = '';
  observadorActual: WorkerSearchItemDto | null = null;
  resolviendoObservador = true;
  sinWorkerVinculado = false;

  // Trabajador(es) observado(s)
  esAnonimoObservado = false;
  esAnonimaEmpresaReportada = false;
  trabajadorObservadoId: number | null = null;
  observadosSeleccionados: WorkerHabilitacionListDto[] = [];
  empresaReportadaId: number | null = null;

  // Catálogo de trabajadores (preload, igual que OPT/Inspección)
  workers: WorkerHabilitacionListDto[] = [];

  // Fotos de evidencia
  fotosSeleccionadas: File[] = [];
  fotoPreviews: string[] = [];
  fotosSubiendo = false;

  // Plan de acción
  planAccion = '';
  plazoLevantamiento = '';

  // Penalidad
  aplicaPenalidad = false;
  infraccionId: number | null = null;

  // Catálogos
  categorias: RacCategoriaDto[] = [];
  infracciones: RacInfraccionDto[] = [];
  empresas: EmpresaSimpleDto[] = [];
  proyectos: ProjectGetDTO[] = [];

  readonly TIPO_OPCIONES = [
    { value: 'ACTO', label: 'Acto Subestándar' },
    { value: 'CONDICION', label: 'Condición Subestándar' },
  ];

  readonly SEVERIDAD_OPCIONES = [
    { value: 'CRITICO', label: 'Crítico' },
    { value: 'ALTO', label: 'Alto' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'BAJO', label: 'Bajo' },
  ];

  constructor(
    private racService: RacService,
    private trabajadorHabService: TrabajadorHabService,
    private workerSearchService: WorkerSearchService,
    private catalogosSalud: CatalogosSaludService,
    private projectService: ProjectService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCatalogos();
  }

  private loadCatalogos(): void {
    forkJoin({
      categorias: this.racService.getCategorias(),
      infracciones: this.racService.getInfracciones(),
      empresas: this.catalogosSalud.getEmpresas(),
      proyectos: this.projectService.getProjectsPaged({ pageSize: 200, estado: 'ACTIVO' }),
      workers: this.trabajadorHabService.getTrabajadores({ pageSize: 9999, soloVerificacion: true }),
    }).subscribe({
      next: ({ categorias, infracciones, empresas, proyectos, workers }) => {
        this.categorias = categorias;
        this.workers = workers.data;
        this.infracciones = infracciones;
        this.empresas = empresas;
        this.proyectos = proyectos.data;
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

  // ── Observador (reportante) ────────────────────────────────────────

  /**
   * El Observador ya no es un campo editable: se resuelve siempre desde el trabajador
   * vinculado al usuario logueado (Abril vía Person, contratista vía ss_contratista_usuario).
   * Si no hay vínculo, se bloquea el formulario completo — no tiene sentido dejar reportar
   * a nombre de "nadie".
   */
  private resolverObservadorActual(): void {
    this.resolviendoObservador = true;
    this.workerSearchService.getMe().subscribe({
      next: (me) => {
        this.observadorActual = me;
        this.sinWorkerVinculado = false;
        this.resolviendoObservador = false;
        this.reportanteId = me.id;
        this.reportanteCargo = me.cargo || me.puesto || '';
        if (me.empresaActualId) {
          this.empresaReportanteId = me.empresaActualId;
          this.empresaReportanteNombre = me.empresaActual || '';
        }
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

  // ── Trabajador(es) observado(s) ────────────────────────────────────

  onTrabajadorObservadoChange(id: number | null): void {
    if (!id) return;
    const w = this.workers.find((x) => x.workerId === id);
    if (!w) return;
    if (!this.observadosSeleccionados.some((s) => s.workerId === w.workerId)) {
      this.observadosSeleccionados = [...this.observadosSeleccionados, w];
      if (w.empresaId && !this.empresaReportadaId) {
        this.empresaReportadaId = w.empresaId;
      }
    }
    setTimeout(() => {
      this.trabajadorObservadoId = null;
      this.cdr.markForCheck();
    }, 50);
  }

  removeObservado(workerId: number): void {
    this.observadosSeleccionados = this.observadosSeleccionados.filter((s) => s.workerId !== workerId);
    this.cdr.markForCheck();
  }

  // ── Submit ────────────────────────────────────────────────────────

  /**
   * Solo se exigen campos que el usuario puede ver y llenar en el formulario.
   * `empresaReportanteId` NO entra acá aunque se envíe: se resuelve solo desde la
   * vinculación vigente del observador y no tiene control en la UI, así que un
   * usuario sin vinculación vigente se quedaba con el botón deshabilitado para
   * siempre y sin ninguna pista de por qué (era el caso reportado). El backend la
   * acepta nula.
   */
  get canSubmit(): boolean {
    return !!(
      !this.sinWorkerVinculado &&
      !this.resolviendoObservador &&
      this.proyectoId &&
      this.fechaReporte &&
      this.tipo &&
      this.categoriaId &&
      this.severidad &&
      this.descripcion.trim() &&
      this.planAccion.trim() &&
      this.plazoLevantamiento &&
      this.empresaReportadaId &&
      this.fotosSeleccionadas.length > 0 &&
      !this.saving
    );
  }

  onFotosSeleccionadas(files: FileList): void {
    // Las fotos de cámara pueden pesar 8-15MB; comprimirlas antes de subir evita
    // que la subida falle por timeout en datos móviles.
    compressImages(Array.from(files)).then((comprimidas) => {
      this.fotosSeleccionadas = [...this.fotosSeleccionadas, ...comprimidas];
      this.fotoPreviews = [...this.fotoPreviews, ...comprimidas.map((f) => URL.createObjectURL(f))];
      this.cdr.markForCheck();
    });
  }

  removeFoto(index: number): void {
    URL.revokeObjectURL(this.fotoPreviews[index]);
    this.fotosSeleccionadas = this.fotosSeleccionadas.filter((_, i) => i !== index);
    this.fotoPreviews = this.fotoPreviews.filter((_, i) => i !== index);
    this.cdr.markForCheck();
  }

  submit(): void {
    if (!this.canSubmit) return;

    const req: RacCreateRequest = {
      proyectoId: this.proyectoId!,
      tipo: this.tipo,
      categoriaId: this.categoriaId!,
      severidad: this.severidad,
      esAnonimoReportante: this.esAnonimoReportante,
      reportanteId: this.reportanteId ?? undefined,
      reportanteCargo: this.reportanteCargo || undefined,
      empresaReportanteId: this.empresaReportanteId ?? undefined,
      esAnonimoObservado: this.esAnonimoObservado,
      observadoWorkerIds: this.observadosSeleccionados.map((w) => w.workerId),
      empresaReportadaId: this.empresaReportadaId ?? undefined,
      proyectoPiso: this.proyectoPiso || undefined,
      lugarDescripcion: this.lugarDescripcion || undefined,
      descripcion: this.descripcion,
      descripcionOcurrido: this.descripcionOcurrido || undefined,
      planAccion: this.planAccion || undefined,
      fechaReporte: this.fechaReporte,
      plazoLevantamiento: this.plazoLevantamiento || undefined,
      aplicaPenalidad: this.aplicaPenalidad,
      infraccionId: this.aplicaPenalidad && this.infraccionId ? this.infraccionId : undefined,
    };

    this.saving = true;
    this.loaderService.show();
    this.racService.crear(req).subscribe({
      next: (res) => {
        const mostrarSwalYNavegar = (fotosFallaron = false) => {
          this.saving = false;
          this.fotosSubiendo = false;
          this.loaderService.hide();
          Swal.fire({
            icon: fotosFallaron ? 'warning' : 'success',
            title: fotosFallaron ? 'RAC registrado, pero las fotos no se pudieron subir' : 'RAC registrado',
            html: fotosFallaron
              ? `Código: <b>${res.codigo}</b><br>Vuelve a intentar subir las fotos desde el detalle del RAC.`
              : `Código: <b>${res.codigo}</b>`,
            timer: fotosFallaron ? undefined : 2500,
            showConfirmButton: fotosFallaron,
          }).then(() => this.router.navigate(['/ssoma/gestion/rac/lista']));
        };

        if (this.fotosSeleccionadas.length > 0) {
          this.fotosSubiendo = true;
          // catchError por foto: una falla individual (típico en datos móviles) no debe
          // tumbar la subida de las demás ni reportar "todo falló" cuando en realidad
          // solo una imagen no llegó.
          forkJoin(
            this.fotosSeleccionadas.map(f =>
              this.racService.subirFoto(res.id, f, 'Observacion').pipe(catchError(() => of(null))),
            ),
          ).subscribe((resultados) => {
            const algunaFallo = resultados.some((r) => r === null);
            mostrarSwalYNavegar(algunaFallo);
          });
        } else {
          mostrarSwalYNavegar(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/ssoma/gestion/rac/dashboard']);
  }
}
