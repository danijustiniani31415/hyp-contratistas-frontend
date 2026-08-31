import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoaderService } from '../../../../core/services/loader.service';
import { RegistrosModeloService } from '../../services/registros-modelo.service';
import { RegistroModeloDto } from '../../dtos/registros-modelo.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hab-registros-modelo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registros-modelo.html',
  styleUrl: './registros-modelo.css',
})
export class RegistrosModelo implements OnInit {
  registros: RegistroModeloDto[] = [];
  loading = false;
  search = '';
  publicMode = false;

  constructor(
    private service: RegistrosModeloService,
    private route: ActivatedRoute,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {
    this.publicMode = !!this.route.snapshot.data?.['publicMode'];
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.service.getAll().subscribe({
      next: (res) => {
        this.registros = (res ?? [])
          .filter((r) => r.activo !== false)
          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: () => {
        this.registros = [];
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
    });
  }

  get registrosFiltrados(): RegistroModeloDto[] {
    const term = this.search.trim().toLowerCase();
    if (!term) return this.registros;
    return this.registros.filter((r) => r.nombre.toLowerCase().includes(term));
  }

  onSearch(): void {
    /* búsqueda en cliente: el getter filtra automáticamente */
  }

  descargar(r: RegistroModeloDto): void {
    if (typeof window === 'undefined' || !r.archivoUrl) return;
    const url = `${environment.apiUrl}api/v1/habilitacion/archivos/descargar?url=${encodeURIComponent(r.archivoUrl)}`;
    window.open(url, '_blank', 'noopener');
  }
}
