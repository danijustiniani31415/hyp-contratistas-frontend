import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MiSaludService } from '../../mi-salud.service';
import { MiDescansoCorreoConfigDto } from '../../mi-salud.dtos';
import { ErrorService } from '../../../../../../core/services/error.service';
import { LoaderService } from '../../../../../../core/services/loader.service';

/**
 * Sección "Correos de descanso médico" de la Configuración de Mi Salud.
 * Permite activar/inactivar a qué destinatarios se les envía el correo cuando
 * un trabajador registra un descanso médico. Útil para pruebas en dev y prod.
 */
@Component({
  selector: 'app-mi-salud-correos-notificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './correos-notificacion.component.html',
  styleUrl: './correos-notificacion.component.css',
})
export class CorreosNotificacionComponent implements OnInit {
  correos: MiDescansoCorreoConfigDto[] = [];
  loading = false;
  /** id del destinatario que se está guardando (para bloquear su switch). */
  savingId: number | null = null;

  constructor(
    private svc: MiSaludService,
    private errorService: ErrorService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.svc.getCorreoConfigs().subscribe({
      next: (rows) => {
        this.correos = rows;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }

  toggle(c: MiDescansoCorreoConfigDto): void {
    if (this.savingId !== null) return;
    const nuevo = !c.active;
    this.savingId = c.id;
    this.svc.setCorreoConfigActive(c.id, nuevo).subscribe({
      next: () => {
        c.active = nuevo;
        this.savingId = null;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.savingId = null;
        this.errorService.handleError(err);
        this.cdr.detectChanges();
      },
    });
  }
}
