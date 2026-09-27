import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authServiceSpy: { register: ReturnType<typeof vi.fn> };
  let router: Router;

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

    expect(component.errorMessage()).toBe('El email ya está registrado.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
