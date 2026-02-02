import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreferenceCardEditor } from './preference-card-editor';

describe('PreferenceCardEditor', () => {
  let component: PreferenceCardEditor;
  let fixture: ComponentFixture<PreferenceCardEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreferenceCardEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreferenceCardEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
