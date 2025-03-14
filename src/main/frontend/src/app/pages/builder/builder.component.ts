import { Component } from '@angular/core';
import { BuilderSidebarComponent } from './builder-sidebar/builder-sidebar.component';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { StatusBarComponent } from '../../components/status-bar/status-bar.component';

@Component({
  selector: 'app-builder',
  imports: [BuilderSidebarComponent, TabsComponent, StatusBarComponent],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss',
})
export class BuilderComponent {
  protected tabs = {
    tab1: 'tab1',
    tab2: 'tab2',
    tab3: 'tab3',
    tab4: 'tab4',
    tab5: 'tab5',
    tab6: 'tab6',
    tab7: 'tab7',
    tab8: 'tab8',
    tab9: 'tab9',
  };
  protected selectedTab = '';
}
