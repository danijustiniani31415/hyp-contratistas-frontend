import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Paginator } from '../../../../shared/components/paginator/paginator';
import { TitleCasePipe } from '../../../../shared/pipes/title-case.pipe';
import { AbrilBulkActionDirective } from '../../../../shared/directives/abril-bulk-action.directive';
import { ClientPager } from '../../../../shared/utils/client-pager';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ResponsablesService } from '../../../../core/services/responsables.service';
import {
  ResponsableProyectoDTO,
  ResponsableRazonSocialDTO,
  ResponsableWorkerOptionDTO,
  ResponsablesDTO,
} from '../../../../core/dtos/habilitacion/responsables.model';

/** Los 4 correos de proyecto que alimentan los avisos de EMOs (EmoAlertaService.BuildDestinatarios). */
export type CampoProyecto = 'emailResponsable' | 'emailRrhh' | 'emailCoordSsoma' | 'emailCoordAdmin';

/**
 * Sentinel para "dejar el campo en blanco" en el picker, distinto de `null` (que significa
 * "sin cambios pendientes, mantener lo que ya estaba guardado"). No hay workerId real con
 * este valor.
 */
export const CAMPO_PROYECTO_LIMPIAR = -1;
export const CAMPOS_PROYECTO: { campo: CampoProyecto; label: string }[] = [
  { campo: 'emailResponsable', label: 'Responsable' },
  { campo: 'emailRrhh', label: 'RR.HH.' },
  { campo: 'emailCoordSsoma', label: 'Coord. SSOMA' },
  { campo: 'emailCoordAdmin', label: 'Coord. Administración' },
];

@Component({
  selector: 'app-responsables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AbrilPageHeaderComponent,
    SearchSelect,
    SearchInput,
    Paginator,
    TitleCasePipe,
    AbrilBulkActionDirective,
  ],
  templateUrl: './responsables.html',
  styleUrl: './responsables.css',
})
export class Responsables implements OnInit {
  loading = false;
  data: ResponsablesDTO = { razonesSociales: [], proyectos: [], trabajadores: [] };

  razonesSocialesSearch = '';
  proyectosSearch = '';
  razonesSocialesPager = new ClientPager<ResponsableRazonSocialDTO>();
  proyectosPager = new ClientPager<ResponsableProyectoDTO>();

  readonly camposProyecto = CAMPOS_PROYECTO;
  readonly campoLimpiar = CAMPO_PROYECTO_LIMPIAR;

  /** workerId elegido en el picker por fila, antes de guardar (contributorId -> workerId). */
  pendingRazonSocialWorker: Record<number, number | null> = {};
  /** Igual, pero por proyecto Y por campo: projectId -> campo -> workerId. */
  pendingProyectoWorker: Record<number, Partial<Record<CampoProyecto, number | null>>> = {};
  /** Residente elegido en el picker por proyecto, antes de guardar: projectId -> workerId. */
  pendingProyectoResidente: Record<number, number | null> = {};
  savingRazonSocial: Record<number, boolean> = {};
  savingProyecto: Record<number, boolean> = {};

  constructor(
    private service: ResponsablesService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  get filteredRazonesSociales(): ResponsableRazonSocialDTO[] {
    return this.data.razonesSociales.filter((r) =>
      SearchInput.matches(r.contributorName, this.razonesSocialesSearch),
    );
  }

  get pagedRazonesSociales(): ResponsableRazonSocialDTO[] {
    return this.razonesSocialesPager.page(this.filteredRazonesSociales);
  }

  get filteredProyectos(): ResponsableProyectoDTO[] {
    return this.data.proyectos.filter((p) =>
      SearchInput.matches(p.projectDescription, this.proyectosSearch),
    );
  }

  get pagedProyectos(): ResponsableProyectoDTO[] {
    return this.proyectosPager.page(this.filteredProyectos);
  }

  onRazonSocialSearch(): void {
    this.razonesSocialesPager.reset();
  }

  onProyectoSearch(): void {
    this.proyectosPager.reset();
  }

  trabajadorOptions(): ResponsableWorkerOptionDTO[] {
    return this.data.trabajadores;
  }

  /**
   * El correo guardado es texto suelto, no una referencia al trabajador (ver comentario en
   * ResponsablesDtos.cs) — si la persona ya no está activa (se retiró) o cambió de correo
   * corporativo, ese texto queda huérfano. `data.trabajadores` solo trae Casa no-retirados, así
   * que si el correo guardado ya no aparece ahí, se trata como "sin administrador asignado" en
   * vez de mostrar un correo de alguien que ya se fue.
   */
  private esCorreoVigente(email: string | null): boolean {
    if (!email) return false;
    const normalizado = email.trim().toLowerCase();
    return this.data.trabajadores.some((w) => w.email.trim().toLowerCase() === normalizado);
  }

  /** Correo de la razón social: el que se guardó (si sigue vigente), o el recién elegido (aún sin guardar). */
  emailRazonSocial(row: ResponsableRazonSocialDTO): string | null {
    const pendingId = this.pendingRazonSocialWorker[row.contributorId];
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.email ?? null;
    }
    return this.esCorreoVigente(row.emailAdministrador) ? row.emailAdministrador : null;
  }

  pendingProyectoWorkerFor(projectId: number, campo: CampoProyecto): number | null {
    return this.pendingProyectoWorker[projectId]?.[campo] ?? null;
  }

  setPendingProyectoWorker(projectId: number, campo: CampoProyecto, workerId: number | null): void {
    this.pendingProyectoWorker[projectId] ??= {};
    this.pendingProyectoWorker[projectId][campo] = workerId;
  }

  /** Marca el campo para dejarlo en blanco al guardar (la persona ya no está a cargo). */
  limpiarPendingProyectoWorker(projectId: number, campo: CampoProyecto): void {
    this.setPendingProyectoWorker(projectId, campo, CAMPO_PROYECTO_LIMPIAR);
  }

  emailProyecto(row: ResponsableProyectoDTO, campo: CampoProyecto): string | null {
    const pendingId = this.pendingProyectoWorkerFor(row.projectId, campo);
    if (pendingId === CAMPO_PROYECTO_LIMPIAR) return null;
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.email ?? null;
    }
    return this.esCorreoVigente(row[campo]) ? row[campo] : null;
  }

  /** Residente: no es texto suelto, es la FK project.residente_workers_id — el correo ya viene
   *  resuelto en vivo desde la ficha del trabajador (ResponsablesRepository.GetAll), así que no
   *  aplica el filtro de "vigente" que sí necesitan los otros 4 campos de texto. */
  pendingProyectoResidenteFor(projectId: number): number | null {
    return this.pendingProyectoResidente[projectId] ?? null;
  }

  setPendingProyectoResidente(projectId: number, workerId: number | null): void {
    this.pendingProyectoResidente[projectId] = workerId;
  }

  limpiarPendingProyectoResidente(projectId: number): void {
    this.setPendingProyectoResidente(projectId, CAMPO_PROYECTO_LIMPIAR);
  }

  residenteNombreProyecto(row: ResponsableProyectoDTO): string | null {
    const pendingId = this.pendingProyectoResidenteFor(row.projectId);
    if (pendingId === CAMPO_PROYECTO_LIMPIAR) return null;
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.nombreCompleto ?? null;
    }
    return row.residenteNombre;
  }

  residenteEmailProyecto(row: ResponsableProyectoDTO): string | null {
    const pendingId = this.pendingProyectoResidenteFor(row.projectId);
    if (pendingId === CAMPO_PROYECTO_LIMPIAR) return null;
    if (pendingId != null) {
      return this.data.trabajadores.find((w) => w.workerId === pendingId)?.email ?? null;
    }
    return row.residenteEmail;
  }

  /** Hay algo sin guardar en el residente o en cualquiera de los 4 campos de este proyecto. */
  proyectoTienePendientes(projectId: number): boolean {
    const pend = this.pendingProyectoWorker[projectId];
    const pendResidente = this.pendingProyectoResidente[projectId];
    return (!!pend && Object.values(pend).some((v) => v != null)) || pendResidente != null;
  }

  guardarRazonSocial(row: ResponsableRazonSocialDTO): void {
    const workerId = this.pendingRazonSocialWorker[row.contributorId];
    if (workerId == null) return;
    const email = this.data.trabajadores.find((w) => w.workerId === workerId)?.email ?? null;

    this.savingRazonSocial[row.contributorId] = true;
    this.service.updateRazonSocial(row.contributorId, email).subscribe({
      next: () => {
        row.emailAdministrador = email;
        delete this.pendingRazonSocialWorker[row.contributorId];
        this.savingRazonSocial[row.contributorId] = false;
        Swal.fire({ icon: 'success', title: 'Administrador actualizado', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingRazonSocial[row.contributorId] = false;
        this.errorService.handleError(err);
      },
    });
  }

  guardarProyecto(row: ResponsableProyectoDTO): void {
    if (!this.proyectoTienePendientes(row.projectId)) return;

    // Cada campo se resuelve al valor recién elegido (si lo hay) o se mantiene el que ya
    // tenía guardado — el PUT reemplaza los 4 a la vez, así que hay que enviarlos completos.
    const valores = Object.fromEntries(
      this.camposProyecto.map(({ campo }) => [
        campo,
        this.pendingProyectoWorkerFor(row.projectId, campo) === CAMPO_PROYECTO_LIMPIAR
          ? null
          : this.emailProyecto(row, campo),
      ]),
    ) as Record<CampoProyecto, string | null>;

    const pendResidente = this.pendingProyectoResidenteFor(row.projectId);
    const residenteWorkersId =
      pendResidente === CAMPO_PROYECTO_LIMPIAR
        ? null
        : pendResidente != null
          ? pendResidente
          : row.residenteWorkersId;

    this.savingProyecto[row.projectId] = true;
    this.service.updateProyecto(row.projectId, { ...valores, residenteWorkersId }).subscribe({
      next: () => {
        this.camposProyecto.forEach(({ campo }) => (row[campo] = valores[campo]));
        row.residenteWorkersId = residenteWorkersId;
        row.residenteNombre = this.residenteNombreProyecto(row);
        row.residenteEmail = this.residenteEmailProyecto(row);
        delete this.pendingProyectoWorker[row.projectId];
        delete this.pendingProyectoResidente[row.projectId];
        this.savingProyecto[row.projectId] = false;
        Swal.fire({ icon: 'success', title: 'Responsables actualizados', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingProyecto[row.projectId] = false;
        this.errorService.handleError(err);
      },
    });
  }
}
