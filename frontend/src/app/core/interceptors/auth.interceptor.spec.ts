import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  function configure(token: string | null): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token } },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('attaches the Authorization header when there is a token', () => {
    configure('jwt-token');

    httpClient.get('/api/matches').subscribe();

    const req = httpMock.expectOne('/api/matches');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('does not attach the Authorization header when there is no session', () => {
    configure(null);

    httpClient.get('/api/matches').subscribe();

    const req = httpMock.expectOne('/api/matches');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
