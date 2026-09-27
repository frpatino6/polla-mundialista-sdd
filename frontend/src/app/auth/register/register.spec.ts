import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authServiceSpy: { register: ReturnType<typeof vi.fn> };
  let router: Router;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    authServiceSpy = { register: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call AuthService.register when the form is invalid', () => {
    component.form.setValue({ email: 'not-an-email', password: '' });

    component.submit();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('calls AuthService.register and navigates to /login on success', () => {
    authServiceSpy.register.mockReturnValue(
      of({ id: 'u1', email: 'new@example.com', role: 'User' }),
    );
    component.form.setValue({ email: 'new@example.com', password: 'secret123' });

    component.submit();

    expect(authServiceSpy.register).toHaveBeenCalledWith('new@example.com', 'secret123');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows an error message when registration fails', () => {
    authServiceSpy.register.mockReturnValue(
      throwError(() => ({ error: { message: 'El email ya está registrado.' } })),
    );
    component.form.setValue({ email: 'dup@example.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('El email ya está registrado.');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'El email ya está registrado.',
    );
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({ email: 'new@example.com', password: 'secret123' });
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
    expect(authServiceSpy.register).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('disables the submit button and shows the loading state while the request is in flight', () => {
    authServiceSpy.register.mockReturnValue(new Subject<unknown>().asObservable());
    component.form.setValue({ email: 'new@example.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Creando cuenta…');
    expect(button.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('exposes accessible labels, autocompletes and error descriptions', () => {
    const email = host().querySelector('#email') as HTMLInputElement;
    const password = host().querySelector('#password') as HTMLInputElement;

    expect(host().querySelector('label[for="email"]')).toBeTruthy();
    expect(host().querySelector('label[for="password"]')).toBeTruthy();
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(email.getAttribute('aria-describedby')).toBeNull();

    component.form.setValue({ email: 'not-an-email', password: '' });
    component.submit();
    fixture.detectChanges();

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('email-error');
    expect(host().querySelector('#email-error')).toBeTruthy();
  });

  it('does not render the login-only recovery affordances', () => {
    expect(host().querySelector('#remember-me')).toBeNull();
    expect(host().querySelector('[aria-disabled="true"]')).toBeNull();
    expect(host().querySelector('a[href*="forgot-password"]')).toBeNull();
  });
});
