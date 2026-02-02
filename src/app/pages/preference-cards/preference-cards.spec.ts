import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreferenceCards } from './preference-cards';

describe('PreferenceCards', () => {
  let component: PreferenceCards;
  let fixture: ComponentFixture<PreferenceCards>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferenceCards]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreferenceCards);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
