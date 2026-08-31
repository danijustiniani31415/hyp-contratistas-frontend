import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-draggable-image',
  imports: [CommonModule],
  templateUrl: './draggable-image.html',
  styleUrl: './draggable-image.css',
})
export class DraggableImage {
  @Input() src: string = '';
  @Input() apiUrl: string = '';

  zoom = 1;
  pos = { x: 0, y: 0 };
  dragging = false;
  lastX = 0;
  lastY = 0;
  expanded = false;

  get imageUrl(): string {
    return this.src.startsWith('http') ? this.src : this.apiUrl + this.src;
  }

  get transform(): string {
    return `scale(${this.zoom}) translate(${this.pos.x}px, ${this.pos.y}px)`;
  }

  onWheelZoom(event: WheelEvent) {
    event.preventDefault();
    const baseStep = 0.05;
    const dynamicStep = baseStep * this.zoom;
    const delta = event.deltaY < 0 ? dynamicStep : -dynamicStep;
    this.zoom = Math.max(0.1, this.zoom + delta);
  }

  onMouseDown(event: MouseEvent) {
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    const speedFactor = 1 / this.zoom;
    this.pos.x += dx * speedFactor;
    this.pos.y += dy * speedFactor;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onMouseUp() {
    this.dragging = false;
  }

  private touchStartDist = 0;
  private touchStartZoom = 1;

  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      this.dragging = true;
      this.lastX = event.touches[0].clientX;
      this.lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      this.dragging = false;
      this.touchStartDist = this.getTouchDist(event.touches);
      this.touchStartZoom = this.zoom;
    }
  }

  onTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length === 1 && this.dragging) {
      const dx = event.touches[0].clientX - this.lastX;
      const dy = event.touches[0].clientY - this.lastY;
      const speedFactor = 1 / this.zoom;
      this.pos.x += dx * speedFactor;
      this.pos.y += dy * speedFactor;
      this.lastX = event.touches[0].clientX;
      this.lastY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      const dist = this.getTouchDist(event.touches);
      this.zoom = Math.max(0.1, this.touchStartZoom * (dist / this.touchStartDist));
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (event.touches.length === 0) this.dragging = false;
  }

  private getTouchDist(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  toggleExpand() {
    this.expanded = !this.expanded;
    // al colapsar, resetea zoom y posicion
    if (!this.expanded) {
      this.zoom = 1;
      this.pos = { x: 0, y: 0 };
    }
  }
}
