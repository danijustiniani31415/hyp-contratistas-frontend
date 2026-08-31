import { Component, ElementRef, EventEmitter, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CameraPhoto {
  preview: string;
  file: File;
}

@Component({
  selector: 'app-camera-web',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-web.html',
  styleUrl: './camera-web.css'
})
export class CameraWeb implements AfterViewInit {

  @ViewChild('video') private video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') private canvas!: ElementRef<HTMLCanvasElement>;

  @Output() public close = new EventEmitter<void>();
  @Output() public photoTaken = new EventEmitter<CameraPhoto>();

  private stream!: MediaStream;

  async ngAfterViewInit() {
    await this.openCamera();
  }

  private async openCamera() {

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    this.video.nativeElement.srcObject = this.stream;

  }

  public takePhoto() {

    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {

      if (!blob) return;

      const file = new File(
        [blob],
        `incident_${Date.now()}.png`,
        { type: 'image/png' }
      );

      const preview = URL.createObjectURL(blob);

      this.photoTaken.emit({
        preview,
        file
      });

      this.closeCamera();

    }, 'image/png');

  }

  public closeCamera() {

    this.stream?.getTracks().forEach(track => track.stop());

    this.close.emit();

  }

}