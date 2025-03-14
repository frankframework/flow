import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// eslint-disable-next-line unicorn/prefer-top-level-await
bootstrapApplication(AppComponent, appConfig).catch((error) => console.error(error));
