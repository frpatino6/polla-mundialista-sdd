import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
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

    expect(fixture.nativeElement.textContent).toContain(
      'Todavía no has registrado predicciones',
    );
  });
});
