import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../components/icon/icon.component';

@Component({
  selector: 'app-navigation-item',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './navigation-item.component.html',
  styleUrl: './navigation-item.component.scss',
})
export class NavigationItemComponent {
  @Input() public label = '';
  @Input() public icon = '';
  @Input() public route = '';
}
