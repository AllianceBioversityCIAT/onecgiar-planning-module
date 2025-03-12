import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncInitComponent } from './sync-init.component';

describe('SyncInitComponent', () => {
  let component: SyncInitComponent;
  let fixture: ComponentFixture<SyncInitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SyncInitComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyncInitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
