import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualitativeIndicatorsComponent } from './qualitative-indicators.component';

describe('QualitativeIndicatorsComponent', () => {
  let component: QualitativeIndicatorsComponent;
  let fixture: ComponentFixture<QualitativeIndicatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QualitativeIndicatorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QualitativeIndicatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
