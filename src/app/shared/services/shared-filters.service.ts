import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SelectOption {
  id: number;
  nombre: string;
}

export type FilterKey = 'proyecto' | 'razonSocial' | 'mes' | 'anio' | 'semana' | 'estado';

@Injectable({ providedIn: 'root' })
export class SharedFiltersService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}api/v1/shared-filters`;

  readonly proyectos$ = this.http
    .get<SelectOption[]>(`${this.api}/proyectos`)
    .pipe(shareReplay(1));

  readonly meses$ = this.http
    .get<SelectOption[]>(`${this.api}/meses`)
    .pipe(shareReplay(1));

  readonly anios$ = this.http
    .get<SelectOption[]>(`${this.api}/anios`)
    .pipe(shareReplay(1));

  readonly razonesSociales$ = this.http
    .get<SelectOption[]>(`${this.api}/razones-sociales`)
    .pipe(shareReplay(1));

  readonly estados$ = this.http
    .get<SelectOption[]>(`${this.api}/estados`)
    .pipe(shareReplay(1));

  readonly semanas$ = of(
    Array.from({ length: 53 }, (_, i) => ({ id: i + 1, nombre: `Semana ${i + 1}` })),
  );

  // Métodos para compatibilidad con código existente
  getProyectos() { return this.proyectos$; }
  getMeses()     { return this.meses$; }
  getAnios()     { return this.anios$; }
  getRazonesSociales() { return this.razonesSociales$; }
  getEstados()   { return this.estados$; }

  getOptions(filter: FilterKey): Observable<SelectOption[]> {
    const map: Record<FilterKey, Observable<SelectOption[]>> = {
      proyecto:    this.proyectos$,
      razonSocial: this.razonesSociales$,
      mes:         this.meses$,
      anio:        this.anios$,
      semana:      this.semanas$,
      estado:      this.estados$,
    };
    return map[filter];
  }
}
