import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../../../environments/environment';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';

interface IndicadorReactivoDto {
  proyectoId: number;
  proyectoNombre: string;
  mes: number;
  anio: number;
  horasHombreTrabajadas: number;
  totalAccidentes: number;
  totalDiasPerdidos: number;
  indiceFrecuencia: number;
  indiceGravedad: number;
  indiceAccidentabilidad: number;
}

@Component({
  selector: 'app-reactivos',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelect],
  templateUrl: './reactivos.component.html',
  styleUrls: ['./reactivos.component.css'],
})
export class ReactivosComponent implements OnInit {
  private http = inject(HttpClient);
  private loader = inject(LoaderService);
  private errorSvc = inject(ErrorService);

  private base = `${environment.apiUrl}api/v1/ssoma-indicadores-proactivos`;

  mes = signal<number>(new Date().getMonth() + 1);
  anio = signal<number>(new Date().getFullYear());
  datos = signal<IndicadorReactivoDto[]>([]);
  loading = signal(false);

  readonly meses = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
  ];
  readonly anios = [2024, 2025, 2026, 2027].map(a => ({ valor: a, nombre: String(a) }));

  private authHeaders(): HttpHeaders {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
    return new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` });
  }

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading.set(true);
    this.loader.show();
    const params = new HttpParams().set('mes', this.mes()).set('anio', this.anio());
    this.http.get<IndicadorReactivoDto[]>(`${this.base}/reactivos`, {
      headers: this.authHeaders(), params,
    }).subscribe({
      next: (data) => {
        this.datos.set(data);
        this.loading.set(false);
        this.loader.hide();
      },
      error: (err) => {
        this.loading.set(false);
        this.loader.hide();
        this.errorSvc.handleError(err);
      },
    });
  }

  ifColor(v: number): string {
    if (v === 0) return '#16a34a';
    if (v < 2) return '#d97706';
    return '#dc2626';
  }

  igColor(v: number): string {
    if (v === 0) return '#16a34a';
    if (v < 100) return '#d97706';
    return '#dc2626';
  }

  iaColor(v: number): string {
    if (v === 0) return '#16a34a';
    if (v < 0.2) return '#d97706';
    return '#dc2626';
  }

  get totalAccidentes(): number {
    return this.datos().reduce((s, d) => s + d.totalAccidentes, 0);
  }
  get totalDias(): number {
    return this.datos().reduce((s, d) => s + d.totalDiasPerdidos, 0);
  }
  get totalHHT(): number {
    return this.datos().reduce((s, d) => s + d.horasHombreTrabajadas, 0);
  }
}
