import { Component } from '@angular/core';
import { IconComponent } from '../../../components/icon/icon.component';
import { SearchComponent } from '@frankframework/angular-components';

@Component({
  selector: 'app-builder-left-sidebar',
  imports: [IconComponent, SearchComponent],
  templateUrl: './builder-left-sidebar.component.html',
  styleUrl: './builder-left-sidebar.component.scss',
})
export class BuilderLeftSidebarComponent {
  protected sidebarCollapsed = false;
  // protected toolSelected: 'palette' | 'structure' = 'palette';
  protected files = ['file1', 'file2', 'file3', 'file4', 'file5', 'file6', 'file7', 'file8', 'file9'];

  protected toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    globalThis.dispatchEvent(new Event('resize'));
  }
}
