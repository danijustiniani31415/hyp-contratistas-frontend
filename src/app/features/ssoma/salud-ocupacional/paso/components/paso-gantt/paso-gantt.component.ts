import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasoService } from '../../services/paso.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import 'dhtmlx-gantt';
declare const gantt: any;

@Component({
  selector: 'app-paso-gantt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paso-gantt.component.html',
  styleUrl: './paso-gantt.component.css',
})
export class PasoGanttComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() pasoId!: number;
  @ViewChild('ganttContainer') ganttContainer!: ElementRef<HTMLDivElement>;

  loading = false;
  error: string | null = null;
  private initialized = false;

  constructor(
    private pasoService: PasoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initGantt();
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.initialized) {
      try { gantt.destructor(); } catch { /* ignore */ }
    }
  }

  private initGantt(): void {
    if (typeof gantt === 'undefined') return;

    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.readonly = true;
    gantt.config.show_progress = true;
    gantt.config.scale_unit = 'month';
    gantt.config.date_scale = '%M %Y';
    gantt.config.columns = [
      { name: 'text', label: 'Actividad', tree: true, width: 220 },
      { name: 'start_date', label: 'Inicio', align: 'center', width: 90 },
      { name: 'end_date', label: 'Fin', align: 'center', width: 90 },
    ];

    gantt.init(this.ganttContainer.nativeElement);
    this.initialized = true;
  }

  private loadData(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.pasoService.getGantt(this.pasoId).subscribe({
      next: (data) => {
        this.loading = false;
        if (this.initialized && typeof gantt !== 'undefined') {
          gantt.clearAll();
          gantt.parse({ data: data as any, links: [] });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el Gantt';
        this.cdr.detectChanges();
      },
    });
  }
}
