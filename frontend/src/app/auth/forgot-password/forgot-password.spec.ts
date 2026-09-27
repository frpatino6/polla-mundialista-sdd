import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPassword } from './forgot-password';
import { FORGOT_PASSWORD_COPY } from './forgot-password.copy';

// Mensaje genérico tal como lo devuelve la API (anti-enumeración, docs/design.md §7.2):
// es copy del servidor, no de la interfaz, por eso vive acá y no en FORGOT_PASSWORD_COPY.
const serverGenericMessage = 'Si el correo está registrado, se enviará un enlace de recuperación.';

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
    authServiceSpy.forgotPassword.mockReturnValue(of({ message: serverGenericMessage }));
    component.form.setValue({ email: 'user@example.com' });

    component.submit();
    fixture.detectChanges();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(component.successMessage()).toBe(serverGenericMessage);
    expect(host().querySelector('[role="status"]')?.textContent).toContain(serverGenericMessage);
    // El formulario se reemplaza por el estado de éxito.
    expect(host().querySelector('form')).toBeNull();
  });

  it('shows the same generic-style success message regardless of whether the email exists', () => {
    // No debe existir ninguna rama en el componente que distinga ambos casos: el backend
    // ya devuelve el mismo mensaje siempre (anti-enumeración, docs/design.md §7.2), y este
    // test documenta que el frontend simplemente lo reenvía tal cual.
    authServiceSpy.forgotPassword.mockReturnValue(of({ message: serverGenericMessage }));
    component.form.setValue({ email: 'nonexistent@example.com' });

    component.submit();

    expect(component.successMessage()).toBe(serverGenericMessage);
    expect(component.errorMessage()).toBeNull();
  });

  it('shows a generic error message on a network/server failure without submitting again', () => {
    authServiceSpy.forgotPassword.mockReturnValue(throwError(() => ({ status: 0 })));
    component.form.setValue({ email: 'user@example.com' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(FORGOT_PASSWORD_COPY.errors.request);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      FORGOT_PASSWORD_COPY.errors.request,
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
    expect(button.textContent).toContain(FORGOT_PASSWORD_COPY.actions.submitting);
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

    expect(link?.textContent).toContain(FORGOT_PASSWORD_COPY.rememberedPassword.cta);
  });

  it('renders the FORGOT_PASSWORD_COPY texts keeping the accessible label attached to its control', () => {
    const heading = host().querySelector('h1') as HTMLElement;
    const brand = host().querySelector('p.uppercase') as HTMLElement;
    const emailLabel = host().querySelector('label[for="email"]') as HTMLLabelElement;
    const email = host().querySelector('#email') as HTMLInputElement;

    expect(heading.textContent?.trim()).toBe(FORGOT_PASSWORD_COPY.title);
    expect(brand.textContent?.trim()).toBe(FORGOT_PASSWORD_COPY.brand);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      FORGOT_PASSWORD_COPY.subtitle,
    );
    expect(emailLabel.textContent?.trim()).toBe(FORGOT_PASSWORD_COPY.fields.email.label);
    expect(email.getAttribute('placeholder')).toBe(FORGOT_PASSWORD_COPY.fields.email.placeholder);
    expect((host().querySelector('button[type="submit"]') as HTMLElement).textContent?.trim()).toBe(
      FORGOT_PASSWORD_COPY.actions.submit,
    );
    expect((host().querySelector('p.mt-6') as HTMLElement).textContent?.trim()).toBe(
      `${FORGOT_PASSWORD_COPY.rememberedPassword.prompt} ${FORGOT_PASSWORD_COPY.rememberedPassword.cta}`,
    );
    expect(emailLabel.getAttribute('for')).toBe(email.getAttribute('id'));
  });

  it('renders the field validation message from the copy', () => {
    component.form.setValue({ email: 'not-an-email' });
    component.submit();
    fixture.detectChanges();

    expect(host().querySelector('#email-error')?.textContent?.trim()).toBe(
      FORGOT_PASSWORD_COPY.errors.email,
    );
  });
});
