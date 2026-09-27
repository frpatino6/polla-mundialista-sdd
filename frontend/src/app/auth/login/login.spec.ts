import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authServiceSpy: { login: ReturnType<typeof vi.fn> };
  let router: Router;

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
    await fixture.whenStable();
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

    expect(component.errorMessage()).toBe('Credenciales inválidas.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
