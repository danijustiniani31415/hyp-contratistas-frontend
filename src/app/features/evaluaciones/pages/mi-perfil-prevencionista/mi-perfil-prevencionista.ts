import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AbrilPageHeaderComponent } from '../../../../shared/components/abril-page-header/abril-page-header.component';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { EvPrevencionistaService } from '../../services/ev-prevencionista.service';
import { EvPrevencionistaMiPerfilDto } from '../../dtos/ev-prevencionista.model';

@Component({
  selector: 'app-mi-perfil-prevencionista',
  standalone: true,
  imports: [CommonModule, RouterModule, AbrilPageHeaderComponent],
  templateUrl: './mi-perfil-prevencionista.html',
  styleUrl: './mi-perfil-prevencionista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfilPrevencionista implements OnInit {
  perfil: EvPrevencionistaMiPerfilDto | null = null;
  loading = true;

  notaClase(nota: number | null): string {
    if (nota === null) return 'nota-sin';
    if (nota > 15) return 'nota-aprobado';
    if (nota >= 12) return 'nota-regular';
    return 'nota-desaprobado';
  }

  notaDisplay(nota: number | null): string {
    return nota !== null ? nota.toFixed(1) : '—';
  }

  constructor(
    private svc: EvPrevencionistaService,
    private loader: LoaderService,
    private errorSvc: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getMiPerfil().subscribe({
      next: (d) => {
        this.perfil = d;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loader.hide();
        this.errorSvc.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }
}
