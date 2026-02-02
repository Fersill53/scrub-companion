import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyCenter } from './study-center';

describe('StudyCenter', () => {
  let component: StudyCenter;
  let fixture: ComponentFixture<StudyCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudyCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
