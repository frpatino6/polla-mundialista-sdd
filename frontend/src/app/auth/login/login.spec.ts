import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

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
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
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
    authServiceSpy.login.mockReturnValue(
      throwError(() => ({ error: { message: 'Credenciales inválidas.' } })),
    );
    component.form.setValue({ email: 'user@example.com', password: 'wrongpass' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('Credenciales inválidas.');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'Credenciales inválidas.',
    );
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({ email: 'user@example.com', password: 'secret123' });
    fixture.detectChanges();

    const input = host().querySelector('#password') as HTMLInputElement;
    expect(input.type).toBe('password');

    (host().querySelector('[aria-label="Mostrar contraseña"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    const hideToggle = host().querySelector(
      '[aria-label="Ocultar contraseña"]',
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
    expect(button.textContent).toContain('Ingresando…');
    expect(button.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('renders the forgot-password entry disabled and without navigating', () => {
    const link = host().querySelector('[aria-disabled="true"]') as HTMLElement;

    expect(link.textContent).toContain('¿Olvidaste tu contraseña?');
    expect(link.getAttribute('title')).toBe('Disponible próximamente');
    expect(link.hasAttribute('href')).toBe(false);
    expect(
      host().querySelector('a[href*="forgot-password"], a[href*="reset-password"]'),
    ).toBeNull();

    link.click();
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
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
});
