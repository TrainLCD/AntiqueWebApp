import { TestBed } from '@angular/core/testing';

import { StationAPIService } from './station-api.service';

describe('StationAPIService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StationAPIService = TestBed.get(StationAPIService);
    expect(service).toBeTruthy();
  });
});
