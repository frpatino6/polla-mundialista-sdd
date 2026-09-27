import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminGuard, roleGuard } from './role.guard';

describe('roleGuard / adminGuard', () => {
  function runAdminGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as
      | boolean
      | UrlTree;
  }

  it('allows navigation when the user has the required role', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: true, role: 'Admin' } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    expect(runAdminGuard()).toBe(true);
  });

  it('redirects to /login when there is no active session', () => {
    const fakeUrlTree = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: false, role: null } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    expect(runAdminGuard()).toBe(fakeUrlTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to /predictions when the role does not match', () => {
    const fakeUrlTree = {} as UrlTree;
    const createUrlTree = vi.fn().mockReturnValue(fakeUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: true, role: 'User' } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    expect(runAdminGuard()).toBe(fakeUrlTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/predictions']);
  });

  it('roleGuard() builds a guard for any given role', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: true, role: 'User' } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    const guard = roleGuard('User');
    const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));

    expect(result).toBe(true);
  });
});
