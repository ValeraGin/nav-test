import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgSpatialNavigationComponent } from './ng-spatial-navigation.component';

describe('NgSpatialNavigationComponent', () => {
  let component: NgSpatialNavigationComponent;
  let fixture: ComponentFixture<NgSpatialNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NgSpatialNavigationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgSpatialNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
