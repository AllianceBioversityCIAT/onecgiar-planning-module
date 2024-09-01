import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackPORBsComponent } from './track-porbs.component';

describe('TrackPORBsComponent', () => {
  let component: TrackPORBsComponent;
  let fixture: ComponentFixture<TrackPORBsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrackPORBsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackPORBsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
