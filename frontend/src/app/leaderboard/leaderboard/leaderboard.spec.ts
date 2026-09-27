import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LeaderboardEntryDto } from '../../core/models/leaderboard.models';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { Leaderboard } from './leaderboard';

describe('Leaderboard', () => {
  let leaderboardServiceMock: { getLeaderboard: ReturnType<typeof vi.fn> };

  function setup(entries: LeaderboardEntryDto[]) {
    leaderboardServiceMock = { getLeaderboard: vi.fn().mockReturnValue(of(entries)) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LeaderboardService, useValue: leaderboardServiceMock },
      ],
    });

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

    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no hay predicciones registradas',
    );
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

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LeaderboardService, useValue: leaderboardServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(Leaderboard);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toContain('No se pudo cargar el leaderboard');
  });
});
