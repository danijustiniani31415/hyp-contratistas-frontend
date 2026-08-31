import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-rac-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './rac-nav.component.html',
  styleUrl: './rac-nav.component.css',
})
export class RacNavComponent {}
