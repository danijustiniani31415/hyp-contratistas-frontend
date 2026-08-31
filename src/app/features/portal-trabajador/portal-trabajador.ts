import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PortalTrabajadorDto {
  workerId: number;
  apellidoNombre: string;
  dni: string;
  empresa: string;
  estadoHabilitacion: string;
  documentosFaltantes: string[] | null;
  documentosPorVencer: { nombre: string; vigencia: string }[] | null;
  entregables: { nombre: string; estado: string; vigencia: string | null }[] | null;
}

@Component({
  selector: 'app-portal-trabajador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-trabajador.html',
  styleUrls: ['./portal-trabajador.css'],
})
export class PortalTrabajador {
  dni = '';
  loading = false;
  resultado: PortalTrabajadorDto | null = null;
  error = '';

  constructor(private http: HttpClient) {}

  buscar(): void {
    if (!this.dni.trim()) return;
    this.loading = true;
    this.error = '';
    this.resultado = null;
    this.http
      .get<PortalTrabajadorDto>(
        `${environment.apiUrl}api/v1/habilitacion/control-acceso/consulta`,
        { params: { search: this.dni.trim() } },
      )
      .subscribe({
        next: (res: any) => {
          this.resultado = Array.isArray(res) ? (res[0] ?? null) : res;
          if (!this.resultado) this.error = 'No se encontró ningún trabajador con ese DNI.';
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = 'Error al consultar. Intente nuevamente.';
        },
      });
  }

  get estadoColor(): string {
    return this.resultado?.estadoHabilitacion === 'Habilitado' ? '#16a34a' : '#dc2626';
  }

  get estadoBg(): string {
    return this.resultado?.estadoHabilitacion === 'Habilitado' ? '#f0fdf4' : '#fee2e2';
  }
}
