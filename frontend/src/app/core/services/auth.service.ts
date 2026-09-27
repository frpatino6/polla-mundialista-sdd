import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  ForgotPasswordResultDto,
  LoginResultDto,
  ResetPasswordResultDto,
  Session,
  UserDto,
  UserRole,
} from '../models/auth.models';
import { ApiService } from './api.service';

const SESSION_STORAGE_KEY = 'polla_session';

/**
 * Estado de sesión expuesto vía RxJS BehaviorSubject (decisión de docs/design.md §5:
 * no se usan Signals para este estado). El login persiste en localStorage exactamente
 * lo que devuelve LoginResultDto (token, userId, email, role) y esa sesión se restaura
 * al recargar la página.
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends ApiService {
  private readonly router = inject(Router);
  private readonly sessionSubject = new BehaviorSubject<Session | null>(this.restoreSession());

  /** Observable del estado de sesión actual (null si no hay usuario logueado). */
  readonly currentUser$: Observable<Session | null> = this.sessionSubject.asObservable();

  get currentUser(): Session | null {
    return this.sessionSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.sessionSubject.value !== null;
  }

  get role(): UserRole | null {
    return this.sessionSubject.value?.role ?? null;
  }

  get token(): string | null {
    return this.sessionSubject.value?.token ?? null;
  }

  register(email: string, password: string): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.baseUrl}/api/auth/register`, { email, password });
  }

  login(email: string, password: string): Observable<LoginResultDto> {
    return this.http
      .post<LoginResultDto>(`${this.baseUrl}/api/auth/login`, { email, password })
      .pipe(tap((result) => this.saveSession(result)));
  }

  /**
   * Solicita el envío del enlace de recuperación. El backend responde siempre
   * con el mismo 200 y el mismo mensaje genérico exista o no el email
   * (anti-enumeración, docs/design.md §7.2): este método no debe agregar
   * ninguna lógica que distinga ambos casos.
   */
  forgotPassword(email: string): Observable<ForgotPasswordResultDto> {
    return this.http.post<ForgotPasswordResultDto>(`${this.baseUrl}/api/auth/forgot-password`, {
      email,
    });
  }

  /**
   * Consume el token de reseteo y fija la nueva contraseña. El backend devuelve
   * 400 con un mensaje de dominio (token inválido / expirado / ya consumido)
   * que el componente muestra tal cual, sin reinterpretarlo.
   */
  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResultDto> {
    return this.http.post<ResetPasswordResultDto>(`${this.baseUrl}/api/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  /**
   * Limpia la sesión y navega a /login. Se centraliza la navegación aquí (en vez
   * de en cada componente que llama logout()) porque los guards (authGuard/adminGuard)
   * solo se ejecutan al ACTIVAR una ruta: si solo se limpia el estado sin navegar,
   * el usuario queda "colgado" en la pantalla actual con datos obsoletos hasta que
   * navega manualmente a otro lado.
   */
  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionSubject.next(null);
    this.router.navigateByUrl('/login');
  }

  private saveSession(result: LoginResultDto): void {
    const session: Session = {
      token: result.token,
      userId: result.userId,
      email: result.email,
      role: result.role,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private restoreSession(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
}
