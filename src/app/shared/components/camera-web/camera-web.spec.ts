import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CameraWeb } from './camera-web';

describe('CameraWeb', () => {
  let component: CameraWeb;
  let fixture: ComponentFixture<CameraWeb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CameraWeb]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CameraWeb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
