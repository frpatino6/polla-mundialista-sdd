import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminService } from '../../core/services/admin.service';
import { MatchesService } from '../../core/services/matches.service';
import { MatchDto } from '../../core/models/predictions.models';
import { AdminMatches } from './admin-matches';

function createMatch(overrides: Partial<MatchDto> = {}): MatchDto {
  return {
    id: 'match-1',
    group: 'A',
    homeTeam: 'Colombia',
    awayTeam: 'Brasil',
    kickoffAt: '2026-06-15T18:00:00Z',
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

describe('AdminMatches', () => {
  let matchesServiceMock: { getMatches: ReturnType<typeof vi.fn> };
  let adminServiceMock: { submitMatchResult: ReturnType<typeof vi.fn> };

  function setup(matches: MatchDto[]) {
    matchesServiceMock = { getMatches: vi.fn().mockReturnValue(of(matches)) };
    adminServiceMock = { submitMatchResult: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MatchesService, useValue: matchesServiceMock },
        { provide: AdminService, useValue: adminServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(AdminMatches);
    fixture.detectChanges();
    return fixture;
  }

  it('loads matches on init and shows them via MatchesService', () => {
    const matchA = createMatch({ id: 'match-a', group: 'A' });
    const matchB = createMatch({ id: 'match-b', group: 'B', kickoffAt: '2026-06-16T18:00:00Z' });
    const fixture = setup([matchB, matchA]);
    const component = fixture.componentInstance;

    expect(matchesServiceMock.getMatches).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.matches().map((vm) => vm.match.id)).toEqual(['match-a', 'match-b']);
  });

  it('shows an inline error without breaking the screen when loading matches fails', () => {
    matchesServiceMock = { getMatches: vi.fn().mockReturnValue(throwError(() => new Error())) };
    adminServiceMock = { submitMatchResult: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MatchesService, useValue: matchesServiceMock },
        { provide: AdminService, useValue: adminServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(AdminMatches);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.loadError()).toBe(
      'No se pudieron cargar los partidos. Intenta nuevamente más tarde.',
    );
  });

  it('submits the form values and shows a success message, updating that row in place', () => {
    const match = createMatch({ id: 'match-1', homeScore: null, awayScore: null });
    const fixture = setup([match]);
    const vm = fixture.componentInstance.matches()[0];

    vm.form.setValue({ homeScore: 2, awayScore: 1 });

    const updatedMatch: MatchDto = { ...match, homeScore: 2, awayScore: 1 };
    adminServiceMock.submitMatchResult.mockReturnValue(of(updatedMatch));

    fixture.componentInstance.submit(vm);

    expect(adminServiceMock.submitMatchResult).toHaveBeenCalledWith('match-1', 2, 1);
    expect(vm.savedMessage).toBe('Resultado guardado. Puntos recalculados.');
    expect(vm.match.homeScore).toBe(2);
    expect(vm.match.awayScore).toBe(1);
    expect(fixture.componentInstance.matches()[0].match.homeScore).toBe(2);
  });

  it('shows an inline error and keeps the screen usable when the save call fails', () => {
    const match = createMatch({ id: 'match-1' });
    const fixture = setup([match]);
    const vm = fixture.componentInstance.matches()[0];

    vm.form.setValue({ homeScore: 2, awayScore: 1 });

    adminServiceMock.submitMatchResult.mockReturnValue(
      throwError(() => ({ status: 400, error: { message: 'Marcador inválido.' } })),
    );

    fixture.componentInstance.submit(vm);

    expect(vm.errorMessage).toBe('Marcador inválido.');
    expect(vm.saving).toBe(false);
    expect(vm.savedMessage).toBeNull();
  });
});
