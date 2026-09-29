import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Register } from './register';
import { REGISTER_COPY } from './register.copy';

// Mensaje tal como lo devuelve la API cuando el email ya existe: es copy del servidor,
// no de la interfaz, por eso vive aquí y no en REGISTER_COPY.
const serverError = 'El email ya está registrado.';

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
    component.form.setValue({ email: 'not-an-email', password: '', confirmPassword: '' });

    component.submit();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('calls AuthService.register and navigates to /login on success', () => {
    authServiceSpy.register.mockReturnValue(
      of({ id: 'u1', email: 'new@example.com', role: 'User' }),
    );
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });

    component.submit();

    expect(authServiceSpy.register).toHaveBeenCalledWith('new@example.com', 'secret123');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('shows an error message when registration fails', () => {
    authServiceSpy.register.mockReturnValue(
      throwError(() => ({ error: { message: serverError } })),
    );
    component.form.setValue({
      email: 'dup@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(serverError);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(serverError);
  });

  it('falls back to the copy error message when the API error carries no message', () => {
    authServiceSpy.register.mockReturnValue(throwError(() => ({})));
    component.form.setValue({
      email: 'dup@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(REGISTER_COPY.errors.fallback);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      REGISTER_COPY.errors.fallback,
    );
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.detectChanges();

    const input = host().querySelector('#password') as HTMLInputElement;
    expect(input.type).toBe('password');

    (
      host().querySelector(
        `[aria-label="${REGISTER_COPY.actions.showPassword}"]`,
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    const hideToggle = host().querySelector(
      `[aria-label="${REGISTER_COPY.actions.hidePassword}"]`,
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
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });

    component.submit();
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain(REGISTER_COPY.actions.submitting);
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

    component.form.setValue({ email: 'not-an-email', password: '', confirmPassword: '' });
    component.submit();
    fixture.detectChanges();

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('email-error');
    expect(host().querySelector('#email-error')).toBeTruthy();
  });

  it('renders the REGISTER_COPY texts keeping every accessible label attached to its control', () => {
    const heading = host().querySelector('h1') as HTMLElement;
    const brand = host().querySelector('p.uppercase') as HTMLElement;
    const emailLabel = host().querySelector('label[for="email"]') as HTMLLabelElement;
    const passwordLabel = host().querySelector('label[for="password"]') as HTMLLabelElement;

    expect(heading.textContent?.trim()).toBe(REGISTER_COPY.title);
    expect(brand.textContent?.trim()).toBe(REGISTER_COPY.brand);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      REGISTER_COPY.subtitle,
    );
    expect(emailLabel.textContent?.trim()).toBe(REGISTER_COPY.fields.email.label);
    expect(passwordLabel.textContent?.trim()).toBe(REGISTER_COPY.fields.password.label);
    expect((host().querySelector('#email') as HTMLInputElement).getAttribute('placeholder')).toBe(
      REGISTER_COPY.fields.email.placeholder,
    );
    expect(
      (host().querySelector('#password') as HTMLInputElement).getAttribute('placeholder'),
    ).toBe(REGISTER_COPY.fields.password.placeholder);
    expect((host().querySelector('button[type="submit"]') as HTMLElement).textContent?.trim()).toBe(
      REGISTER_COPY.actions.submit,
    );
    expect((host().querySelector('p.mt-6') as HTMLElement).textContent?.trim()).toBe(
      `${REGISTER_COPY.hasAccount.prompt} ${REGISTER_COPY.hasAccount.cta}`,
    );

    expect(emailLabel.getAttribute('for')).toBe(
      (host().querySelector('#email') as HTMLElement).getAttribute('id'),
    );
    expect(passwordLabel.getAttribute('for')).toBe(
      (host().querySelector('#password') as HTMLElement).getAttribute('id'),
    );
  });

  it('renders the field validation messages from the copy', () => {
    component.form.setValue({ email: 'not-an-email', password: '', confirmPassword: '' });
    component.submit();
    fixture.detectChanges();

    expect(host().querySelector('#email-error')?.textContent?.trim()).toBe(
      REGISTER_COPY.errors.email,
    );
    expect(host().querySelector('#password-error')?.textContent?.trim()).toBe(
      REGISTER_COPY.errors.password,
    );
  });

  it('does not render the login-only recovery affordances', () => {
    expect(host().querySelector('#remember-me')).toBeNull();
    expect(host().querySelector('[aria-disabled="true"]')).toBeNull();
    expect(host().querySelector('a[href*="forgot-password"]')).toBeNull();
  });

  it('requires confirmPassword and renders its accessible label', () => {
    expect(host().querySelector('label[for="confirmPassword"]')).toBeTruthy();
    expect(component.form.controls.confirmPassword.hasValidator(Validators.required)).toBe(true);

    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: '',
    });

    expect(component.form.controls.confirmPassword.hasError('required')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('marks the form invalid when confirmPassword does not match password', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'different1',
    });

    expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(true);
    expect(component.form.invalid).toBe(true);
  });

  it('marks the form valid when confirmPassword matches password', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });

    expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(false);
    expect(component.form.valid).toBe(true);
  });

  it('does not flag a mismatch while confirmPassword is still empty', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: '',
    });

    expect(component.form.controls.confirmPassword.hasError('mismatch')).toBe(false);
  });

  it('shows the mismatch error message and hides it once the passwords match', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'different1',
    });
    component.form.controls.confirmPassword.markAsTouched();
    fixture.detectChanges();

    const errorEl = host().querySelector('#confirmPassword-error');
    expect(errorEl?.textContent?.trim()).toBe(REGISTER_COPY.errors.confirmPassword.mismatch);

    component.form.controls.confirmPassword.setValue('secret123');
    fixture.detectChanges();

    expect(host().querySelector('#confirmPassword-error')).toBeNull();
  });

  it('disables the submit button while confirmPassword does not match', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'different1',
    });
    fixture.detectChanges();

    const button = host().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.form.invalid).toBe(true);

    component.form.controls.confirmPassword.setValue('secret123');
    fixture.detectChanges();

    expect(component.form.valid).toBe(true);
    expect(button.disabled).toBe(false);
  });

  it('toggles the confirmPassword visibility independently from the password field', () => {
    component.form.setValue({
      email: 'new@example.com',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.detectChanges();

    const passwordInput = host().querySelector('#password') as HTMLInputElement;
    const confirmInput = host().querySelector('#confirmPassword') as HTMLInputElement;
    expect(confirmInput.type).toBe('password');
    expect(confirmInput.getAttribute('autocomplete')).toBe('new-password');

    (
      host().querySelector(
        `[aria-label="${REGISTER_COPY.actions.showConfirmPassword}"]`,
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(confirmInput.type).toBe('text');
    expect(passwordInput.type).toBe('password');
    const hideToggle = host().querySelector(
      `[aria-label="${REGISTER_COPY.actions.hideConfirmPassword}"]`,
    ) as HTMLButtonElement;
    expect(hideToggle.getAttribute('aria-pressed')).toBe('true');
  });
});
