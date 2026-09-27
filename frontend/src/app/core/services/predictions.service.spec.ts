import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PredictionDto, PredictionHistoryEntryDto } from '../models/predictions.models';
import { PredictionsService } from './predictions.service';

describe('PredictionsService', () => {
  let service: PredictionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PredictionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMyHistory() GETs /api/predictions/me', () => {
    const history: PredictionHistoryEntryDto[] = [
      {
        matchId: 'match-1',
        homeTeam: 'Colombia',
        awayTeam: 'Brasil',
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        actualHomeScore: null,
        actualAwayScore: null,
        pointsAwarded: 0,
      },
    ];

    service.getMyHistory().subscribe((result) => {
      expect(result).toEqual(history);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/predictions/me`);
    expect(req.request.method).toBe('GET');
    req.flush(history);
  });

  it('registerPrediction() POSTs the prediction payload to /api/predictions', () => {
    const predictionDto: PredictionDto = {
      id: 'prediction-1',
      userId: 'user-1',
      matchId: 'match-1',
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      pointsAwarded: 0,
    };

    service.registerPrediction('match-1', 2, 1).subscribe((result) => {
      expect(result).toEqual(predictionDto);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/predictions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      matchId: 'match-1',
      predictedHomeScore: 2,
      predictedAwayScore: 1,
    });
    req.flush(predictionDto);
  });
});
