import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmittedVersionComponent } from './submitted-version.component';

describe('SubmittedVersionComponent', () => {
  let component: SubmittedVersionComponent;
  let fixture: ComponentFixture<SubmittedVersionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubmittedVersionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmittedVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
