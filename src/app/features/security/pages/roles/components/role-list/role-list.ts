import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RoleFeatureService } from '../../services/role.service';
import { RoleDto } from '../../dtos/role.model';
import { PagedResponseDTO } from '../../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import { SearchInput } from '../../../../../../shared/components/search-input/search-input';


@Component({
  selector: 'app-role-list',
  imports: [CommonModule, SearchInput],
  templateUrl: './role-list.html',
  styleUrl: './role-list.css',
})
export class RoleList implements OnInit, OnDestroy {
  tableData: PagedResponseDTO<RoleDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  searchTerm = '';

  private searchChange = new Subject<string>();
  private searchSub?: Subscription;

  @Output() pagedData = new EventEmitter<PagedResponseDTO<RoleDto>>();
  @Output() editRole = new EventEmitter<RoleDto>();

  constructor(
    private roleService: RoleFeatureService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // La búsqueda filtra en el backend (no solo la página actual): se debounce
    // para no disparar una petición por cada tecla y siempre vuelve a la página 1.
    this.searchSub = this.searchChange
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.loadRoles(1));
    setTimeout(() => this.loadRoles());
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchChange.next(value);
  }

  loadRoles(page: number = 1) {
    this.loaderService.show();
    this.roleService.getRolesPaged(page, this.searchTerm).subscribe({
      next: (response) => {
        this.tableData = response;
        this.pagedData.emit(response);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }
}
