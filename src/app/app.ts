import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoaderService } from './core/services/loader.service';
import { VersionCheckService } from './core/services/version-check.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  loader$;
  protected readonly title = signal('Abril');

  nuevaVersionDisponible = false;
  private versionSub?: Subscription;

  constructor(
    private loaderService: LoaderService,
    private versionCheck: VersionCheckService,
  ) {
    this.loader$ = this.loaderService.loader$;
  }

  ngOnInit(): void {
    this.versionCheck.start(5 * 60 * 1000); // cada 5 minutos
    this.versionSub = this.versionCheck.newVersionAvailable$.subscribe((disponible) => {
      this.nuevaVersionDisponible = disponible;
    });
  }

  ngOnDestroy(): void {
    this.versionSub?.unsubscribe();
  }

  actualizar(): void {
    this.versionCheck.reload();
  }
}
