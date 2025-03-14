import { Component } from '@angular/core';
import { IconComponent } from '../../../components/icon/icon.component';
import { SearchComponent } from '@frankframework/angular-components';

@Component({
  selector: 'app-builder-sidebar',
  imports: [IconComponent, SearchComponent],
  templateUrl: './builder-sidebar.component.html',
  styleUrl: './builder-sidebar.component.scss',
})
export class BuilderSidebarComponent {}
