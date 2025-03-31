import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarsComponent } from './sidebars.component';

describe('SidebarsComponent', () => {
  let component: SidebarsComponent;
  let fixture: ComponentFixture<SidebarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
