import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LeaderboardEntryDto } from '../models/leaderboard.models';
import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(LeaderboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getLeaderboard() GETs /api/leaderboard', () => {
    const entries: LeaderboardEntryDto[] = [
      { userId: 'user-1', email: 'ana@example.com', totalPoints: 9, exactPredictions: 3 },
    ];

    service.getLeaderboard().subscribe((result) => {
      expect(result).toEqual(entries);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/leaderboard`);
    expect(req.request.method).toBe('GET');
    req.flush(entries);
  });

  it('does not cache: every call triggers a new HTTP request against the API', () => {
    const firstResponse: LeaderboardEntryDto[] = [
      { userId: 'user-1', email: 'ana@example.com', totalPoints: 3, exactPredictions: 1 },
    ];
    const secondResponse: LeaderboardEntryDto[] = [
      { userId: 'user-1', email: 'ana@example.com', totalPoints: 6, exactPredictions: 2 },
    ];

    let firstResult: LeaderboardEntryDto[] | undefined;
    service.getLeaderboard().subscribe((result) => (firstResult = result));
    httpMock.expectOne(`${environment.apiBaseUrl}/api/leaderboard`).flush(firstResponse);

    let secondResult: LeaderboardEntryDto[] | undefined;
    service.getLeaderboard().subscribe((result) => (secondResult = result));
    httpMock.expectOne(`${environment.apiBaseUrl}/api/leaderboard`).flush(secondResponse);

    expect(firstResult).toEqual(firstResponse);
    expect(secondResult).toEqual(secondResponse);
  });
});
