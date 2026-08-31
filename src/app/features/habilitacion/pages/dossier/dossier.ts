import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { DossierService } from '../../services/dossier.service';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { ProjectService } from '../../../../core/services/project.service';
import { SearchSelect } from '../../../../shared/components/search-select/search-select';
import { DossierUploadModal } from './components/dossier-upload-modal/dossier-upload-modal';
import { DossierRevisarModal } from './components/dossier-revisar-modal/dossier-revisar-modal';
import {
  DossierEstadoSemana,
  DossierSemanaDto,
} from '../../dtos/dossier.model';
import { EmpresaContratistaListDto } from '../../dtos/empresa.model';

interface ProyectoSimple { id: number; nombre: string; }

@Component({
  selector: 'app-hab-dossier',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect, DossierUploadModal, DossierRevisarModal],
  templateUrl: './dossier.html',
  styleUrl: './dossier.css',
})
export class Dossier implements OnInit {
  empresas: EmpresaContratistaListDto[] = [];
  empresaId: number | null = null;

  proyectos: ProyectoSimple[] = [];
  proyectoId: number | null = null;
  loadingProyectos = false;

  semanas: DossierSemanaDto[] = [];
  loadingSemanas = false;
  filtroSemana: number | null = null;

  uploadModalSemanaId: number | null = null;
  revisarModalSemanaId: number | null = null;

  constructor(
    private dossierService: DossierService,
    private empresaContratistaService: EmpresaContratistaService,
    private projectService: ProjectService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.isContratista()) {
      this.empresaId = this.authService.getEmpresaId();
      this.loadProyectosContratista();
    } else {
      this.loadEmpresasAdmin();
      this.loadProyectosGlobal();
      this.loadSemanas();
    }
  }

  isContratista(): boolean {
    return this.authService.isContratista();
  }

  get puedeVerLista(): boolean {
    return this.isContratista() ? !!this.proyectoId : true;
  }

  get semanasFiltradas(): DossierSemanaDto[] {
    let lista = this.isContratista()
      ? this.semanas
      : this.semanas.filter((s) => s.docsSubidos > 0 || s.estado !== 'Borrador');
    if (this.filtroSemana) lista = lista.filter((s) => s.numeroSemana === this.filtroSemana);
    return lista;
  }

  get totalRevisados(): number {
    return this.semanasFiltradas.filter(
      (s) => s.estado === 'Aprobado' || s.estado === 'Rechazado' || s.estado === 'Observado',
    ).length;
  }

  get totalPorRevisar(): number {
    return this.semanasFiltradas.filter((s) => s.estado === 'Enviado').length;
  }

  onFiltroSemanaChange(): void {
    this.cdr.detectChanges();
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────

  private loadEmpresasAdmin(): void {
    this.empresaContratistaService.getEmpresas({ soloContratistas: true, pageSize: 200 }).subscribe({
      next: (res) => {
        this.empresas = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  onEmpresaChange(id: number | null): void {
    this.empresaId = id;
    this.loadSemanas();
    this.cdr.detectChanges();
  }

  private loadProyectosGlobal(): void {
    this.loadingProyectos = true;
    this.projectService.getProjectsPaged({ pageSize: 500 }).subscribe({
      next: (res) => {
        this.proyectos = (res.data ?? [])
          .filter((p) => p.estado === 'ACTIVO')
          .map((p) => ({ id: p.projectId, nombre: p.projectDescription }));
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── CONTRATISTA ───────────────────────────────────────────────────────────

  private loadProyectosContratista(): void {
    if (!this.empresaId) return;
    this.loadingProyectos = true;
    this.empresaContratistaService.getProyectos(this.empresaId).subscribe({
      next: (res: any[]) => {
        this.proyectos = (res ?? []).map((p) => ({
          id: p.proyectoId,
          nombre: p.proyectoNombre,
        }));
        this.loadingProyectos = false;
        if (this.proyectos.length === 1) {
          this.proyectoId = this.proyectos[0].id;
          this.loadSemanas();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingProyectos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── SEMANAS ───────────────────────────────────────────────────────────────

  onProyectoChange(id: number | null): void {
    this.proyectoId = id;
    if (id || !this.isContratista()) this.loadSemanas();
    this.cdr.detectChanges();
  }

  loadSemanas(): void {
    if (this.isContratista() && !this.proyectoId) return;
    this.loadingSemanas = true;
    this.dossierService.getSemanas(this.proyectoId, this.empresaId).subscribe({
      next: (res) => {
        this.semanas = res ?? [];
        this.loadingSemanas = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingSemanas = false;
        this.errorService.handleError(err);
      },
    });
  }

  // ── CHIPS / ESTILOS ───────────────────────────────────────────────────────

  chipSemana(estado: DossierEstadoSemana): string {
    if (estado === 'Aprobado') return 'chip-green';
    if (estado === 'Rechazado') return 'chip-red';
    if (estado === 'Observado') return 'chip-orange';
    if (estado === 'Enviado') return 'chip-blue';
    if (estado === 'NoAplica') return 'chip-gray';
    return 'chip-blue';
  }

  labelSemana(estado: DossierEstadoSemana): string {
    if (estado === 'NoAplica') return 'N/A';
    if (estado === 'Observado') return 'Con observaciones';
    return estado;
  }

  // ── ACCIONES ADMIN ────────────────────────────────────────────────────────

  abrirRevisar(semana: DossierSemanaDto): void {
    this.revisarModalSemanaId = semana.id;
    this.cdr.detectChanges();
  }

  onRevisarClosed(changed: boolean): void {
    this.revisarModalSemanaId = null;
    if (changed) this.loadSemanas();
    this.cdr.detectChanges();
  }

  // ── ACCIONES CONTRATISTA ──────────────────────────────────────────────────

  abrirNuevaSemana(): void {
    console.log('proyectoId:', this.proyectoId, 'empresaId:', this.empresaId);
    const anioActual = new Date().getFullYear();
    Swal.fire({
      title: 'Nueva semana',
      html: `
        <div style="display:flex;gap:12px;justify-content:center;margin-top:8px">
          <div>
            <label style="font-size:13px;color:#666">Semana</label>
            <input id="swal-semana" type="number" min="1" max="53" value="${this.getISOWeek(new Date())}"
              class="swal2-input" style="width:90px;margin:4px 0 0">
          </div>
          <div>
            <label style="font-size:13px;color:#666">Año</label>
            <input id="swal-anio" type="number" min="2024" max="2030" value="${anioActual}"
              class="swal2-input" style="width:100px;margin:4px 0 0">
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const semana = parseInt((document.getElementById('swal-semana') as HTMLInputElement).value);
        const anio = parseInt((document.getElementById('swal-anio') as HTMLInputElement).value);
        if (!semana || semana < 1 || semana > 53) {
          Swal.showValidationMessage('Semana inválida (1-53)');
          return false;
        }
        return { semana, anio };
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value || !this.empresaId || !this.proyectoId) return;
      this.loaderService.show();
      this.dossierService.ensureSemana({
        contributorId: this.empresaId,
        proyectoId: this.proyectoId,
        numeroSemana: result.value.semana,
        anio: result.value.anio,
      }).subscribe({
        next: () => { this.loaderService.hide(); this.loadSemanas(); },
        error: (err: HttpErrorResponse) => { this.loaderService.hide(); this.errorService.handleError(err); },
      });
    });
  }

  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  abrirUpload(semana: DossierSemanaDto): void {
    this.uploadModalSemanaId = semana.id;
    this.cdr.detectChanges();
  }

  onUploadClosed(changed: boolean): void {
    this.uploadModalSemanaId = null;
    if (changed) this.loadSemanas();
    this.cdr.detectChanges();
  }
}
