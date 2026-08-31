import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResidentCard } from './resident-card';

describe('ResidentCard', () => {
  let component: ResidentCard;
  let fixture: ComponentFixture<ResidentCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidentCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResidentCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
