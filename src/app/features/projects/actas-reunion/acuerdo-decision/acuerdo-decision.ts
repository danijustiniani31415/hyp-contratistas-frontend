import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';
import { LoaderService } from '../../../../core/services/loader.service';
import { ErrorService } from '../../../../core/services/error.service';
import { ActasReunionService } from '../services/actas-reunion.service';
import { AcuerdoResponsableInfoDTO } from '../dtos/actas-reunion.dto';

/**
 * Página de acceso directo (desde el link del correo del acta) para que un responsable acepte o
 * rechace un acuerdo puntual. Sin menús ni pestañas, igual que reunion-agenda.
 */
@Component({
  selector: 'app-acuerdo-decision',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acuerdo-decision.html',
})
export class AcuerdoDecision implements OnInit {
  reunionAcuerdoResponsableId!: number;
  info: AcuerdoResponsableInfoDTO | null = null;
  mostrarMotivoRechazo = false;
  motivoRechazo = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ActasReunionService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.reunionAcuerdoResponsableId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  private cargar(): void {
    this.loaderService.show();
    this.service.getAcuerdoResponsableInfo(this.reunionAcuerdoResponsableId).subscribe({
      next: (data) => {
        this.info = data;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  aceptar(): void {
    Swal.fire({
      icon: 'question',
      title: '¿Aceptar este acuerdo?',
      text: 'Confirmas que te comprometes a cumplirlo.',
      showCancelButton: true,
      confirmButtonText: 'Sí, aceptar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--color-abril-primary)',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.enviarDecision(true, null);
    });
  }

  abrirRechazo(): void {
    this.mostrarMotivoRechazo = true;
  }

  confirmarRechazo(): void {
    if (!this.motivoRechazo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el motivo',
        text: 'Indica por qué rechazas este acuerdo.',
        confirmButtonColor: 'var(--color-abril-primary)',
      });
      return;
    }
    this.enviarDecision(false, this.motivoRechazo.trim());
  }

  private enviarDecision(aceptado: boolean, motivoRechazo: string | null): void {
    this.loaderService.show();
    this.service.responderAcuerdo(this.reunionAcuerdoResponsableId, { aceptado, motivoRechazo }).subscribe({
      next: () => {
        this.loaderService.hide();
        this.cargar();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  irAReunion(): void {
    if (!this.info) return;
    this.router.navigate(['/projects/actas-reunion', this.info.reunionId]);
  }
}
