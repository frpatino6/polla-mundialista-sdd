import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Navbar } from './navbar';
import { NAVBAR_COPY } from './navbar.copy';

describe('Navbar', () => {
  type Role = 'User' | 'Admin' | null;

  let authServiceMock: {
    currentUser: { email: string; role: 'User' | 'Admin' } | null;
    role: Role;
    logout: ReturnType<typeof vi.fn>;
  };

  function setup(role: Role): ComponentFixture<Navbar> {
    authServiceMock = {
      currentUser: role ? { email: 'user@example.com', role } : null,
      role,
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    });

    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture;
  }

  const host = (fixture: ComponentFixture<Navbar>): HTMLElement =>
    fixture.nativeElement as HTMLElement;

  it('muestra el enlace al Panel Admin para una sesión con rol Admin', () => {
    const root = host(setup('Admin'));

    expect(root.querySelector('a[routerLink="/admin"]')?.textContent?.trim()).toBe(
      NAVBAR_COPY.links.admin,
    );
  });

  it('oculta el enlace al Panel Admin para una sesión con rol User', () => {
    const root = host(setup('User'));

    expect(root.querySelector('a[routerLink="/admin"]')).toBeNull();
  });

  it('muestra siempre Leaderboard y Mi Historial, sin importar el rol', () => {
    for (const role of ['User', 'Admin'] as const) {
      TestBed.resetTestingModule();
      const root = host(setup(role));

      expect(root.querySelector('a[routerLink="/leaderboard"]')?.textContent?.trim()).toBe(
        NAVBAR_COPY.links.leaderboard,
      );
      expect(root.querySelector('a[routerLink="/history"]')?.textContent?.trim()).toBe(
        NAVBAR_COPY.links.history,
      );
    }
  });

  it('muestra el email de la sesión y su inicial en el avatar', () => {
    const fixture = setup('User');
    const root = host(fixture);

    const email = [...root.querySelectorAll('span')].find(
      (span) => span.textContent?.trim() === 'user@example.com',
    );

    expect(email).toBeTruthy();
    expect(fixture.componentInstance.initial).toBe('U');
    expect(root.querySelector('span[aria-hidden="true"]')?.textContent?.trim()).toBe('U');
  });

  it('cierra sesión a través de AuthService.logout()', () => {
    const root = host(setup('User'));
    const button = root.querySelector('button') as HTMLButtonElement;

    expect(button.type).toBe('button');
    button.click();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
  });

  it('expone la navegación en un nav etiquetado para lectores de pantalla', () => {
    const root = host(setup('Admin'));

    const nav = root.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe(NAVBAR_COPY.nav.ariaLabel);
    expect(nav?.querySelectorAll('a').length).toBe(3);
  });

  it('marca la ruta en curso con aria-current y con un estado activo que no depende solo del color', () => {
    const fixture = setup('User');
    const link = host(fixture).querySelector('a[routerLink="/leaderboard"]') as HTMLAnchorElement;

    expect(link.getAttribute('aria-current')).toBeNull();

    fixture.componentInstance.onActiveChange('/leaderboard', true);
    fixture.detectChanges();

    expect(link.getAttribute('aria-current')).toBe('page');
    // El estado activo suma fondo, subrayado y peso además del color del texto.
    expect(link.className).toContain('border-emerald-400');
    expect(link.className).toContain('bg-slate-800');
  });

  it('deja el navbar pegado arriba y con foco visible en los enlaces', () => {
    const root = host(setup('User'));

    const header = root.querySelector('header');
    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('top-0');

    const link = root.querySelector('a[routerLink="/leaderboard"]') as HTMLAnchorElement;
    expect(link.className).toContain('focus-visible:ring-2');
  });

  it('renderiza los textos de NAVBAR_COPY manteniendo las etiquetas accesibles del navbar', () => {
    const root = host(setup('Admin'));

    const brand = root.querySelector('a[routerLink="/predictions"]') as HTMLAnchorElement;
    const [eyebrow, name] = brand.querySelectorAll('span span');
    expect(eyebrow.textContent?.trim()).toBe(NAVBAR_COPY.brand.eyebrow);
    expect(name.textContent?.trim()).toBe(NAVBAR_COPY.brand.name);

    // La etiqueta del nav sigue siendo la del copy y envuelve a los tres links.
    const nav = root.querySelector('nav') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe(NAVBAR_COPY.nav.ariaLabel);
    expect([...nav.querySelectorAll('a')].map((link) => link.textContent?.trim())).toStrictEqual([
      NAVBAR_COPY.links.leaderboard,
      NAVBAR_COPY.links.history,
      NAVBAR_COPY.links.admin,
    ]);

    const logout = root.querySelector('button') as HTMLButtonElement;
    expect(logout.textContent?.trim()).toBe(NAVBAR_COPY.actions.logout);
    // El ícono de logout sigue oculto para lectores de pantalla: el texto del botón es su nombre accesible.
    expect(logout.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
