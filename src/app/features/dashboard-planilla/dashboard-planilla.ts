import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LbPageHeader } from '../../shared/components/lb-page-header/lb-page-header';
import { PersonasService, DashboardPlanilla } from '../../core/services/personas.service';

/** [REVISADO] Estado en signals — mismo motivo que personas.ts (Zone.js no parcha fetch()). */
@Component({
  selector: 'app-dashboard-planilla',
  standalone: true,
  imports: [CommonModule, RouterLink, LbPageHeader],
  templateUrl: './dashboard-planilla.html',
  styleUrl: './dashboard-planilla.css',
})
export class DashboardPlanillaComponent implements OnInit {
  data = signal<DashboardPlanilla | null>(null);
  loading = signal(false);

  constructor(private service: PersonasService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getDashboardPlanilla().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
