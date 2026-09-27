import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { MatchesService } from '../../core/services/matches.service';
import { MATCH_GROUP_LABELS, MatchDto, TEAM_FLAGS } from '../../core/models/predictions.models';
import { AdminMatches } from './admin-matches';
import { ADMIN_MATCHES_COPY } from './admin-matches.copy';

// Mensaje tal como lo devuelve la API al rechazar un marcador: es copy del
// servidor, no de la interfaz, por eso vive acá y no en ADMIN_MATCHES_COPY.
const serverError = 'Marcador inválido.';

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

  /** El navbar necesita la sesión de AuthService para pintar avatar y links. */
  function configureProviders() {
    return [
      provideRouter([]),
      { provide: MatchesService, useValue: matchesServiceMock },
      { provide: AdminService, useValue: adminServiceMock },
      {
        provide: AuthService,
        useValue: { currentUser: { email: 'admin@example.com' }, role: 'Admin', logout: vi.fn() },
      },
    ];
  }

  function setup(matches: MatchDto[]) {
    matchesServiceMock = { getMatches: vi.fn().mockReturnValue(of(matches)) };
    adminServiceMock = { submitMatchResult: vi.fn() };

    TestBed.configureTestingModule({ providers: configureProviders() });

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

    TestBed.configureTestingModule({ providers: configureProviders() });

    const fixture = TestBed.createComponent(AdminMatches);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.loadError()).toBe(ADMIN_MATCHES_COPY.states.loadError);
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
    expect(vm.savedMessage).toBe(ADMIN_MATCHES_COPY.feedback.saved);
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
      throwError(() => ({ status: 400, error: { message: serverError } })),
    );

    fixture.componentInstance.submit(vm);

    expect(vm.errorMessage).toBe(serverError);
    expect(vm.saving).toBe(false);
    expect(vm.savedMessage).toBeNull();
  });

  it('sends the result when clicking the save button rendered in the DOM (the button belongs to the form)', () => {
    const match = createMatch({ id: 'match-1' });
    const fixture = setup([match]);
    const root = fixture.nativeElement as HTMLElement;
    const vm = fixture.componentInstance.matches()[0];
    const response$ = new Subject<MatchDto>();

    adminServiceMock.submitMatchResult.mockReturnValue(response$);

    vm.form.setValue({ homeScore: 2, awayScore: 1 });
    fixture.detectChanges();

    const article = root.querySelector('article')!;
    const button = article.querySelector('button[type="submit"]') as HTMLButtonElement;

    // El botón tiene que ser submit *de este* form. Si queda en un <div> hermano,
    // el click no dispara ngSubmit: no se llama a la API ni se muestra feedback.
    expect(button.form).toBe(article.querySelector('form'));
    expect(button.disabled).toBe(false);

    button.click();

    expect(adminServiceMock.submitMatchResult).toHaveBeenCalledWith('match-1', 2, 1);

    response$.next({ ...match, homeScore: 2, awayScore: 1 });
    fixture.detectChanges();

    const feedback = root.querySelector('.saved-feedback');
    expect(feedback?.textContent).toContain(ADMIN_MATCHES_COPY.feedback.saved);
    expect(feedback?.querySelector('svg')).not.toBeNull();
  });

  it('renderiza el navbar compartido con la navegación unificada', () => {
    const root = setup([createMatch()]).nativeElement as HTMLElement;

    expect(root.querySelector('app-navbar')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/predictions"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/leaderboard"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/history"]')).not.toBeNull();
  });

  it('muestra grupo, fecha, equipos con bandera y estado en cada tarjeta', () => {
    const fixture = setup([createMatch({ homeTeam: 'Colombia', awayTeam: 'Brasil' })]);
    const root = fixture.nativeElement as HTMLElement;

    const card = root.querySelector('article')!;
    expect(card.textContent).toContain(MATCH_GROUP_LABELS.A);
    expect(card.textContent).toContain('Colombia');
    expect(card.textContent).toContain('Brasil');
    // 'Brasil' está en TEAM_FLAGS, 'Colombia' cae al badge de iniciales.
    expect(card.querySelector('[data-team-flag]')?.textContent?.trim()).toBe(TEAM_FLAGS['brasil']);
    expect(card.querySelector('[data-team-initials]')?.textContent?.trim()).toBe('CO');
    expect(card.querySelector('[data-status="pending"]')?.textContent).toContain(
      ADMIN_MATCHES_COPY.match.status.pending,
    );
    // Labels visibles del formulario, no solo sr-only.
    expect([...card.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
      ADMIN_MATCHES_COPY.fields.homeScore.label,
      ADMIN_MATCHES_COPY.fields.awayScore.label,
    ]);
  });

  it('muestra el resultado cargado y el badge Finalizado en un partido ya jugado', () => {
    const root = setup([createMatch({ homeScore: 2, awayScore: 1 })]).nativeElement as HTMLElement;

    const card = root.querySelector('article')!;
    expect(card.querySelector('[data-status="finished"]')?.textContent).toContain(
      ADMIN_MATCHES_COPY.match.status.finished(2, 1),
    );
    expect(card.querySelector('[data-status="pending"]')).toBeNull();
  });

  it('muestra un estado vacío con el mensaje cuando no hay partidos para cargar', () => {
    const fixture = setup([]);
    const root = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.matches()).toEqual([]);
    expect(root.querySelector('article')).toBeNull();

    const emptyState = root.querySelector('p.rounded-2xl.border-dashed');
    expect(emptyState).not.toBeNull();
    expect(emptyState!.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      ADMIN_MATCHES_COPY.states.empty,
    );
  });

  it('cae al badge de iniciales sin romper cuando un partido viene sin nombre de equipo', () => {
    // teamFlag/teamInitials reciben payloads incompletos de la API: no pueden lanzar.
    const malformed = createMatch({
      homeTeam: undefined as unknown as string,
      awayTeam: '   ' as unknown as string,
    });
    const root = setup([malformed]).nativeElement as HTMLElement;

    const card = root.querySelector('article')!;
    expect(card.querySelector('[data-team-flag]')).toBeNull();
    expect(
      [...card.querySelectorAll('[data-team-initials]')].map((badge) => badge.textContent?.trim()),
    ).toEqual(['?', '?']);
  });

  it('renderiza los textos del ADMIN_MATCHES_COPY manteniendo cada label ligado a su input', () => {
    const fixture = setup([createMatch({ group: 'B' })]);
    const root = fixture.nativeElement as HTMLElement;
    const card = root.querySelector('article')!;

    const heading = root.querySelector('h1') as HTMLElement;
    expect(heading.textContent?.trim()).toBe(ADMIN_MATCHES_COPY.title);
    expect(
      (heading.nextElementSibling as HTMLElement).textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe(ADMIN_MATCHES_COPY.subtitle);

    // El grupo sigue viniendo de la constante compartida, no del copy de la pantalla.
    expect(card.textContent).toContain(MATCH_GROUP_LABELS.B);
    expect(card.querySelector('[data-status="pending"]')?.textContent?.trim()).toBe(
      ADMIN_MATCHES_COPY.match.status.pending,
    );
    expect(
      (card.querySelector('.uppercase[aria-hidden="true"]') as HTMLElement).textContent?.trim(),
    ).toBe(ADMIN_MATCHES_COPY.match.vs);
    expect((card.querySelector('button[type="submit"]') as HTMLElement).textContent?.trim()).toBe(
      ADMIN_MATCHES_COPY.actions.save,
    );

    const labels = [...card.querySelectorAll('label')] as HTMLLabelElement[];
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      ADMIN_MATCHES_COPY.fields.homeScore.label,
      ADMIN_MATCHES_COPY.fields.awayScore.label,
    ]);
    const inputs = [...card.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(labels[0].htmlFor).toBe(inputs[0].id);
    expect(labels[1].htmlFor).toBe(inputs[1].id);
    expect(inputs[0].id).toBe(
      fixture.componentInstance.scoreId(fixture.componentInstance.matches()[0], 'home'),
    );
    expect(inputs[1].id).toBe(
      fixture.componentInstance.scoreId(fixture.componentInstance.matches()[0], 'away'),
    );
  });

  it('renderiza el estado de guardado y el mensaje de éxito desde el copy', () => {
    const match = createMatch();
    const fixture = setup([match]);
    const root = fixture.nativeElement as HTMLElement;
    const vm = fixture.componentInstance.matches()[0];
    const response$ = new Subject<MatchDto>();
    adminServiceMock.submitMatchResult.mockReturnValue(response$);

    vm.form.setValue({ homeScore: 2, awayScore: 1 });
    fixture.componentInstance.submit(vm);
    fixture.detectChanges();

    const button = root.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe(ADMIN_MATCHES_COPY.actions.saving);
    expect(root.querySelector('.saved-feedback')).toBeNull();

    response$.next({ ...match, homeScore: 2, awayScore: 1 });
    fixture.detectChanges();

    expect(root.querySelector('.saved-feedback')?.textContent?.trim()).toBe(
      ADMIN_MATCHES_COPY.feedback.saved,
    );
    expect(root.querySelector('button[type="submit"]')?.textContent?.trim()).toBe(
      ADMIN_MATCHES_COPY.actions.save,
    );
  });
});
