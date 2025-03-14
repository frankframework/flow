import { Component, Input } from '@angular/core';
import { SvgIconComponent } from 'angular-svg-icon';

export type IconStyle = 'default' | 'light';
export type IconType = 'outline' | 'linear';

@Component({
  selector: 'app-icon',
  imports: [SvgIconComponent],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  @Input() name = '';
  @Input() width = 'auto';
  @Input() height = 'auto';
  @Input() iconType: IconType = 'outline';
  @Input() theme: IconStyle = 'default';
}
