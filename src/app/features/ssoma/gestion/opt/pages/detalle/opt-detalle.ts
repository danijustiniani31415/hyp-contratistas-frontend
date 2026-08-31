import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { OptService } from '../../services/opt.service';
import { OptDetalleDto } from '../../dtos/opt.dtos';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { DocumentViewer } from '../../../../../../shared/components/document-viewer/document-viewer';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';

@Component({
  selector: 'app-opt-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DocumentViewer, AbrilPageHeaderComponent],
  templateUrl: './opt-detalle.html',
  styleUrl: './opt-detalle.css',
})
export class OptDetalle implements OnInit {
  data: OptDetalleDto | null = null;
  loading = true;
  id = 0;

  constructor(
    private optService: OptService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loaderService.show();
    this.optService.getDetalle(this.id).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.loaderService.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loaderService.hide();
        this.errorService.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/opt/lista']);
  }

  scoreClass(score?: number): string {
    if (score === undefined || score === null) return 'score-na';
    if (score >= 80) return 'score-verde';
    if (score >= 60) return 'score-amarillo';
    return 'score-rojo';
  }

  scoreDashOffset(score?: number): number {
    const circumference = 2 * Math.PI * 44;
    const pct = score !== undefined ? Math.min(100, Math.max(0, score)) : 0;
    return circumference * (1 - pct / 100);
  }

  readonly circumference = 2 * Math.PI * 44;

  resultadoClass(r?: string): string {
    if (r === 'Seguro')   return 'res-seguro';
    if (r === 'Inseguro') return 'res-inseguro';
    if (r === 'NA')       return 'res-na';
    return 'res-sin';
  }
}
