import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
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

  it('opens on the Grupo A tab and only renders that group matches', () => {
    const matchA = createMatch({ id: 'match-a', group: 'A', awayTeam: 'Brasil' });
    const matchB = createMatch({ id: 'match-b', group: 'B', awayTeam: 'España' });
    const fixture = setup([matchA, matchB]);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(component.activeGroup()).toBe('A');
    expect(component.visibleMatches().map((m) => m.match.id)).toEqual(['match-a']);

    const tabs = root.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Grupo A');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].textContent).toContain('Grupo B');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');

    expect(root.querySelectorAll('article').length).toBe(1);
    expect(root.textContent).toContain('Brasil');
    expect(root.textContent).not.toContain('España');
    expect(root.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      tabs[0].id,
    );
  });

  it('renders the other group matches when switching tabs', () => {
    const matchA = createMatch({ id: 'match-a', group: 'A', awayTeam: 'Brasil' });
    const matchB = createMatch({ id: 'match-b', group: 'B', awayTeam: 'España' });
    const fixture = setup([matchA, matchB]);
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelectorAll('[role="tab"]')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.activeGroup()).toBe('B');
    expect(component.visibleMatches().map((m) => m.match.id)).toEqual(['match-b']);
    expect(root.textContent).toContain('España');
    expect(root.textContent).not.toContain('Brasil');

    const tabs = root.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      tabs[1].id,
    );
  });

  it('moves between tabs with arrow, Home and End keys', () => {
    const fixture = setup([
      createMatch({ id: 'match-a', group: 'A' }),
      createMatch({ id: 'match-b', group: 'B' }),
    ]);
    const component = fixture.componentInstance;
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    const press = (index: number, key: string): void => {
      tabs[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    };

    press(0, 'ArrowRight');
    expect(component.activeGroup()).toBe('B');

    press(1, 'ArrowRight');
    expect(component.activeGroup()).toBe('A');

    press(0, 'ArrowLeft');
    expect(component.activeGroup()).toBe('B');

    press(1, 'Home');
    expect(component.activeGroup()).toBe('A');

    press(0, 'End');
    expect(component.activeGroup()).toBe('B');
  });

  it('shows the emoji flag of a known team and falls back to initials for an unknown one', () => {
    // El fixture usa 'Colombia' (no está en TEAM_FLAGS) y 'Brasil' (sí).
    const fixture = setup([createMatch({ homeTeam: 'Colombia', awayTeam: 'Brasil' })]);
    const root = fixture.nativeElement as HTMLElement;

    const flag = root.querySelector('[data-team-flag]');
    expect(flag?.textContent?.trim()).toBe('🇧🇷');
    expect(flag?.getAttribute('aria-hidden')).toBe('true');

    const initials = root.querySelector('[data-team-initials]');
    expect(initials?.textContent?.trim()).toBe('CO');
    expect(root.textContent).toContain('Colombia');
  });

  it('marks a match with a green points badge when the prediction earned points', () => {
    const match = createMatch({ homeScore: 2, awayScore: 1 });
    const history: PredictionHistoryEntryDto[] = [
      {
        matchId: 'match-1',
        homeTeam: 'Colombia',
        awayTeam: 'Brasil',
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        actualHomeScore: 2,
        actualAwayScore: 1,
        pointsAwarded: 3,
      },
    ];
    const fixture = setup([match], history);
    const root = fixture.nativeElement as HTMLElement;

    const badge = root.querySelector('[data-status="earned"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('+3 pts');
    expect(root.textContent).toContain('Resultado: 2 - 1');
  });

  it('marks a saved prediction without result as awaiting, and a missing one as pending', () => {
    const history: PredictionHistoryEntryDto[] = [
      {
        matchId: 'match-1',
        homeTeam: 'Colombia',
        awayTeam: 'Brasil',
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        actualHomeScore: null,
        actualAwayScore: null,
        pointsAwarded: 0,
      },
    ];
    const root = setup([createMatch()], history).nativeElement as HTMLElement;
    expect(root.querySelector('[data-status="awaiting"]')).not.toBeNull();

    TestBed.resetTestingModule();
    const pendingRoot = setup([createMatch()]).nativeElement as HTMLElement;
    expect(pendingRoot.querySelector('[data-status="pending"]')?.textContent).toContain(
      'Pendiente',
    );
  });

  it('disables the save button and inputs of a match that already started', () => {
    const pastMatch = createMatch({ id: 'past-match', kickoffAt: '2026-06-10T10:00:00Z' });
    const fixture = setup([pastMatch]);
    const root = fixture.nativeElement as HTMLElement;

    const button = root.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    const inputs = [...root.querySelectorAll('input')] as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    expect(inputs.every((input) => input.disabled)).toBe(true);
    expect(root.textContent).toContain(
      'El partido ya inició; no se pueden registrar predicciones.',
    );
  });

  it('shows the saved feedback in the card after a successful submit', () => {
    const fixture = setup([createMatch()]);
    const component = fixture.componentInstance;
    const vm = component.sections()[0].matches[0];

    predictionsServiceMock.registerPrediction.mockReturnValue(
      of({
        id: 'prediction-1',
        userId: 'user-1',
        matchId: 'match-1',
        predictedHomeScore: 0,
        predictedAwayScore: 0,
        pointsAwarded: 0,
      } satisfies PredictionDto),
    );

    component.submit(vm);
    fixture.detectChanges();

    const feedback = (fixture.nativeElement as HTMLElement).querySelector('.saved-feedback');
    expect(feedback?.textContent).toContain('Predicción guardada.');
    expect(feedback?.querySelector('svg')).not.toBeNull();
  });

  it('sends the prediction when clicking the save button rendered in the DOM (the button belongs to the form)', () => {
    const fixture = setup([createMatch()]);
    const root = fixture.nativeElement as HTMLElement;
    const vm = fixture.componentInstance.sections()[0].matches[0];
    const response$ = new Subject<PredictionDto>();

    predictionsServiceMock.registerPrediction.mockReturnValue(response$);

    vm.form.setValue({ homeScore: 2, awayScore: 0 });
    fixture.detectChanges();

    const article = root.querySelector('article')!;
    const button = article.querySelector('button[type="submit"]') as HTMLButtonElement;

    // El botón tiene que ser submit *de este* form. Si queda en un <div> hermano,
    // el click no dispara ngSubmit: no se llama a la API ni se muestra feedback.
    expect(button.form).toBe(article.querySelector('form'));
    expect(button.disabled).toBe(false);

    button.click();

    expect(predictionsServiceMock.registerPrediction).toHaveBeenCalledWith('match-1', 2, 0);

    response$.next({
      id: 'prediction-1',
      userId: 'user-1',
      matchId: 'match-1',
      predictedHomeScore: 2,
      predictedAwayScore: 0,
      pointsAwarded: 0,
    } satisfies PredictionDto);
    fixture.detectChanges();

    expect(root.querySelector('.saved-feedback')?.textContent).toContain('Predicción guardada.');
  });
});
