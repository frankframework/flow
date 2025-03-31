import { Routes } from '@angular/router';
import { ProjectsComponent } from './pages/projects/projects.component';
import { BuilderComponent } from './pages/builder/builder.component';
import { EditorComponent } from './pages/editor/editor.component';
import { HelpComponent } from './pages/help/help.component';
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
  {
    path: 'projects',
    title: 'FF! Flow 📦 Projects',
    component: ProjectsComponent,
  },
  {
    path: 'builder',
    title: 'FF! Flow 🏗️ Builder',
    component: BuilderComponent,
  },
  {
    path: 'editor',
    title: 'FF! Flow ⌨️ Editor',
    component: EditorComponent,
  },
  {
    path: 'help',
    title: 'FF! Flow 🛟 Help',
    component: HelpComponent,
  },
  {
    path: 'settings',
    title: 'FF! Flow ⚙️ Settings',
    component: SettingsComponent,
  },
];
