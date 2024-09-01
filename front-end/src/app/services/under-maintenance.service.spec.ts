import { TestBed } from '@angular/core/testing';

import { UnderMaintenanceService } from './under-maintenance.service';

describe('UnderMaintenanceService', () => {
  let service: UnderMaintenanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnderMaintenanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
