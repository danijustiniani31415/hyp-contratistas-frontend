import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseModal } from '../../../../../../shared/components/base-modal/base-modal';
import { TitleCasePipe } from '../../../../../../shared/pipes/title-case.pipe';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { AreaScopeService } from '../../../../shared/services/area-scope.service';
import { AreaScopeWorkerDto } from '../../../../shared/dtos/areaScope.model';

@Component({
  selector: 'app-area-scope-workers',
  standalone: true,
  imports: [CommonModule, BaseModal, TitleCasePipe],
  templateUrl: './area-scope-workers.html',
})
export class AreaScopeWorkers implements OnInit {
  @Input({ required: true }) areaScopeId!: number;
  @Input() areaNombre = '';
  @Input() rutaRama = '';
  @Output() closeModal = new EventEmitter<void>();

  workers: AreaScopeWorkerDto[] = [];
  loaded = false;

  constructor(
    private service: AreaScopeService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    this.loaderService.show();
    this.service.getWorkers(this.areaScopeId).subscribe({
      next: (workers) => {
        this.workers = workers;
        this.loaded = true;
        this.loaderService.hide();
      },
      error: (err: HttpErrorResponse) => {
        this.loaderService.hide();
        this.errorService.handleError(err);
      },
    });
  }
}
