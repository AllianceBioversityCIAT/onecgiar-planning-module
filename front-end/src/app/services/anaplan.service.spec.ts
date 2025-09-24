import { TestBed } from '@angular/core/testing';

import { AnaplanService } from './anaplan.service';

describe('AnaplanService', () => {
  let service: AnaplanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnaplanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
