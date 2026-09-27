import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);

  readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    // El enlace real de recuperación llega con el token en la query string
    // (?token=...); se precarga en el campo para que el usuario no deba
    // copiarlo a mano desde el correo/consola.
    const tokenFromUrl = this.route.snapshot.queryParamMap.get('token');
    if (tokenFromUrl) {
      this.form.controls.token.setValue(tokenFromUrl);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { token, newPassword } = this.form.getRawValue();

    this.authService.resetPassword(token, newPassword).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.successMessage.set(result.message);
      },
      error: (err) => {
        this.submitting.set(false);
        // El backend devuelve 400 con el mensaje de dominio exacto (token inválido,
        // expirado o ya consumido, docs/design.md §7.2): se muestra tal cual, sin
        // reinterpretarlo aquí.
        this.errorMessage.set(err?.error?.message ?? 'No se pudo restablecer la contraseña.');
      },
    });
  }
}
