import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupBuilder } from './setup-builder';

describe('SetupBuilder', () => {
  let component: SetupBuilder;
  let fixture: ComponentFixture<SetupBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupBuilder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
