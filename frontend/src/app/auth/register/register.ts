import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { REGISTER_COPY } from './register.copy';

// Validador a nivel de grupo (no en el control individual): compara password/confirmPassword
// y marca el error `mismatch` en confirmPassword solo cuando este ya tiene algo escrito, para
// no mostrar "no coinciden" mientras el campo sigue vacío (docs/design.md §5.1).
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password');
  const confirmPassword = group.get('confirmPassword');
  if (!password || !confirmPassword) {
    return null;
  }

  const hasMismatch = !!confirmPassword.value && password.value !== confirmPassword.value;
  const { mismatch, ...otherErrors } = confirmPassword.errors ?? {};

  if (hasMismatch) {
    confirmPassword.setErrors({ ...otherErrors, mismatch: true });
    return { mismatch: true };
  }

  if (mismatch) {
    confirmPassword.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  }

  return null;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly copy = REGISTER_COPY;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    // Registro exitoso navega a /login (no auto-login): mantiene el flujo de
    // autenticación explícito y simétrico con el LoginResultDto real del backend.
    this.authService.register(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? REGISTER_COPY.errors.fallback);
      },
    });
  }
}
