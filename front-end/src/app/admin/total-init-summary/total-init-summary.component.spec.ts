import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalInitSummaryComponent } from './total-init-summary.component';

describe('TotalInitSummaryComponent', () => {
  let component: TotalInitSummaryComponent;
  let fixture: ComponentFixture<TotalInitSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TotalInitSummaryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalInitSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
