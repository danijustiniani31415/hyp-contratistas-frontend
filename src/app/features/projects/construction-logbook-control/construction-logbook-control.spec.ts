import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConstructionLogbookControl } from './construction-logbook-control';

describe('ConstructionLogbookControl', () => {
  let component: ConstructionLogbookControl;
  let fixture: ComponentFixture<ConstructionLogbookControl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConstructionLogbookControl]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConstructionLogbookControl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
