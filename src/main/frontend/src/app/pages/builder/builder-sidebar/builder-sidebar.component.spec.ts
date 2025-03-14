import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderSidebarComponent } from './builder-sidebar.component';

describe('SidebarComponent', () => {
  let component: BuilderSidebarComponent;
  let fixture: ComponentFixture<BuilderSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
