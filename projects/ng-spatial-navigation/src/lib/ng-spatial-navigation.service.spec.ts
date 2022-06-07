import { TestBed } from '@angular/core/testing';

import { NgSpatialNavigationService } from './ng-spatial-navigation.service';

describe('NgSpatialNavigationService', () => {
  let service: NgSpatialNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgSpatialNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
