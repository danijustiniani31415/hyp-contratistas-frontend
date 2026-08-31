import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DraggableImage } from './draggable-image';

describe('DraggableImage', () => {
  let component: DraggableImage;
  let fixture: ComponentFixture<DraggableImage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DraggableImage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DraggableImage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
