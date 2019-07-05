import { TestBed } from '@angular/core/testing';

import { HiraganaService } from './hiragana.service';

describe('HiraganaService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: HiraganaService = TestBed.get(HiraganaService);
    expect(service).toBeTruthy();
  });
});
