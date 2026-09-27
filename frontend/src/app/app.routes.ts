import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'predictions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./predictions/predictions/predictions').then((m) => m.Predictions),
  },
  { path: '', pathMatch: 'full', redirectTo: 'predictions' },
  { path: '**', redirectTo: 'login' },
];
