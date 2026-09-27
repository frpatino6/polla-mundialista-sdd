import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;
  let authServiceSpy: { resetPassword: ReturnType<typeof vi.fn> };

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const setup = async (queryParams: Record<string, string> = {}) => {
    authServiceSpy = { resetPassword: vi.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setup();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('prefills the token from the ?token= query param', async () => {
    await setup({ token: 'from-url-token' });

    expect(component.form.controls.token.value).toBe('from-url-token');
  });

  it('does not call AuthService.resetPassword when the form is invalid', () => {
    component.form.setValue({ token: '', newPassword: 'short' });

    component.submit();

    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
  });

  it('calls AuthService.resetPassword and shows the success state', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      of({ message: 'Contraseña actualizada correctamente.' }),
    );
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('valid-token', 'newSecret123');
    expect(component.successMessage()).toBe('Contraseña actualizada correctamente.');
    expect(host().querySelector('[role="status"]')?.textContent).toContain(
      'Contraseña actualizada correctamente.',
    );
    expect(host().querySelector('form')).toBeNull();
    expect(host().querySelector('a[routerLink="/login"]')?.textContent).toContain(
      'Ir a iniciar sesión',
    );
  });

  it('shows the domain error for an invalid token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: 'El token de reseteo no es válido.' } })),
    );
    component.form.setValue({ token: 'bad-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('El token de reseteo no es válido.');
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'El token de reseteo no es válido.',
    );
  });

  it('shows the domain error for an expired token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: 'El token de reseteo expiró.' } })),
    );
    component.form.setValue({ token: 'expired-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('El token de reseteo expiró.');
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'El token de reseteo expiró.',
    );
  });

  it('shows the domain error for an already-consumed token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: 'El token de reseteo ya fue utilizado.' } })),
    );
    component.form.setValue({ token: 'consumed-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('El token de reseteo ya fue utilizado.');
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'El token de reseteo ya fue utilizado.',
    );
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });
    fixture.detectChanges();

    const input = host().querySelector('#newPassword') as HTMLInputElement;
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
    expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('disables the submit button and shows the loading state while the request is in flight', () => {
    authServiceSpy.resetPassword.mockReturnValue(new Subject<unknown>().asObservable());
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Restableciendo…');
    expect(button.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('exposes accessible labels, autocomplete and error descriptions', () => {
    const token = host().querySelector('#token') as HTMLInputElement;
    const newPassword = host().querySelector('#newPassword') as HTMLInputElement;

    expect(host().querySelector('label[for="token"]')).toBeTruthy();
    expect(host().querySelector('label[for="newPassword"]')).toBeTruthy();
    expect(newPassword.getAttribute('autocomplete')).toBe('new-password');
    expect(token.getAttribute('aria-describedby')).toBeNull();

    component.form.setValue({ token: '', newPassword: 'short' });
    component.submit();
    fixture.detectChanges();

    expect(token.getAttribute('aria-invalid')).toBe('true');
    expect(token.getAttribute('aria-describedby')).toBe('token-error');
    expect(newPassword.getAttribute('aria-invalid')).toBe('true');
    expect(newPassword.getAttribute('aria-describedby')).toBe('newPassword-error');
  });

  it('links back to /login', () => {
    const link = host().querySelector('a[routerLink="/login"]');

    expect(link?.textContent).toContain('Inicia sesión');
  });
});
