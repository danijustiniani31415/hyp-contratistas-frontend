import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MilestoneSchedule } from './milestone-schedule';

describe('MilestoneSchedule', () => {
  let component: MilestoneSchedule;
  let fixture: ComponentFixture<MilestoneSchedule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestoneSchedule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MilestoneSchedule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
