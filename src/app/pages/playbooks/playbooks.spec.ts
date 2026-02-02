import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Playbooks } from './playbooks';

describe('Playbooks', () => {
  let component: Playbooks;
  let fixture: ComponentFixture<Playbooks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Playbooks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Playbooks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
