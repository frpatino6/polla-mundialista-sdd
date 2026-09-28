import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';
import { LOGIN_COPY } from './login.copy';

// Mensaje tal como lo devuelve la API en un fallo de autenticación: es copy del servidor,
// no de la interfaz, por eso vive aquí y no en LOGIN_COPY.
const serverError = 'Credenciales inválidas.';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    authServiceSpy = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([
          {
            path: 'forgot-password',
            loadComponent: () =>
              import('../forgot-password/forgot-password').then((m) => m.ForgotPassword),
          },
        ]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    vi.spyOn(router, 'navigateByUrl');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call AuthService.login when the form is invalid', () => {
    component.form.setValue({ email: 'not-an-email', password: '' });

    component.submit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('calls AuthService.login and navigates to /predictions on success', () => {
    authServiceSpy.login.mockReturnValue(
      of({ token: 't', userId: 'u1', email: 'user@example.com', role: 'User' }),
    );
    component.form.setValue({ email: 'user@example.com', password: 'secret123' });

    component.submit();

    expect(authServiceSpy.login).toHaveBeenCalledWith('user@example.com', 'secret123');
    expect(router.navigate).toHaveBeenCalledWith(['/predictions']);
  });

  it('shows an error message when login fails', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: { message: serverError } })));
    component.form.setValue({ email: 'user@example.com', password: 'wrongpass' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(serverError);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(serverError);
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({ email: 'user@example.com', password: 'secret123' });
    fixture.detectChanges();

    const input = host().querySelector('#password') as HTMLInputElement;
    expect(input.type).toBe('password');

    (
      host().querySelector(`[aria-label="${LOGIN_COPY.actions.showPassword}"]`) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    const hideToggle = host().querySelector(
      `[aria-label="${LOGIN_COPY.actions.hidePassword}"]`,
    ) as HTMLButtonElement;
    expect(hideToggle.getAttribute('aria-pressed')).toBe('true');

    hideToggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('password');
    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('disables the submit button and shows the loading state while the request is in flight', () => {
    authServiceSpy.login.mockReturnValue(new Subject<unknown>().asObservable());
    component.form.setValue({ email: 'user@example.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain(LOGIN_COPY.actions.submitting);
    expect(button.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('the forgot-password link is enabled and navigates to /forgot-password', async () => {
    const link = host().querySelector('a[routerLink="/forgot-password"]') as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.textContent).toContain(LOGIN_COPY.forgotPassword);
    expect(link.hasAttribute('aria-disabled')).toBe(false);
    expect(link.getAttribute('title')).toBeNull();

    link.click();
    fixture.detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalled();
    const navigatedUrl = (router.navigateByUrl as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(String(navigatedUrl)).toBe('/forgot-password');

    // Deja resolver la navegación real (aunque no exista la ruta registrada en este
    // TestBed) dentro del propio test, para no dejar una promesa pendiente que se
    // resuelva luego de destruirse el injector de este fixture.
    await fixture.whenStable();
  });

  it('toggles the rememberMe signal when its checkbox is clicked', () => {
    const checkbox = host().querySelector('#remember-me') as HTMLInputElement;
    expect(component.rememberMe()).toBe(false);

    checkbox.click();
    fixture.detectChanges();

    expect(component.rememberMe()).toBe(true);
    expect(checkbox.checked).toBe(true);

    checkbox.click();
    fixture.detectChanges();

    expect(component.rememberMe()).toBe(false);
  });

  it('exposes accessible labels, autocompletes and error descriptions', () => {
    const email = host().querySelector('#email') as HTMLInputElement;
    const password = host().querySelector('#password') as HTMLInputElement;

    expect(host().querySelector('label[for="email"]')).toBeTruthy();
    expect(host().querySelector('label[for="password"]')).toBeTruthy();
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(email.getAttribute('aria-describedby')).toBeNull();

    component.form.setValue({ email: 'not-an-email', password: '' });
    component.submit();
    fixture.detectChanges();

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('email-error');
    expect(host().querySelector('#email-error')).toBeTruthy();
  });

  it('renders the LOGIN_COPY texts keeping every accessible label attached to its control', () => {
    const heading = host().querySelector('h1') as HTMLElement;
    const brand = host().querySelector('p.uppercase') as HTMLElement;
    const emailLabel = host().querySelector('label[for="email"]') as HTMLLabelElement;
    const passwordLabel = host().querySelector('label[for="password"]') as HTMLLabelElement;

    expect(heading.textContent?.trim()).toBe(LOGIN_COPY.title);
    expect(brand.textContent?.trim()).toBe(LOGIN_COPY.brand);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      LOGIN_COPY.subtitle,
    );
    expect(emailLabel.textContent?.trim()).toBe(LOGIN_COPY.fields.email.label);
    expect(passwordLabel.textContent?.trim()).toBe(LOGIN_COPY.fields.password.label);
    expect(
      (
        host().querySelector('a[routerLink="/forgot-password"]') as HTMLAnchorElement
      ).textContent?.trim(),
    ).toBe(LOGIN_COPY.forgotPassword);
    expect(
      (host().querySelector('a[routerLink="/register"]') as HTMLAnchorElement).textContent?.trim(),
    ).toBe(LOGIN_COPY.noAccount.cta);

    expect(emailLabel.getAttribute('for')).toBe(
      (host().querySelector('#email') as HTMLElement).getAttribute('id'),
    );
    expect(passwordLabel.getAttribute('for')).toBe(
      (host().querySelector('#password') as HTMLElement).getAttribute('id'),
    );
  });

  it('falls back to the copy error message when the API error carries no message', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({})));
    component.form.setValue({ email: 'user@example.com', password: 'wrongpass' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(LOGIN_COPY.errors.fallback);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      LOGIN_COPY.errors.fallback,
    );
  });
});
