import { Component } from '@angular/core';
import { BuilderLeftSidebarComponent } from './builder-left-sidebar/builder-left-sidebar.component';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { StatusBarComponent } from '../../components/status-bar/status-bar.component';
import { SidebarsComponent } from '../../layout/sidebars/sidebars.component';

@Component({
  selector: 'app-builder',
  imports: [BuilderLeftSidebarComponent, TabsComponent, StatusBarComponent, SidebarsComponent],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
})
export class BuilderComponent {}
