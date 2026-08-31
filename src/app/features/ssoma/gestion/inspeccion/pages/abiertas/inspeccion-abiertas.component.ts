import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InspeccionService } from '../../inspeccion.service';
import { InspeccionAbiertaListItemDto } from '../../inspeccion.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { INSPECCION_TABS } from '../../inspeccion-tabs';

@Component({
  selector: 'app-inspeccion-abiertas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AbrilPageHeaderComponent],
  templateUrl: './inspeccion-abiertas.component.html',
  styleUrl: './inspeccion-abiertas.component.css',
})
export class InspeccionAbiertasComponent implements OnInit {
  readonly tabs = INSPECCION_TABS;
  items: InspeccionAbiertaListItemDto[] = [];
  loading = true;
  uniendoId: number | null = null;

  constructor(
    private inspeccionService: InspeccionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.inspeccionService.getAbiertas().subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  unirmeYAgregar(item: InspeccionAbiertaListItemDto): void {
    if (this.uniendoId) return;
    this.uniendoId = item.id;
    this.cdr.markForCheck();
    this.inspeccionService.unirse(item.id).subscribe({
      next: () => {
        this.uniendoId = null;
        this.router.navigate(['/ssoma/gestion/inspeccion', item.id, 'agregar-hallazgo']);
      },
      error: (err: HttpErrorResponse) => {
        this.uniendoId = null;
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  verDetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/inspeccion', id]);
  }
}
