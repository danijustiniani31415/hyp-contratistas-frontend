import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportResponseControl } from './report-response-control';

describe('ReportResponseControl', () => {
  let component: ReportResponseControl;
  let fixture: ComponentFixture<ReportResponseControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportResponseControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportResponseControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
