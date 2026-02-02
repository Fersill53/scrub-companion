import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreferenceCardView } from './preference-card-view';

describe('PreferenceCardView', () => {
  let component: PreferenceCardView;
  let fixture: ComponentFixture<PreferenceCardView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferenceCardView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreferenceCardView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
