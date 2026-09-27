import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FORGOT_PASSWORD_COPY } from './forgot-password.copy';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-forgot-password',
  styleUrl: './forgot-password.css',
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly copy = FORGOT_PASSWORD_COPY;

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { email } = this.form.getRawValue();

    this.authService.forgotPassword(email).subscribe({
      next: (result) => {
        this.submitting.set(false);
        // El backend responde SIEMPRE con este mismo mensaje genérico, exista o no
        // el email (anti-enumeración, docs/design.md §7.2). No se agrega ninguna
        // lógica aquí que distinga ambos casos.
        this.successMessage.set(result.message);
      },
      error: () => {
        this.submitting.set(false);
        // Solo llega aquí por una falla de red/servidor, nunca por "email no encontrado":
        // ese caso ya es un 200 con el mismo mensaje genérico manejado arriba.
        this.errorMessage.set(FORGOT_PASSWORD_COPY.errors.request);
      },
    });
  }
}
