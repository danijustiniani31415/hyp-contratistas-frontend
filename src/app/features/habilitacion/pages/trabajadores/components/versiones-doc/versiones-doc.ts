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
import { Observable } from 'rxjs';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { ErrorService } from '../../../../../../core/services/error.service';
import { DocumentoVersionDto } from '../../../../dtos/trabajador.model';

@Component({
  selector: 'app-hab-versiones-doc',
  standalone: true,
  imports: [CommonModule, BaseModal, DocumentViewer],
  templateUrl: './versiones-doc.html',
  styleUrl: './versiones-doc.css',
})
export class VersionesDoc implements OnChanges {
  @Input() open = false;
  @Input() entregableId: number | undefined;
  @Input() loader!: (id: number) => Observable<DocumentoVersionDto[]>;
  @Output() closed = new EventEmitter<void>();

  versiones: DocumentoVersionDto[] = [];
  loading = false;
  visorUrl = '';
  visorNombre = '';

  constructor(
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open && this.entregableId) {
      this.loadVersiones(this.entregableId);
    }
  }

  private loadVersiones(id: number): void {
    this.loading = true;
    this.versiones = [];
    this.loader(id).subscribe({
      next: (res) => {
        this.versiones = res ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorService.handleError(err);
      },
    });
  }

  abrirVisor(archivoUrl: string): void {
    this.visorNombre = archivoUrl.split('/').pop()?.replace(/^\d{8}_/, '') ?? 'documento';
    this.visorUrl = archivoUrl;
    this.cdr.detectChanges();
  }

  close(): void {
    this.closed.emit();
  }
}
