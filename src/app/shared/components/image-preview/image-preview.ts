import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.css',
})
export class ImagePreview {

  @Input() previews: string[] = [];

  @Output() remove = new EventEmitter<number>();

  removeImage(index: number) {
    this.remove.emit(index);
  }

}