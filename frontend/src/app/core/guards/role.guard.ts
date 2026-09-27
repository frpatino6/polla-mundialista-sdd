import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.models';

/**
 * Guard parametrizable por rol. Exige sesión activa y el rol indicado;
 * redirige a /login si no hay sesión, o a /predictions si el rol no coincide.
 */
export function roleGuard(requiredRole: UserRole): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated) {
      return router.createUrlTree(['/login']);
    }

    if (authService.role !== requiredRole) {
      return router.createUrlTree(['/predictions']);
    }

    return true;
  };
}

/** Guard concreto para rutas exclusivas de Admin. */
export const adminGuard: CanActivateFn = (route, state) => roleGuard('Admin')(route, state);
