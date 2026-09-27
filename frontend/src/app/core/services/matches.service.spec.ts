import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MatchDto } from '../models/predictions.models';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MatchesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getMatches() GETs /api/matches', () => {
    const matches: MatchDto[] = [
      {
        id: 'match-1',
        group: 'A',
        homeTeam: 'Colombia',
        awayTeam: 'Brasil',
        kickoffAt: '2026-06-01T18:00:00Z',
        homeScore: null,
        awayScore: null,
      },
    ];

    service.getMatches().subscribe((result) => {
      expect(result).toEqual(matches);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/matches`);
    expect(req.request.method).toBe('GET');
    req.flush(matches);
  });
});
