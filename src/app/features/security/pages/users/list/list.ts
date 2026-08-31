import { ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { SearchInput } from '../../../../../shared/components/search-input/search-input';
import { UserFeatureService } from '../services/user-feature.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { UserListItemDto } from '../../../../../core/dtos/user/userListItem.model';
import { PagedResponseDTO } from '../../../../../core/dtos/api/pagedResponse.model';
import { LoaderService } from '../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../core/services/error.service';
import { UserCategoriaOptionDto } from '../dtos/user-filters.dto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, FormsModule, SearchInput],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class UserList implements OnInit, OnDestroy {
  tableData: PagedResponseDTO<UserListItemDto> = {
    page: 0,
    pageSize: 0,
    totalRecords: 0,
    totalPages: 0,
    data: [],
  };

  searchTerm = '';

  readonly pageSize = 10;

  /**
   * Categoría del trabajador por la que se filtra (null = todas). La dueña del desplegable es
   * la página contenedora, porque el botón "Filtros" vive en el encabezado; acá solo se guarda
   * para que toda recarga (búsqueda, paginación, alta/baja de un usuario) la siga respetando.
   */
  categoriaId: number | null = null;

  /** Stream para debouncing del input — evita fetchs en cada tecla. */
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  @Output() pagedData = new EventEmitter<PagedResponseDTO<UserListItemDto>>();
  @Output() editUser = new EventEmitter<UserListItemDto>();
  @Output() userToggled = new EventEmitter<void>();
  @Output() userDeleted = new EventEmitter<void>();
  /** Opciones del filtro de categoría, tal como llegaron en la carga inicial. */
  @Output() categoriasLoaded = new EventEmitter<UserCategoriaOptionDto[]>();

  constructor(
    private userFeatureService: UserFeatureService,
    private authService: AuthService,
    private loaderService: LoaderService,
    private errorService: ErrorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Debounce 300ms para no disparar request por cada tecla.
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadUsers(1));

    setTimeout(() => this.loadInitial());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.search$.next(value);
  }

  /**
   * Primera carga de la pantalla: trae las opciones del filtro y la primera página de la tabla
   * en una sola petición. De ahí en adelante se usa `loadUsers`, que solo pide la tabla.
   */
  private loadInitial(): void {
    this.loaderService.show();
    this.userFeatureService.getInitialData(1, this.pageSize).subscribe({
      next: (response) => {
        this.applyPage(response.users);
        this.categoriasLoaded.emit(response.categorias);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  /** Aplica el filtro de categoría y vuelve a la primera página. */
  setCategoriaFilter(categoriaId: number | null): void {
    this.categoriaId = categoriaId;
    this.loadUsers(1);
  }

  loadUsers(page: number = 1) {
    this.loaderService.show();
    this.userFeatureService.getUserPaged(page, this.pageSize, this.searchTerm, this.categoriaId).subscribe({
      next: (response) => {
        this.applyPage(response);
        this.loaderService.hide();
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  private applyPage(response: PagedResponseDTO<UserListItemDto>): void {
    this.tableData = response;
    this.pagedData.emit(response);
  }

  resendEmail(user: UserListItemDto, event: MouseEvent) {
    event.stopPropagation();
    this.loaderService.show();
    this.authService.forgotPassword(user.userId).subscribe({
      next: () => {
        this.loaderService.hide();
        Swal.fire({
          title: 'Correo reenviado',
          text: `Se reenvió el correo a ${user.email}`,
          icon: 'success',
          draggable: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.errorService.handleError(err);
      },
    });
  }

  openEdit(user: UserListItemDto, event: MouseEvent) {
    event.stopPropagation();
    this.editUser.emit(user);
  }

  toggleUser(user: UserListItemDto, event: MouseEvent) {
    event.stopPropagation();
    const label = user.displayName ?? user.email;
    const accion = user.active ? 'desactivar' : 'activar';
    Swal.fire({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
      text: `${label} será ${user.active ? 'desactivado' : 'activado'}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.userFeatureService.toggleUser(user.userId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.userToggled.emit();
          Swal.fire({ title: 'Estado actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  deleteUser(user: UserListItemDto, event: MouseEvent) {
    event.stopPropagation();
    const label = user.displayName ?? user.email;
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: `${label} será eliminado permanentemente del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.loaderService.show();
      this.userFeatureService.deleteUser(user.userId).subscribe({
        next: () => {
          this.loaderService.hide();
          this.userDeleted.emit();
          Swal.fire({ title: 'Usuario eliminado', icon: 'success', timer: 1500, showConfirmButton: false });
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => {
          this.errorService.handleError(err);
        },
      });
    });
  }

  /** Distingue "no hay usuarios" de "la búsqueda o el filtro no devolvieron nada". */
  get emptyMessage(): string {
    return this.searchTerm.trim() || this.categoriaId !== null
      ? 'Ningún usuario coincide con la búsqueda o el filtro.'
      : 'Sin usuarios registrados.';
  }

  getRolesText(user: UserListItemDto): string {
    return user.roles.map((r) => r.roleDescription).join(', ') || '—';
  }

  userTypeBadge(type: string): string {
    if (type === 'PERSONA') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (type === 'COLABORADOR') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}
