import { Component } from '@angular/core';
import { SidebarsComponent } from '../../layout/sidebars/sidebars.component';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { StatusBarComponent } from '../../components/status-bar/status-bar.component';
import { MonacoEditorComponent } from '../../components/monaco-editor/monaco-editor.component';

@Component({
  selector: 'app-editor',
  imports: [SidebarsComponent, TabsComponent, StatusBarComponent, MonacoEditorComponent],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
})
export class EditorComponent {}
