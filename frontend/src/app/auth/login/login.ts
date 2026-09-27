import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);

  /**
   * "Recordarme" es únicamente visual: en el contrato de API vigente (docs/design.md §7)
   * no existe refresh token, el JWT expira y la sesión vive en localStorage (SESSION_STORAGE_KEY
   * en AuthService). Marcar la casilla no extiende ni renueva nada y no se envía a la API.
   * Se cablea recién cuando exista un mecanismo real de refresco; hoy persistir la preferencia
   * sin efecto sería un beacon de seguridad.
   */
  readonly rememberMe = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleRememberMe(event: Event): void {
    this.rememberMe.set((event.target as HTMLInputElement).checked);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/predictions']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Credenciales inválidas.');
      },
    });
  }
}
