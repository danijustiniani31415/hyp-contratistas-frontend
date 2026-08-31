import { Component, ChangeDetectorRef, PLATFORM_ID, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { SidebarMobile } from "../sidebar-mobile/sidebar-mobile";
import { MicrosoftAuthService } from '../../../features/auth/pages/login/services/microsoft-auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule, CommonModule, SidebarMobile],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  titulo: string = '';
  menuOpen = false;
  showUserMenu = false;
  userPhotoSrc: string | null = null;
  userName: string | null = null;
  userEmail: string | null = null;
  userJobTitle: string | null = null;

  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private microsoftAuthService: MicrosoftAuthService,
  ) {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      let current = this.route;
      while (current.firstChild) {
        current = current.firstChild;
      }
      this.titulo = current.snapshot.data['titulo'] ?? '';
      this.loadUserFromStorage();
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    // Cubre hard refresh: leer título y datos del usuario sin esperar NavigationEnd
    let current = this.route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    this.titulo = current.snapshot.data['titulo'] ?? '';
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.userPhotoSrc = user?.photoBase64 ?? null;
      this.userName     = user?.displayName ?? null;
      this.userEmail    = user?.email       ?? null;
      this.userJobTitle = user?.jobTitle    ?? null;
    }
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  @HostListener('document:click')
  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  async logout(): Promise<void> {
    await this.microsoftAuthService.logout();
    this.router.navigate(['/auth/login']);
  }
}