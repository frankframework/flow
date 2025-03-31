import { AfterViewInit, Component, Input, OnDestroy, viewChild } from '@angular/core';
import { IconComponent } from '../../components/icon/icon.component';
import { SplitAreaComponent, SplitComponent, SplitGutterDirective } from 'angular-split';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebars',
  imports: [IconComponent, SplitAreaComponent, SplitComponent, NgClass, SplitGutterDirective],
  templateUrl: './sidebars.component.html',
  styleUrl: './sidebars.component.scss',
})
export class SidebarsComponent implements AfterViewInit, OnDestroy {
  @Input() leftCollapsed = false;
  @Input() rightCollapsed = false;

  private readonly splitElement = viewChild(SplitComponent);
  private splitElementSubscription: Subscription | undefined;

  ngAfterViewInit(): void {
    this.splitElementSubscription = this.splitElement()?.dragProgress$.subscribe(() => {
      this.resizeWindow();
    });
  }

  ngOnDestroy(): void {
    this.splitElementSubscription?.unsubscribe();
  }

  protected toggleLeftSidebar(): void {
    this.leftCollapsed = !this.leftCollapsed;
  }

  protected toggleRightSidebar(): void {
    this.rightCollapsed = !this.rightCollapsed;
  }

  protected resizeWindow(): void {
    globalThis.dispatchEvent(new Event('resize'));
  }
}
