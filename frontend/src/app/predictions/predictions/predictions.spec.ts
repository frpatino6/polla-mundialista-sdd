import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import {
  MatchDto,
  PredictionDto,
  PredictionHistoryEntryDto,
} from '../../core/models/predictions.models';
import { PredictionsService } from '../../core/services/predictions.service';
import { Predictions } from './predictions';

/** "Ahora" fijo para que el guard de horario sea determinístico en los tests. */
const NOW = new Date('2026-06-10T12:00:00Z');

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

describe('Predictions', () => {
  let matchesServiceMock: { getMatches: ReturnType<typeof vi.fn> };
  let predictionsServiceMock: {
    getMyHistory: ReturnType<typeof vi.fn>;
    registerPrediction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(
    matches: MatchDto[],
    history: PredictionHistoryEntryDto[] = [],
    role: 'User' | 'Admin' | null = null,
  ) {
    matchesServiceMock = { getMatches: vi.fn().mockReturnValue(of(matches)) };
    predictionsServiceMock = {
      getMyHistory: vi.fn().mockReturnValue(of(history)),
      registerPrediction: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: MatchesService, useValue: matchesServiceMock },
        { provide: PredictionsService, useValue: predictionsServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: { email: 'user@example.com' }, role, logout: vi.fn() },
        },
      ],
    });

    const fixture = TestBed.createComponent(Predictions);
    fixture.detectChanges();
    return fixture;
  }

  it('loads matches grouped by group A/B and calls both services on init', () => {
    const matchA = createMatch({ id: 'match-a', group: 'A' });
    const matchB = createMatch({ id: 'match-b', group: 'B' });
    const fixture = setup([matchA, matchB]);
    const component = fixture.componentInstance;

    expect(matchesServiceMock.getMatches).toHaveBeenCalled();
    expect(predictionsServiceMock.getMyHistory).toHaveBeenCalled();

    const sections = component.sections();
    expect(sections.find((s) => s.group === 'A')?.matches.map((m) => m.match.id)).toEqual([
      'match-a',
    ]);
    expect(sections.find((s) => s.group === 'B')?.matches.map((m) => m.match.id)).toEqual([
      'match-b',
    ]);
  });

  it('guard de horario: disables the form for a match whose kickoff is in the past', () => {
    const pastMatch = createMatch({ id: 'past-match', kickoffAt: '2026-06-10T10:00:00Z' });
    const fixture = setup([pastMatch]);
    const component = fixture.componentInstance;

    const vm = component
      .sections()
      .flatMap((s) => s.matches)
      .find((m) => m.match.id === 'past-match')!;

    expect(vm.locked).toBe(true);
    expect(vm.form.disabled).toBe(true);
  });

  it('guard de horario: keeps the form enabled for a match whose kickoff is in the future', () => {
    const futureMatch = createMatch({ id: 'future-match', kickoffAt: '2026-06-15T18:00:00Z' });
    const fixture = setup([futureMatch]);
    const component = fixture.componentInstance;

    const vm = component
      .sections()
      .flatMap((s) => s.matches)
      .find((m) => m.match.id === 'future-match')!;

    expect(vm.locked).toBe(false);
    expect(vm.form.disabled).toBe(false);
  });

  it('guard de horario: rejects submit for an already-started match without calling the service', () => {
    const pastMatch = createMatch({ id: 'past-match', kickoffAt: '2026-06-10T10:00:00Z' });
    const fixture = setup([pastMatch]);
    const vm = fixture.componentInstance.sections()[0].matches[0];

    fixture.componentInstance.submit(vm);

    expect(predictionsServiceMock.registerPrediction).not.toHaveBeenCalled();
  });

  it('prefills the form with an existing prediction and submits the updated payload', () => {
    const match = createMatch({ id: 'match-1' });
    const history: PredictionHistoryEntryDto[] = [
      {
        matchId: 'match-1',
        homeTeam: 'Colombia',
        awayTeam: 'Brasil',
        predictedHomeScore: 1,
        predictedAwayScore: 1,
        actualHomeScore: null,
        actualAwayScore: null,
        pointsAwarded: 0,
      },
    ];
    const fixture = setup([match], history);
    const vm = fixture.componentInstance.sections()[0].matches[0];

    expect(vm.form.getRawValue()).toEqual({ homeScore: 1, awayScore: 1 });

    vm.form.setValue({ homeScore: 2, awayScore: 0 });

    const responseDto: PredictionDto = {
      id: 'prediction-1',
      userId: 'user-1',
      matchId: 'match-1',
      predictedHomeScore: 2,
      predictedAwayScore: 0,
      pointsAwarded: 0,
    };
    predictionsServiceMock.registerPrediction.mockReturnValue(of(responseDto));

    fixture.componentInstance.submit(vm);

    expect(predictionsServiceMock.registerPrediction).toHaveBeenCalledWith('match-1', 2, 0);
    expect(vm.savedMessage).toBe('Predicción guardada.');
    expect(vm.existingPrediction?.predictedHomeScore).toBe(2);
    expect(vm.existingPrediction?.predictedAwayScore).toBe(0);
  });

  it('shows an inline error and locks the form when the backend responds 409 (client/server clock drift)', () => {
    const match = createMatch({ id: 'match-1' });
    const fixture = setup([match]);
    const vm = fixture.componentInstance.sections()[0].matches[0];

    predictionsServiceMock.registerPrediction.mockReturnValue(
      throwError(() => ({ status: 409, error: { message: 'El partido ya inició.' } })),
    );

    fixture.componentInstance.submit(vm);

    expect(vm.errorMessage).toBe('El partido ya inició.');
    expect(vm.locked).toBe(true);
    expect(vm.form.disabled).toBe(true);
  });

  it('exposes isAdmin=true (and shows the Panel Admin link) for an Admin session', () => {
    const fixture = setup([createMatch()], [], 'Admin');

    expect(fixture.componentInstance.isAdmin).toBe(true);
    const adminLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[routerLink="/admin"]');
    expect(adminLink).not.toBeNull();
  });

  it('hides the Panel Admin link for a non-Admin session', () => {
    const fixture = setup([createMatch()], [], 'User');

    expect(fixture.componentInstance.isAdmin).toBe(false);
    const adminLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[routerLink="/admin"]');
    expect(adminLink).toBeNull();
  });

  it('always shows the Leaderboard and Mi Historial links, regardless of role', () => {
    const fixture = setup([createMatch()], [], 'User');

    expect(fixture.nativeElement.querySelector('a[routerLink="/leaderboard"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[routerLink="/history"]')).not.toBeNull();
  });
});
