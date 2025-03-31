import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { KeyValuePipe, NgClass } from '@angular/common';

export interface Tab {
  value: string;
  icon?: string;
}

@Component({
  selector: 'app-tabs',
  imports: [IconComponent, KeyValuePipe, NgClass],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
})
export class TabsComponent implements AfterViewInit, OnChanges, OnInit {
  @Input({ required: true }) tabs!: Record<string, Tab>;
  @Input() selectedTab?: string;
  @Output() selectedTabEvent = new EventEmitter<string>();

  @ViewChild('tabsElement')
  protected tabsElement!: ElementRef<HTMLDivElement>;
  @ViewChild('tabsListElement', { static: false })
  protected tabsListElement!: ElementRef<HTMLUListElement>;
  @ViewChild('shadowLeftElement')
  protected shadowLeftElement!: ElementRef<HTMLDivElement>;
  @ViewChild('shadowRightElement')
  protected shadowRightElement!: ElementRef<HTMLDivElement>;

  private renderer: Renderer2 = inject(Renderer2);
  private selectedTabHistory: string[] = [];

  @HostListener('wheel')
  private onScroll(): void {
    this.calculateScrollShadows();
  }

  @HostListener('window:resize')
  private onResize(): void {
    this.calculateScrollShadows();
  }

  ngOnInit(): void {
    this.setPreselectedTab();
  }

  ngAfterViewInit(): void {
    this.calculateScrollShadows();
  }

  ngOnChanges(): void {
    this.calculateScrollShadows();
  }

  protected selectTab(key: string): void {
    this.selectedTab = key;
    this.selectedTabHistory.push(key);
    this.selectedTabEvent.emit(key);
  }

  protected onCloseTab(event: MouseEvent, key: string): void {
    event.stopPropagation();
    this.closeTab(key);
  }

  protected closeTab(key: string): void {
    delete this.tabs[key];
    if (key == this.selectedTab) {
      this.selectedTab = undefined;
      this.selectPreviousTab();
    }
    this.calculateScrollShadows();
  }

  private selectPreviousTab(): void {
    const previousTab = this.selectedTabHistory.pop();
    if (!previousTab) {
      this.setPreselectedTab();
      return;
    }
    if (previousTab && this.tabIsSelectable(previousTab)) {
      this.selectTab(previousTab);
    } else {
      this.selectPreviousTab();
    }
  }

  private tabIsSelectable(key: string): boolean {
    return Object.keys(this.tabs).includes(key) && key !== this.selectedTab;
  }

  private setPreselectedTab(): void {
    if (!this.selectedTab) {
      const firstTab = Object.keys(this.tabs)[0];
      this.selectTab(firstTab);
    }
  }

  private calculateScrollShadows(): void {
    setTimeout(() => {
      const scrollWith = this.tabsListElement.nativeElement.scrollWidth - this.tabsElement.nativeElement.offsetWidth;
      let currentScroll = this.tabsListElement.nativeElement.scrollLeft / scrollWith;
      if (Number.isNaN(currentScroll)) {
        this.setShadows(0, 0);
      } else {
        this.setShadows(currentScroll, 1 - currentScroll);
      }
    });
  }

  private setShadows(left: number, right: number): void {
    this.renderer.setStyle(this.shadowLeftElement.nativeElement, 'opacity', left);
    this.renderer.setStyle(this.shadowRightElement.nativeElement, 'opacity', right);
  }
}
