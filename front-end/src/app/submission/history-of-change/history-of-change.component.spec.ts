import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoryOfChangeComponent } from './history-of-change.component';

describe('HistoryOfChangeComponent', () => {
  let component: HistoryOfChangeComponent;
  let fixture: ComponentFixture<HistoryOfChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HistoryOfChangeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryOfChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
