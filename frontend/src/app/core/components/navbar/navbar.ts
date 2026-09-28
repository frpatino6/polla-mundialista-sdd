import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NAVBAR_COPY } from './navbar.copy';

/**
 * Barra de navegación compartida por las cuatro pantallas internas de la polla
 * (Predicciones, Leaderboard, Historial y Panel Admin). Se declara dentro del
 * template de cada pantalla y no en app.html a propósito: cada pantalla conserva
 * así su propio encabezado —y sus tests pueden seguir consultando sus links con
 * `a[routerLink="/admin"]` sobre el fixture de esa pantalla, porque el DOM de un
 * componente hijo cae dentro del host—.
 */
@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly authService = inject(AuthService);

  readonly copy = NAVBAR_COPY;

  readonly email = this.authService.currentUser?.email ?? null;
  readonly initial = this.email?.charAt(0).toUpperCase() ?? '';
  /** El Panel Admin solo se ofrece a quien tiene el rol Admin (lo valida además adminGuard). */
  readonly isAdmin = this.authService.role === 'Admin';

  private readonly activeLinks = signal<ReadonlySet<string>>(new Set<string>());

  isActive(href: string): boolean {
    return this.activeLinks().has(href);
  }

  /**
   * El estado activo se lleva a un signal con el output isActiveChange en vez de
   * dejar que routerLinkActive agregue clases al class: el link activo y el
   * inactivo comparten utilidades de color (text, border-color, background) y
   * dos clases que colisionan en el mismo atributo class se resuelven por orden
   * en la hoja de estilos, no por intención. Con @if/signal cada estado
   * declara su lista completa y no hay ambigüedad. aria-current se escribe aquí
   * mismo para no depender de ariaCurrentWhenActive.
   */
  onActiveChange(href: string, isActive: boolean): void {
    this.activeLinks.update((current) => {
      const next = new Set(current);
      if (isActive) {
        next.add(href);
      } else {
        next.delete(href);
      }
      return next;
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
