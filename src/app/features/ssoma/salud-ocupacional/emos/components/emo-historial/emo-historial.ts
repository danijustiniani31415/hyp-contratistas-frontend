import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EmoService } from '../../../services/emo.service';
import {
  EmoListItemDto,
  WorkerEmoHistorialDto,
} from '../../../dtos/emo.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { aptitudBadgeClass } from '../../../shared/aptitud.utils';
import {
  diasVencerBadgeClass,
  diasVencerStyle,
} from '../../../shared/dias-vencer.utils';

@Component({
  selector: 'app-emo-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './emo-historial.html',
  styleUrl: './emo-historial.css',
})
export class EmoHistorial implements OnInit {
  workerId: number | null = null;
  data: WorkerEmoHistorialDto | null = null;
  loading = false;
  errorMsg: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private service: EmoService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private location: Location,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('workerId');
    this.workerId = raw ? Number(raw) : null;
    if (this.workerId) this.load();
    else this.errorMsg = 'Trabajador no especificado';
  }

  load(): void {
    if (!this.workerId) return;
    this.loading = true;
    this.errorMsg = null;
    this.loaderService.show();
    this.service.getHistorialWorker(this.workerId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorMsg = 'No se pudo cargar el historial';
        this.errorService.handleError(err);
      },
    });
  }

  back(): void {
    this.location.back();
  }

  aptitudClass(aptitud: string): string {
    return aptitudBadgeClass(aptitud);
  }

  diasClass(dias: number): string {
    return diasVencerBadgeClass(dias);
  }

  diasLabel(dias: number): string {
    return diasVencerStyle(dias).label;
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'Vigente':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Por Vencer':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Vencido':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Anulado':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  }

  trackEmoById(_: number, emo: EmoListItemDto): number {
    return emo.id;
  }

  totalEmos(): number {
    if (!this.data?.vinculaciones?.length) return 0;
    return this.data.vinculaciones.reduce((acc, v) => acc + (v.emos?.length ?? 0), 0);
  }
}
