import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuilderLeftSidebarComponent } from './builder-left-sidebar.component';

describe('SidebarComponent', () => {
  let component: BuilderLeftSidebarComponent;
  let fixture: ComponentFixture<BuilderLeftSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderLeftSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BuilderLeftSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
