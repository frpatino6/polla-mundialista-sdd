import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoginResultDto, Session, UserDto } from '../models/auth.models';
import { AuthService } from './auth.service';

const SESSION_STORAGE_KEY = 'polla_session';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('starts with no session when localStorage is empty', () => {
    expect(service.isAuthenticated).toBe(false);
    expect(service.currentUser).toBeNull();
    expect(service.role).toBeNull();
  });

  it('login() POSTs credentials, stores the session and updates state', () => {
    const loginResult: LoginResultDto = {
      token: 'jwt-token',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'User',
    };

    service.login('user@example.com', 'secret123').subscribe((result) => {
      expect(result).toEqual(loginResult);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com', password: 'secret123' });
    req.flush(loginResult);

    expect(service.isAuthenticated).toBe(true);
    expect(service.currentUser?.email).toBe('user@example.com');
    expect(service.role).toBe('User');
    expect(service.token).toBe('jwt-token');

    const stored = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as Session;
    expect(stored).toEqual({
      token: 'jwt-token',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'User',
    });
  });

  it('register() POSTs credentials and does not change session state', () => {
    const userDto: UserDto = { id: 'user-2', email: 'new@example.com', role: 'User' };

    service.register('new@example.com', 'secret123').subscribe((result) => {
      expect(result).toEqual(userDto);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@example.com', password: 'secret123' });
    req.flush(userDto);

    expect(service.isAuthenticated).toBe(false);
  });

  it('logout() clears the session from state and localStorage', () => {
    const loginResult: LoginResultDto = {
      token: 'jwt-token',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'Admin',
    };

    service.login('user@example.com', 'secret123').subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/api/auth/login`).flush(loginResult);
    expect(service.isAuthenticated).toBe(true);

    service.logout();

    expect(service.isAuthenticated).toBe(false);
    expect(service.currentUser).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('restores an existing session from localStorage on construction', () => {
    const session: Session = {
      token: 'stored-token',
      userId: 'user-3',
      email: 'stored@example.com',
      role: 'Admin',
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const restoredService = TestBed.inject(AuthService);

    expect(restoredService.isAuthenticated).toBe(true);
    expect(restoredService.currentUser).toEqual(session);
    expect(restoredService.role).toBe('Admin');
  });
});
