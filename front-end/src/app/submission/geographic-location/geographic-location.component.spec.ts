import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeographicLocationComponent } from './geographic-location.component';

describe('GeographicLocationComponent', () => {
  let component: GeographicLocationComponent;
  let fixture: ComponentFixture<GeographicLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeographicLocationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeographicLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
