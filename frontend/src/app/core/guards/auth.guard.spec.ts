import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('allows navigation when there is an active session', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: true } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    expect(runGuard()).toBe(true);
  });

  it('redirects to /login when there is no active session', () => {
    const fakeUrlTree = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: false } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = runGuard();

    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(fakeUrlTree);
  });
});
