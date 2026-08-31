import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Adjudicaciones } from './adjudicaciones';

describe('Adjudicaciones', () => {
  let component: Adjudicaciones;
  let fixture: ComponentFixture<Adjudicaciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Adjudicaciones],
    }).compileComponents();

    fixture = TestBed.createComponent(Adjudicaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
