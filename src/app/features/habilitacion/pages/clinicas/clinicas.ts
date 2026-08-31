import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ClinicaService } from '../../services/clinica.service';
import { ClinicaListDto, ClinicaUpsertDto } from '../../dtos/clinica.model';
import { BaseModal } from '../../../../shared/components/base-modal/base-modal';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-clinicas',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseModal, AbrilPageHeaderComponent],
  templateUrl: './clinicas.html',
  styleUrl: './clinicas.css',
})
export class Clinicas implements OnInit, OnDestroy {
  clinicas: ClinicaListDto[] = [];
  loading = false;

  search = '';
  private searchChange$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  showCreate = false;
  saving = false;
  createDto: ClinicaUpsertDto = this.emptyDto();

  constructor(
    private clinicaService: ClinicaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.searchChange$
      .pipe(debounceTime(350), takeUntil(this.destroy$))
      .subscribe(() => this.loadClinicas());
    this.loadClinicas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadClinicas(): void {
    this.loading = true;
    this.loaderService.show();
    this.clinicaService.getClinicas().subscribe({
      next: (res) => {
        this.clinicas = res ?? [];
        this.loading = false;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  onSearchChange(): void {
    this.searchChange$.next();
  }

  goToDetalle(id: number): void {
    this.router.navigate(['/habilitacion/clinicas', id]);
  }

  openCreate(): void {
    this.createDto = this.emptyDto();
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
  }

  guardarClinica(): void {
    if (!this.createDto.nombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'El nombre es requerido' });
      return;
    }
    this.saving = true;
    this.loaderService.show();
    this.clinicaService.crearClinica(this.createDto).subscribe({
      next: () => {
        this.saving = false;
        this.loaderService.hide();
        this.showCreate = false;
        Swal.fire({ icon: 'success', title: 'Clínica creada', timer: 1500, showConfirmButton: false });
        this.loadClinicas();
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  private emptyDto(): ClinicaUpsertDto {
    return { nombre: '', ruc: '', direccion: '', telefono: '', email: '' };
  }
}
