import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreferenceCardPrint } from './preference-card-print';

describe('PreferenceCardPrint', () => {
  let component: PreferenceCardPrint;
  let fixture: ComponentFixture<PreferenceCardPrint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferenceCardPrint]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreferenceCardPrint);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
