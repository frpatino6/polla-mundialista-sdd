import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MatchDto } from '../models/predictions.models';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('submitMatchResult() PUTs the result payload to /api/admin/matches/{matchId}/result', () => {
    const updatedMatch: MatchDto = {
      id: 'match-1',
      group: 'A',
      homeTeam: 'Colombia',
      awayTeam: 'Brasil',
      kickoffAt: '2026-06-01T18:00:00Z',
      homeScore: 2,
      awayScore: 1,
    };

    service.submitMatchResult('match-1', 2, 1).subscribe((result) => {
      expect(result).toEqual(updatedMatch);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/admin/matches/match-1/result`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ homeScore: 2, awayScore: 1 });
    req.flush(updatedMatch);
  });
});
