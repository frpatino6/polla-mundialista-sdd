import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardEntryDto } from '../../core/models/leaderboard.models';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { Leaderboard } from './leaderboard';
import { LEADERBOARD_COPY } from './leaderboard.copy';

describe('Leaderboard', () => {
  let leaderboardServiceMock: { getLeaderboard: ReturnType<typeof vi.fn> };

  /** El navbar y el resaltado de la fila propia necesitan la sesión de AuthService. */
  function configureProviders() {
    return [
      provideRouter([]),
      { provide: LeaderboardService, useValue: leaderboardServiceMock },
      {
        provide: AuthService,
        useValue: { currentUser: { email: 'ana@example.com' }, role: 'User', logout: vi.fn() },
      },
    ];
  }

  function setup(entries: LeaderboardEntryDto[]) {
    leaderboardServiceMock = { getLeaderboard: vi.fn().mockReturnValue(of(entries)) };

    TestBed.configureTestingModule({ providers: configureProviders() });

    const fixture = TestBed.createComponent(Leaderboard);
    fixture.detectChanges();
    return fixture;
  }

  it('renders rows in the exact order returned by the backend, including a real tie-break scenario', () => {
    // El backend ya aplica el desempate de docs/design.md §7: TotalPoints desc,
    // luego ExactPredictions desc, luego Email asc. u1/u2 empatan en puntos y
    // marcadores exactos (desempatados por email: zoe > ana, así que si el
    // componente reordenara por su cuenta el orden cambiaría). u3/u4 empatan
    // solo en puntos, con distinto ExactPredictions.
    const entries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'zoe@example.com', totalPoints: 9, exactPredictions: 3 },
      { userId: 'u2', email: 'ana@example.com', totalPoints: 9, exactPredictions: 3 },
      { userId: 'u3', email: 'bob@example.com', totalPoints: 6, exactPredictions: 1 },
      { userId: 'u4', email: 'carla@example.com', totalPoints: 6, exactPredictions: 2 },
    ];

    const fixture = setup(entries);
    const component = fixture.componentInstance;

    expect(component.entries().map((e) => e.userId)).toEqual(['u1', 'u2', 'u3', 'u4']);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('zoe@example.com');
    expect(rows[1].textContent).toContain('ana@example.com');
    expect(rows[2].textContent).toContain('bob@example.com');
    expect(rows[3].textContent).toContain('carla@example.com');

    // La posición mostrada (1..N) sigue el índice de llegada, no un recálculo local.
    expect(rows[0].querySelector('td')!.textContent).toContain('1');
    expect(rows[3].querySelector('td')!.textContent).toContain('4');
  });

  it('shows a friendly message when the leaderboard is empty', () => {
    const fixture = setup([]);

    expect(fixture.nativeElement.textContent).toContain(LEADERBOARD_COPY.states.empty);
  });

  it('re-queries the backend (no stale cache) every time the component initializes', () => {
    const firstEntries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'ana@example.com', totalPoints: 3, exactPredictions: 1 },
    ];
    const fixture = setup(firstEntries);
    const component = fixture.componentInstance;

    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenCalledTimes(1);
    expect(component.entries()).toEqual(firstEntries);

    // Simula que Admin recalculó resultados y el usuario vuelve a abrir la pantalla.
    const updatedEntries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'ana@example.com', totalPoints: 6, exactPredictions: 2 },
    ];
    leaderboardServiceMock.getLeaderboard.mockReturnValue(of(updatedEntries));

    component.ngOnInit();

    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenCalledTimes(2);
    expect(component.entries()).toEqual(updatedEntries);
  });

  it('shows an error message when the request fails', () => {
    leaderboardServiceMock = {
      getLeaderboard: vi.fn().mockReturnValue(throwError(() => new Error('network error'))),
    };

    TestBed.configureTestingModule({ providers: configureProviders() });

    const fixture = TestBed.createComponent(Leaderboard);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe(LEADERBOARD_COPY.states.loadError);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain(LEADERBOARD_COPY.states.loadError);
  });

  it('renderiza el navbar compartido con la navegación unificada', () => {
    const root = setup([]).nativeElement as HTMLElement;

    expect(root.querySelector('app-navbar')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/predictions"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/leaderboard"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/history"]')).not.toBeNull();
  });

  it('usa una tabla semántica con caption y scope="col" en cada encabezado', () => {
    const entries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'zoe@example.com', totalPoints: 9, exactPredictions: 3 },
    ];
    const root = setup(entries).nativeElement as HTMLElement;

    const table = root.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.querySelector('caption')?.className).toContain('sr-only');
    expect(table!.querySelector('caption')?.textContent?.trim().length).toBeGreaterThan(0);

    const headers = [...table!.querySelectorAll('th')];
    expect(headers.length).toBe(4);
    expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(table!.querySelector('thead')).not.toBeNull();
  });

  it('renderiza los textos de LEADERBOARD_COPY con el caption y los encabezados accesibles del copy', () => {
    const entries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'ana@example.com', totalPoints: 9, exactPredictions: 3 },
    ];
    const root = setup(entries).nativeElement as HTMLElement;

    const heading = root.querySelector('h1') as HTMLElement;
    expect(heading.textContent?.trim()).toBe(LEADERBOARD_COPY.title);
    expect((heading.nextElementSibling as HTMLElement).textContent?.trim()).toBe(
      LEADERBOARD_COPY.subtitle,
    );

    const table = root.querySelector('table') as HTMLTableElement;
    expect(table.querySelector('caption')?.textContent?.trim()).toBe(
      LEADERBOARD_COPY.table.caption,
    );

    // Cada th conserva scope="col" y ahora rotula su columna con el texto del copy.
    const headers = [...table.querySelectorAll('th')];
    expect(headers.map((th) => th.getAttribute('scope'))).toStrictEqual([
      'col',
      'col',
      'col',
      'col',
    ]);
    expect(headers.map((th) => th.textContent?.trim())).toStrictEqual([
      LEADERBOARD_COPY.table.columns.position,
      LEADERBOARD_COPY.table.columns.user,
      LEADERBOARD_COPY.table.columns.points,
      LEADERBOARD_COPY.table.columns.exactPredictions,
    ]);

    // La fila propia mantiene el marcador visible y el texto solo para lectores de pantalla.
    const marker = root.querySelector('[data-current-user]') as HTMLElement;
    expect(marker.textContent?.trim()).toBe(LEADERBOARD_COPY.currentUser.badge);
    expect(root.querySelector('td .sr-only')?.textContent?.trim()).toBe(
      LEADERBOARD_COPY.currentUser.srOnly,
    );
  });

  it('resalta la fila del usuario en curso sin depender solo del color', () => {
    // La sesión mockeada es ana@example.com (ver configureProviders), segunda en el ranking.
    const entries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'zoe@example.com', totalPoints: 9, exactPredictions: 3 },
      { userId: 'u2', email: 'ana@example.com', totalPoints: 6, exactPredictions: 2 },
    ];

    const root = setup(entries).nativeElement as HTMLElement;
    const rows = root.querySelectorAll('tbody tr');

    // El resaltado se suma a las utilidades estáticas de la fila (hover, divisores).
    expect(rows[1].className).toContain('bg-emerald-500/5');
    expect(rows[1].className).toContain('hover:bg-slate-800/40');
    expect(rows[0].className).not.toContain('bg-emerald-500/5');
    expect(rows[0].className).toContain('hover:bg-slate-800/40');

    // Marcador textual: visible para todos y announced para lectores de pantalla.
    const markers = root.querySelectorAll('[data-current-user]');
    expect(markers.length).toBe(1);
    expect(markers[0].textContent).toContain(LEADERBOARD_COPY.currentUser.badge);
    expect(root.textContent).toContain(LEADERBOARD_COPY.currentUser.srOnly);
  });

  it('no resalta ninguna fila cuando la entrada no corresponde a la sesión', () => {
    const entries: LeaderboardEntryDto[] = [
      { userId: 'u1', email: 'zoe@example.com', totalPoints: 9, exactPredictions: 3 },
    ];

    const fixture = setup(entries);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-current-user]')).toBeNull();
    expect(root.querySelectorAll('tbody tr')[0].className).not.toContain('bg-emerald-500/5');
    expect(root.textContent).not.toContain(LEADERBOARD_COPY.currentUser.srOnly);
  });
});
