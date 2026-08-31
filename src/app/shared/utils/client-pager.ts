import { DEFAULT_PAGE_SIZE } from '../constants/pagination';

/**
 * Paginación client-side reutilizable: una sola fuente para el cálculo de
 * página/slice que hoy está copiado a mano en cada lista (currentPage,
 * totalPages, pagedRows). Cambiar el comportamiento acá afecta a todas
 * las páginas que la usen.
 */
export class ClientPager<T> {
  currentPage = 1;

  constructor(readonly pageSize: number = DEFAULT_PAGE_SIZE) {}

  totalPages(items: readonly T[]): number {
    return Math.max(1, Math.ceil(items.length / this.pageSize));
  }

  page(items: readonly T[]): T[] {
    const total = this.totalPages(items);
    const current = Math.min(this.currentPage, total);
    return items.slice((current - 1) * this.pageSize, current * this.pageSize);
  }

  goTo(page: number): void {
    this.currentPage = page;
  }

  reset(): void {
    this.currentPage = 1;
  }
}
