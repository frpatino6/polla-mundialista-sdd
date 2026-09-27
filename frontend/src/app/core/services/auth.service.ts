import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginResultDto, Session, UserDto, UserRole } from '../models/auth.models';
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

  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionSubject.next(null);
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
