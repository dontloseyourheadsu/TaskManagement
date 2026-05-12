import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { TaskViewerComponent } from './components/task-viewer/task-viewer.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SharedWorkspaceComponent } from './components/shared-workspace/shared-workspace.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: TaskViewerComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'shared/:token', component: SharedWorkspaceComponent },
  { path: '**', redirectTo: '/login' }
];
