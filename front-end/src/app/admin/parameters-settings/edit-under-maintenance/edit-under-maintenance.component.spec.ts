import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditUnderMaintenanceComponent } from './edit-under-maintenance.component';

describe('EditUnderMaintenanceComponent', () => {
  let component: EditUnderMaintenanceComponent;
  let fixture: ComponentFixture<EditUnderMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditUnderMaintenanceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditUnderMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
