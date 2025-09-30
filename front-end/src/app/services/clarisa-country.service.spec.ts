import { TestBed } from '@angular/core/testing';

import { ClarisaCountryService } from './clarisa-country.service';

describe('ClarisaCountryService', () => {
  let service: ClarisaCountryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClarisaCountryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
