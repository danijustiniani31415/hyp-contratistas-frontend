import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResidentTable } from './resident-table';

describe('ResidentTable', () => {
  let component: ResidentTable;
  let fixture: ComponentFixture<ResidentTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResidentTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResidentTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
