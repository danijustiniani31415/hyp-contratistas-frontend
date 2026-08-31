import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportResponseControlCreate } from './report-response-control-create';

describe('ReportResponseControlCreate', () => {
  let component: ReportResponseControlCreate;
  let fixture: ComponentFixture<ReportResponseControlCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportResponseControlCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportResponseControlCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
