import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ResetPassword } from './reset-password';
import { RESET_PASSWORD_COPY } from './reset-password.copy';

// Mensajes tal como los devuelve la API (confirmación y errores de dominio del token,
// docs/design.md §7.2): son copy del servidor, no de la interfaz, por eso viven aquí y no en
// RESET_PASSWORD_COPY.
const serverSuccess = 'Contraseña actualizada correctamente.';
const serverInvalidToken = 'El token de reseteo no es válido.';
const serverExpiredToken = 'El token de reseteo expiró.';
const serverConsumedToken = 'El token de reseteo ya fue utilizado.';

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
    authServiceSpy.resetPassword.mockReturnValue(of({ message: serverSuccess }));
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('valid-token', 'newSecret123');
    expect(component.successMessage()).toBe(serverSuccess);
    expect(host().querySelector('[role="status"]')?.textContent).toContain(serverSuccess);
    expect(host().querySelector('form')).toBeNull();
    expect(host().querySelector('a[routerLink="/login"]')?.textContent).toContain(
      RESET_PASSWORD_COPY.success.cta,
    );
  });

  it('shows the domain error for an invalid token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: serverInvalidToken } })),
    );
    component.form.setValue({ token: 'bad-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(serverInvalidToken);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(serverInvalidToken);
  });

  it('shows the domain error for an expired token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: serverExpiredToken } })),
    );
    component.form.setValue({ token: 'expired-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(serverExpiredToken);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(serverExpiredToken);
  });

  it('shows the domain error for an already-consumed token', () => {
    authServiceSpy.resetPassword.mockReturnValue(
      throwError(() => ({ error: { message: serverConsumedToken } })),
    );
    component.form.setValue({ token: 'consumed-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(serverConsumedToken);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(serverConsumedToken);
  });

  it('falls back to the copy error message when the API error carries no message', () => {
    authServiceSpy.resetPassword.mockReturnValue(throwError(() => ({})));
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.errorMessage()).toBe(RESET_PASSWORD_COPY.errors.fallback);
    expect(host().querySelector('[role="alert"]')?.textContent).toContain(
      RESET_PASSWORD_COPY.errors.fallback,
    );
  });

  it('toggles the password visibility without submitting the form', () => {
    component.form.setValue({ token: 'valid-token', newPassword: 'newSecret123' });
    fixture.detectChanges();

    const input = host().querySelector('#newPassword') as HTMLInputElement;
    expect(input.type).toBe('password');

    (
      host().querySelector(
        `[aria-label="${RESET_PASSWORD_COPY.actions.showPassword}"]`,
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    const hideToggle = host().querySelector(
      `[aria-label="${RESET_PASSWORD_COPY.actions.hidePassword}"]`,
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
    expect(button.textContent).toContain(RESET_PASSWORD_COPY.actions.submitting);
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

    expect(link?.textContent).toContain(RESET_PASSWORD_COPY.rememberedPassword.cta);
  });

  it('renders the RESET_PASSWORD_COPY texts keeping every accessible label attached to its control', () => {
    const heading = host().querySelector('h1') as HTMLElement;
    const brand = host().querySelector('p.uppercase') as HTMLElement;
    const tokenLabel = host().querySelector('label[for="token"]') as HTMLLabelElement;
    const passwordLabel = host().querySelector('label[for="newPassword"]') as HTMLLabelElement;
    const token = host().querySelector('#token') as HTMLInputElement;
    const newPassword = host().querySelector('#newPassword') as HTMLInputElement;

    expect(heading.textContent?.trim()).toBe(RESET_PASSWORD_COPY.title);
    expect(brand.textContent?.trim()).toBe(RESET_PASSWORD_COPY.brand);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      RESET_PASSWORD_COPY.subtitle,
    );
    expect(tokenLabel.textContent?.trim()).toBe(RESET_PASSWORD_COPY.fields.token.label);
    expect(passwordLabel.textContent?.trim()).toBe(RESET_PASSWORD_COPY.fields.newPassword.label);
    expect(token.getAttribute('placeholder')).toBe(RESET_PASSWORD_COPY.fields.token.placeholder);
    expect(newPassword.getAttribute('placeholder')).toBe(
      RESET_PASSWORD_COPY.fields.newPassword.placeholder,
    );
    expect((host().querySelector('button[type="submit"]') as HTMLElement).textContent?.trim()).toBe(
      RESET_PASSWORD_COPY.actions.submit,
    );
    expect((host().querySelector('p.mt-6') as HTMLElement).textContent?.trim()).toBe(
      `${RESET_PASSWORD_COPY.rememberedPassword.prompt} ${RESET_PASSWORD_COPY.rememberedPassword.cta}`,
    );

    expect(tokenLabel.getAttribute('for')).toBe(token.getAttribute('id'));
    expect(passwordLabel.getAttribute('for')).toBe(newPassword.getAttribute('id'));
  });

  it('renders the field validation messages from the copy', () => {
    component.form.setValue({ token: '', newPassword: 'short' });
    component.submit();
    fixture.detectChanges();

    expect(host().querySelector('#token-error')?.textContent?.trim()).toBe(
      RESET_PASSWORD_COPY.errors.token,
    );
    expect(host().querySelector('#newPassword-error')?.textContent?.trim()).toBe(
      RESET_PASSWORD_COPY.errors.newPassword,
    );
  });
});
