import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleteRegistration } from './complete-registration';

describe('CompleteRegistration', () => {
  let component: CompleteRegistration;
  let fixture: ComponentFixture<CompleteRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompleteRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompleteRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
