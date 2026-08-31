import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EmpresaContratistaService } from '../../services/empresa-contratista.service';
import { EmpresaSimpleDto } from '../../dtos/empresa.model';
import { ErrorService } from '../../../../core/services/error.service';
import { ContratistaUsuarios } from '../dashboard-contratista/components/contratista-usuarios/contratista-usuarios';

@Component({
  selector: 'app-admin-contratista-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ContratistaUsuarios],
  templateUrl: './admin-contratista-usuarios.html',
  styleUrl: './admin-contratista-usuarios.css',
})
export class AdminContratistaUsuarios implements OnInit {
  empresas: EmpresaSimpleDto[] = [];
  empresaSeleccionada: number | null = null;
  loadingEmpresas = true;

  constructor(
    private empresaService: EmpresaContratistaService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.empresaService.getEmpresasLogin().subscribe({
      next: (res) => {
        this.empresas = res ?? [];
        this.loadingEmpresas = false;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loadingEmpresas = false;
        this.errorService.handleError(err);
      },
    });
  }

  onEmpresaChange(id: string): void {
    this.empresaSeleccionada = id ? Number(id) : null;
  }
}
