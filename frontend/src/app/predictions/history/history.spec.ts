import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PredictionHistoryEntryDto } from '../../core/models/predictions.models';
import { PredictionsService } from '../../core/services/predictions.service';
import { History } from './history';

describe('History', () => {
  let predictionsServiceMock: { getMyHistory: ReturnType<typeof vi.fn> };

  function setup(history: PredictionHistoryEntryDto[]) {
    predictionsServiceMock = { getMyHistory: vi.fn().mockReturnValue(of(history)) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PredictionsService, useValue: predictionsServiceMock },
        {
          provide: AuthService,
          useValue: { currentUser: { email: 'user@example.com' }, role: 'User', logout: vi.fn() },
        },
      ],
    });

    const fixture = TestBed.createComponent(History);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a scored match with its real result and points', () => {
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

    const fixture = setup(history);

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('Colombia vs Brasil');
    expect(row.textContent).toContain('2 - 1');
    expect(row.textContent).toContain('3');
    expect(row.textContent).not.toContain('Pendiente');
    expect(row.textContent).not.toContain('—');
  });

  it('renders a pending match (no real result yet) as "Pendiente" / "—"', () => {
    const history: PredictionHistoryEntryDto[] = [
      {
        matchId: 'match-2',
        homeTeam: 'Argentina',
        awayTeam: 'Uruguay',
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        actualHomeScore: null,
        actualAwayScore: null,
        pointsAwarded: 0,
      },
    ];

    const fixture = setup(history);

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('Argentina vs Uruguay');
    expect(row.textContent).toContain('1 - 0');
    expect(row.textContent).toContain('Pendiente');
    expect(row.textContent).toContain('—');
  });

  it('shows a friendly message when there is no history yet', () => {
    const fixture = setup([]);

    expect(fixture.nativeElement.textContent).toContain('Todavía no has registrado predicciones');
  });

  it('renderiza el navbar compartido con la navegación unificada', () => {
    const root = setup([]).nativeElement as HTMLElement;

    expect(root.querySelector('app-navbar')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/predictions"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/leaderboard"]')).not.toBeNull();
    expect(root.querySelector('a[routerLink="/history"]')).not.toBeNull();
  });

  it('muestra la bandera de los equipos mapped y cae a iniciales en los desconocidos', () => {
    // 'Brasil' está en TEAM_FLAGS; 'Colombia' no, así que usa el badge de iniciales.
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

    const root = setup(history).nativeElement as HTMLElement;

    const flags = root.querySelectorAll('[data-team-flag]');
    expect(flags.length).toBe(1);
    expect(flags[0].textContent?.trim()).toBe('🇧🇷');
    expect(flags[0].getAttribute('aria-hidden')).toBe('true');

    const initials = root.querySelectorAll('[data-team-initials]');
    expect(initials.length).toBe(1);
    expect(initials[0].textContent?.trim()).toBe('CO');
    expect(initials[0].getAttribute('aria-hidden')).toBe('true');

    // El nombre del equipo siempre acompaña a la bandera como texto real.
    const row = root.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Colombia');
    expect(row.textContent).toContain('Brasil');
  });

  it('usa una tabla semántica con caption y scope="col" en cada encabezado', () => {
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
    const root = setup(history).nativeElement as HTMLElement;

    const table = root.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.querySelector('caption')?.textContent?.trim().length).toBeGreaterThan(0);

    const headers = [...table!.querySelectorAll('th')];
    expect(headers.length).toBe(4);
    expect(headers.every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(table!.querySelector('thead')).not.toBeNull();
  });
});
