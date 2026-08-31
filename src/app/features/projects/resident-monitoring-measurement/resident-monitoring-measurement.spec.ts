import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResidentMonitoringMeasurement } from './resident-monitoring-measurement';

describe('ResidentMonitoringMeasurement', () => {
  let component: ResidentMonitoringMeasurement;
  let fixture: ComponentFixture<ResidentMonitoringMeasurement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidentMonitoringMeasurement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResidentMonitoringMeasurement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
