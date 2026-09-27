import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import {
  MATCH_GROUP_LABELS,
  MatchDto,
  PredictionDto,
  PredictionHistoryEntryDto,
} from '../../core/models/predictions.models';
import { PredictionsService } from '../../core/services/predictions.service';
import { Predictions } from './predictions';
import { PREDICTIONS_COPY } from './predictions.copy';

/** "Ahora" fijo para que el guard de horario sea determinístico en los tests. */
const NOW = new Date('2026-06-10T12:00:00Z');

// Mensaje tal como lo devuelve la API en el 409 de kickoff: es copy del servidor,
// no de la interfaz, por eso vive acá y no en PREDICTIONS_COPY.
const serverKickoffConflict = 'El partido ya inició.';

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
    load: 'ok' | 'pending' | 'error' = 'ok',
  ) {
    const matches$ =
      load === 'error'
        ? throwError(() => ({ status: 500 }))
        : load === 'pending'
          ? NEVER
          : of(matches);
    matchesServiceMock = { getMatches: vi.fn().mockReturnValue(matches$) };
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
    expect(vm.savedMessage).toBe(PREDICTIONS_COPY.feedback.saved);
    expect(vm.existingPrediction?.predictedHomeScore).toBe(2);
    expect(vm.existingPrediction?.predictedAwayScore).toBe(0);
  });

  it('shows an inline error and locks the form when the backend responds 409 (client/server clock drift)', () => {
    const match = createMatch({ id: 'match-1' });
    const fixture = setup([match]);
    const vm = fixture.componentInstance.sections()[0].matches[0];

    predictionsServiceMock.registerPrediction.mockReturnValue(
      throwError(() => ({ status: 409, error: { message: serverKickoffConflict } })),
    );

    fixture.componentInstance.submit(vm);

    expect(vm.errorMessage).toBe(serverKickoffConflict);
    expect(vm.locked).toBe(true);
    expect(vm.form.disabled).toBe(true);
  });

  it('falls back to the PREDICTIONS_COPY error messages when the API error carries no message', () => {
    const conflict = setup([createMatch()]);
    const conflictVm = conflict.componentInstance.sections()[0].matches[0];

    predictionsServiceMock.registerPrediction.mockReturnValue(throwError(() => ({ status: 409 })));
    conflict.componentInstance.submit(conflictVm);
    conflict.detectChanges();

    expect(conflictVm.errorMessage).toBe(PREDICTIONS_COPY.feedback.kickoffConflict);
    expect(conflictVm.locked).toBe(true);
    expect(
      (conflict.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain(PREDICTIONS_COPY.feedback.kickoffConflict);

    TestBed.resetTestingModule();
    const generic = setup([createMatch()]);
    const genericVm = generic.componentInstance.sections()[0].matches[0];

    predictionsServiceMock.registerPrediction.mockReturnValue(throwError(() => ({})));
    generic.componentInstance.submit(genericVm);
    generic.detectChanges();

    expect(genericVm.errorMessage).toBe(PREDICTIONS_COPY.feedback.saveError);
    expect(
      (generic.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain(PREDICTIONS_COPY.feedback.saveError);
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
    expect(tabs[0].textContent).toContain(MATCH_GROUP_LABELS.A);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].textContent).toContain(MATCH_GROUP_LABELS.B);
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
    expect(badge?.textContent).toContain(PREDICTIONS_COPY.match.status.points(3));
    expect(root.textContent).toContain(PREDICTIONS_COPY.match.result(2, 1));
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
    expect(root.querySelector('[data-status="awaiting"]')?.textContent).toContain(
      PREDICTIONS_COPY.match.status.awaiting,
    );

    TestBed.resetTestingModule();
    const pendingRoot = setup([createMatch()]).nativeElement as HTMLElement;
    expect(pendingRoot.querySelector('[data-status="pending"]')?.textContent).toContain(
      PREDICTIONS_COPY.match.status.pending,
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
    expect(root.textContent).toContain(PREDICTIONS_COPY.feedback.locked);
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
    expect(feedback?.textContent).toContain(PREDICTIONS_COPY.feedback.saved);
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

    fixture.detectChanges();
    expect(button.textContent).toContain(PREDICTIONS_COPY.actions.saving);

    response$.next({
      id: 'prediction-1',
      userId: 'user-1',
      matchId: 'match-1',
      predictedHomeScore: 2,
      predictedAwayScore: 0,
      pointsAwarded: 0,
    } satisfies PredictionDto);
    fixture.detectChanges();

    expect(root.querySelector('.saved-feedback')?.textContent).toContain(
      PREDICTIONS_COPY.feedback.saved,
    );
  });

  it('renders the PREDICTIONS_COPY texts keeping every accessible label attached to its control', () => {
    const fixture = setup([createMatch({ homeTeam: 'Colombia', awayTeam: 'Brasil' })]);
    const root = fixture.nativeElement as HTMLElement;

    const heading = root.querySelector('h1') as HTMLElement;
    expect(heading.textContent?.trim()).toBe(PREDICTIONS_COPY.title);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      PREDICTIONS_COPY.subtitle,
    );

    const tablist = root.querySelector('[role="tablist"]') as HTMLElement;
    expect(tablist.getAttribute('aria-label')).toBe(PREDICTIONS_COPY.groups.ariaLabel);

    const tabs = root.querySelectorAll('[role="tab"]');
    expect(tabs[0].textContent).toContain(MATCH_GROUP_LABELS.A);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].textContent).toContain(MATCH_GROUP_LABELS.B);
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');

    const homeLabel = root.querySelector('label[for="score-home-match-1"]') as HTMLLabelElement;
    const awayLabel = root.querySelector('label[for="score-away-match-1"]') as HTMLLabelElement;
    expect(homeLabel.textContent?.trim()).toBe(PREDICTIONS_COPY.match.goalsFor('Colombia'));
    expect(awayLabel.textContent?.trim()).toBe(PREDICTIONS_COPY.match.goalsFor('Brasil'));
    expect(homeLabel.getAttribute('for')).toBe(
      (root.querySelector('#score-home-match-1') as HTMLElement).getAttribute('id'),
    );
    expect(awayLabel.getAttribute('for')).toBe(
      (root.querySelector('#score-away-match-1') as HTMLElement).getAttribute('id'),
    );

    expect(
      (root.querySelector('span.uppercase[aria-hidden="true"]') as HTMLElement).textContent?.trim(),
    ).toBe(PREDICTIONS_COPY.match.vs);
    expect(
      (root.querySelector('button[type="submit"]') as HTMLButtonElement).textContent?.trim(),
    ).toBe(PREDICTIONS_COPY.actions.save);
    expect((root.querySelector('[data-status="pending"]') as HTMLElement).textContent?.trim()).toBe(
      PREDICTIONS_COPY.match.status.pending,
    );
  });

  it('renders the PREDICTIONS_COPY texts of the loading, error and empty states', () => {
    const loadingRoot = setup([], [], null, 'pending').nativeElement as HTMLElement;
    expect(loadingRoot.textContent).toContain(PREDICTIONS_COPY.states.loading);

    TestBed.resetTestingModule();
    const errorRoot = setup([], [], null, 'error').nativeElement as HTMLElement;
    expect(errorRoot.querySelector('[role="alert"]')?.textContent).toContain(
      PREDICTIONS_COPY.states.loadError,
    );

    TestBed.resetTestingModule();
    const emptyRoot = setup([createMatch({ id: 'match-b', group: 'B' })])
      .nativeElement as HTMLElement;
    expect(emptyRoot.textContent).toContain(PREDICTIONS_COPY.states.empty);
  });
});
