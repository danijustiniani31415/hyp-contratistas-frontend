import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ClinicaService } from '../../../services/clinica.service';
import { ClinicaUsuarioService } from '../../../services/clinica-usuario.service';
import { ClinicaDetalleDto, ClinicaUpsertDto, ClinicaUsuarioListDto } from '../../../dtos/clinica.model';
import { Paginator } from '../../../../../shared/components/paginator/paginator';
import { AgregarUsuario } from './components/agregar-usuario/agregar-usuario';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import Swal from 'sweetalert2';

type Tab = 'datos' | 'usuarios';

@Component({
  selector: 'app-clinica-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, Paginator, AgregarUsuario],
  templateUrl: './clinica-detalle.html',
  styleUrl: './clinica-detalle.css',
})
export class ClinicaDetalle implements OnInit {
  clinicaId!: number;
  clinica: ClinicaDetalleDto | null = null;
  activeTab: Tab = 'datos';

  form: ClinicaUpsertDto = { nombre: '', ruc: '', direccion: '', telefono: '', email: '' };
  savingDatos = false;

  usuarios: ClinicaUsuarioListDto[] = [];
  loadingUsuarios = false;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 1;
  readonly pageSize = 20;

  showAgregarUsuario = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clinicaService: ClinicaService,
    private clinicaUsuarioService: ClinicaUsuarioService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/habilitacion/clinicas']);
      return;
    }
    this.clinicaId = id;
    this.loadClinica();
    this.loadUsuarios(1);
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
  }

  loadClinica(): void {
    this.loaderService.show();
    this.clinicaService.getClinica(this.clinicaId).subscribe({
      next: (res) => {
        this.clinica = res;
        this.form = {
          nombre: res.nombre,
          ruc: res.ruc ?? '',
          direccion: res.direccion ?? '',
          telefono: res.telefono ?? '',
          email: res.email ?? '',
        };
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  loadUsuarios(page: number): void {
    this.loadingUsuarios = true;
    this.clinicaUsuarioService.getUsuarios(this.clinicaId, page, this.pageSize).subscribe({
      next: (res) => {
        this.usuarios = res.items ?? [];
        this.currentPage = res.page;
        this.totalPages = Math.max(Math.ceil(res.total / this.pageSize), 1);
        this.totalRecords = res.total;
        this.loadingUsuarios = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loadingUsuarios = false;
        this.errorService.handleError(err);
      },
    });
  }

  guardarDatos(): void {
    if (!this.form.nombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'El nombre es requerido' });
      return;
    }
    this.savingDatos = true;
    this.loaderService.show();
    this.clinicaService.actualizarClinica(this.clinicaId, this.form).subscribe({
      next: () => {
        this.savingDatos = false;
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Cambios guardados', timer: 1500, showConfirmButton: false });
        this.loadClinica();
      },
      error: (err: HttpErrorResponse) => {
        this.savingDatos = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  reenviarActivacion(u: ClinicaUsuarioListDto): void {
    this.loaderService.show();
    this.clinicaUsuarioService.reenviarActivacion(this.clinicaId, u.id).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({ icon: 'success', title: 'Activación reenviada', timer: 1500, showConfirmButton: false });
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  toggleActivo(u: ClinicaUsuarioListDto): void {
    const accion = u.activo ? 'desactivar' : 'activar';
    Swal.fire({
      icon: 'question',
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#64bc04',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.clinicaUsuarioService.toggleActivo(this.clinicaId, u.id).subscribe({
        next: () => {
          this.loaderService.hide();
          this.loadUsuarios(this.currentPage);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  eliminarUsuario(u: ClinicaUsuarioListDto): void {
    Swal.fire({
      icon: 'warning',
      title: '¿Eliminar usuario?',
      text: `Se eliminará a ${u.nombre}.`,
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    }).then((res) => {
      if (!res.isConfirmed) return;
      this.loaderService.show();
      this.clinicaUsuarioService.softDelete(this.clinicaId, u.id).subscribe({
        next: () => {
          this.loaderService.hide();
          Swal.fire({ icon: 'success', title: 'Usuario eliminado', timer: 1500, showConfirmButton: false });
          this.loadUsuarios(1);
        },
        error: (err: HttpErrorResponse) => {
          this.loaderService.hide();
          this.errorService.handleError(err);
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/habilitacion/clinicas']);
  }
}
