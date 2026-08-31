import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { WorkerSearchService } from '../../services/worker-search.service';
import { WorkerSearchItemDto } from '../../dtos/worker-search.model';

@Component({
  selector: 'app-worker-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './worker-search-input.html',
  styleUrl: './worker-search-input.css',
})
export class WorkerSearchInput implements OnInit, OnDestroy {
  @Input() placeholder = 'Buscar por nombre o DNI (mín. 2 caracteres)';
  @Input() selected: WorkerSearchItemDto | null = null;
  @Input() limit = 20;
  @Input() color = 'var(--color-abril-standard)';

  @HostBinding('style.--ws-accent') get wsAccent(): string {
    return this.color;
  }

  @Output() selectedChange = new EventEmitter<WorkerSearchItemDto | null>();

  query = '';
  results: WorkerSearchItemDto[] = [];
  searching = false;

  private query$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private service: WorkerSearchService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (this.selected) this.query = this.selected.apellidoNombre;
    this.query$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runSearch(q));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQueryChange(value: string): void {
    this.query = value;
    if (!value || value.trim().length < 2) {
      this.results = [];
      this.searching = false;
      return;
    }
    this.searching = true;
    this.query$.next(value.trim());
  }

  private runSearch(q: string): void {
    this.service.search(q, this.limit).subscribe({
      next: (res) => {
        this.results = res;
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.results = [];
        this.searching = false;
        this.cdr.detectChanges();
      },
    });
  }

  select(w: WorkerSearchItemDto): void {
    this.selected = w;
    this.query = w.apellidoNombre;
    this.results = [];
    this.selectedChange.emit(w);
  }

  clear(): void {
    this.selected = null;
    this.query = '';
    this.results = [];
    this.selectedChange.emit(null);
  }
}
