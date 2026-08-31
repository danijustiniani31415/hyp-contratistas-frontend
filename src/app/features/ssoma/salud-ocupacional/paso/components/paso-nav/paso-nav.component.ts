import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-paso-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './paso-nav.component.html',
  styleUrl: './paso-nav.component.css',
})
export class PasoNavComponent {}
