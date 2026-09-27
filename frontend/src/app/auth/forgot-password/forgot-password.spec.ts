import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;
  let authServiceSpy: { forgotPassword: ReturnType<typeof vi.fn> };

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    authServiceSpy = { forgotPassword: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call AuthService.forgotPassword when the form is invalid', () => {
    component.form.setValue({ email: 'not-an-email' });

    component.submit();

    expect(authServiceSpy.forgotPassword).not.toHaveBeenCalled();
  });

  it('shows the exact generic message returned by the backend on success', () => {
    const genericMessage = 'Si el correo está registrado, se enviará un enlace de recuperación.';
    authServiceSpy.forgotPassword.mockReturnValue(of({ message: genericMessage }));
    component.form.setValue({ email: 'user@example.com' });

    component.submit();
    fixture.detectChanges();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(component.successMessage()).toBe(genericMessage);
    expect(host().querySelector('[role="status"]')?.textContent).toContain(genericMessage);
    // El formulario se reemplaza por el estado de éxito.
    expect(host().querySelector('form')).toBeNull();
  });

  it('shows the same generic-style success message regardless of whether the email exists', () => {
    // No debe existir ninguna rama en el componente que distinga ambos casos: el backend
    // ya devuelve el mismo mensaje siempre (anti-enumeración, docs/design.md §7.2), y este
    // test documenta que el frontend simplemente lo reenvía tal cual.
    const genericMessage = 'Si el correo está registrado, se enviará un enlace de recuperación.';
    authServiceSpy.forgotPassword.mockReturnValue(of({ message: genericMessage }));
    component.form.setValue({ email: 'nonexistent@example.com' });

    component.submit();

    expect(component.successMessage()).toBe(genericMessage);
    expect(component.errorMessage()).toBeNull();
  });

  it('shows a generic error message on a network/server failure without submitting again', () => {
    authServiceSpy.forgotPassword.mockReturnValue(throwError(() => ({ status: 0 })));
    component.form.setValue({ email: 'user@example.com' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No se pudo enviar la solicitud. Intenta de nuevo.');
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo enviar la solicitud.',
    );
  });

  it('disables the submit button and shows the loading state while the request is in flight', () => {
    authServiceSpy.forgotPassword.mockReturnValue(new Subject<unknown>().asObservable());
    component.form.setValue({ email: 'user@example.com' });

    component.submit();
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Enviando…');
    expect(button.querySelector('svg.animate-spin')).toBeTruthy();
  });

  it('exposes accessible labels, autocomplete and error descriptions', () => {
    const email = host().querySelector('#email') as HTMLInputElement;

    expect(host().querySelector('label[for="email"]')).toBeTruthy();
    expect(email.getAttribute('autocomplete')).toBe('email');
    expect(email.getAttribute('aria-describedby')).toBeNull();

    component.form.setValue({ email: 'not-an-email' });
    component.submit();
    fixture.detectChanges();

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('email-error');
    expect(host().querySelector('#email-error')).toBeTruthy();
  });

  it('links back to /login', () => {
    const link = host().querySelector('a[routerLink="/login"]');

    expect(link?.textContent).toContain('Inicia sesión');
  });
});
