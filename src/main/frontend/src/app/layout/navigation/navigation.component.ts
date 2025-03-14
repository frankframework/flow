import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { NavigationItemComponent } from './navigation-item/navigation-item.component';

@Component({
  selector: 'app-navigation',
  imports: [NgOptimizedImage, NavigationItemComponent],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
})
export class NavigationComponent {}
