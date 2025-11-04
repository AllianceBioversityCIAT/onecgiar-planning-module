import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitMessageComponent } from './submit-message.component';

describe('SubmitMessageComponent', () => {
  let component: SubmitMessageComponent;
  let fixture: ComponentFixture<SubmitMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubmitMessageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
