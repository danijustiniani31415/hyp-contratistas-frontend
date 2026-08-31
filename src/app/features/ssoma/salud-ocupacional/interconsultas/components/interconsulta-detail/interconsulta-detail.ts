import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbrilModalPanel } from '../../../../../../shared/components/abril-modal-panel/abril-modal-panel';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { InterconsultaService } from '../../../services/interconsulta.service';
import { InterconsultaDetalleDto } from '../../../dtos/interconsulta.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { estadoBadgeClass, estadoInterconsultaStyle } from '../../../shared/estado.utils';

@Component({
  selector: 'app-interconsulta-detail',
  standalone: true,
  imports: [CommonModule, AbrilModalPanel, DocumentViewer],
  templateUrl: './interconsulta-detail.html',
  styleUrl: './interconsulta-detail.css',
})
export class InterconsultaDetail implements OnChanges {
  @Input() interconsultaId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  data: InterconsultaDetalleDto | null = null;
  loading = false;
  visorUrl = '';
  visorNombre = '';

  constructor(
    private service: InterconsultaService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['interconsultaId'] && this.interconsultaId) {
      this.load();
    }
  }

  private load(): void {
    if (!this.interconsultaId) return;
    this.loading = true;
    this.loaderService.show();
    this.service.getInterconsulta(this.interconsultaId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }

  estadoClass(estado: string): string {
    return estadoBadgeClass(estadoInterconsultaStyle(estado));
  }

  verDocumento(url: string | undefined | null, nombre: string): void {
    if (!url) return;
    this.visorUrl = url;
    this.visorNombre = nombre;
  }

  onVisorClosed(): void {
    this.visorUrl = '';
    this.visorNombre = '';
  }

  close(): void {
    this.closed.emit();
  }
}
