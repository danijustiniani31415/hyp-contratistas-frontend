import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  imports: [],
  templateUrl: './nav-icon.html',
})
export class NavIcon {
  @Input() key: string = '';
  @Input() size: number = 28;
}
