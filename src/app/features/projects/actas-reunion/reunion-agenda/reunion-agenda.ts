import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { MisTemasAgenda } from '../components/mis-temas-agenda/mis-temas-agenda';
import { TemasPuntualesAgenda } from '../components/temas-puntuales-agenda/temas-puntuales-agenda';
import { ReunionAgendaDTO } from '../dtos/actas-reunion.dto';

/**
 * Página de acceso directo (desde el link del recordatorio) para cargar los temas a
 * tratar de una reunión. Sin menús ni pestañas: solo lo necesario para que el
 * convocado entre, escriba sus temas y guarde, lo más rápido posible.
 */
@Component({
  selector: 'app-reunion-agenda',
  standalone: true,
  imports: [CommonModule, MisTemasAgenda, TemasPuntualesAgenda],
  templateUrl: './reunion-agenda.html',
})
export class ReunionAgenda implements OnInit {
  reunionId!: number;
  agenda: ReunionAgendaDTO | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.reunionId = Number(this.route.snapshot.paramMap.get('reunionId'));
    this.loaderService.show();
    this.cargarAgenda(() => this.loaderService.hide());
  }

  cargarAgenda(onDone?: () => void): void {
    this.service.getAgenda(this.reunionId).subscribe({
      next: (data) => {
        this.agenda = data;
        onDone?.();
      },
      error: (err: HttpErrorResponse) => {
        onDone?.();
        this.errorService.handleError(err);
      },
    });
  }

  irAReunion(): void {
    this.router.navigate(['/projects/actas-reunion', this.reunionId]);
  }
}
