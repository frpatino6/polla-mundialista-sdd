import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
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
    expect(feedback?.textContent).toContain('Resultado guardado. Puntos recalculados.');
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
    expect(card.textContent).toContain('Grupo A');
    expect(card.textContent).toContain('Colombia');
    expect(card.textContent).toContain('Brasil');
    // 'Brasil' está en TEAM_FLAGS, 'Colombia' cae al badge de iniciales.
    expect(card.querySelector('[data-team-flag]')?.textContent?.trim()).toBe('🇧🇷');
    expect(card.querySelector('[data-team-initials]')?.textContent?.trim()).toBe('CO');
    expect(card.querySelector('[data-status="pending"]')?.textContent).toContain('Pendiente');
    // Labels visibles del formulario, no solo sr-only.
    expect([...card.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
      'Local',
      'Visitante',
    ]);
  });

  it('muestra el resultado cargado y el badge Finalizado en un partido ya jugado', () => {
    const root = setup([createMatch({ homeScore: 2, awayScore: 1 })]).nativeElement as HTMLElement;

    const card = root.querySelector('article')!;
    expect(card.querySelector('[data-status="finished"]')?.textContent).toContain(
      'Finalizado: 2 - 1',
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
      'Todavía no hay partidos cargados. Cargá los partidos desde la base de datos o contactá al administrador.',
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
});
