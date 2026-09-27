import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/role.guard';

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
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password/reset-password').then((m) => m.ResetPassword),
  },
  {
    path: 'predictions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./predictions/predictions/predictions').then((m) => m.Predictions),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/admin-matches/admin-matches').then((m) => m.AdminMatches),
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./leaderboard/leaderboard/leaderboard').then((m) => m.Leaderboard),
  },
  {
    path: 'history',
    canActivate: [authGuard],
    loadComponent: () => import('./predictions/history/history').then((m) => m.History),
  },
  { path: '', pathMatch: 'full', redirectTo: 'predictions' },
  { path: '**', redirectTo: 'login' },
];
