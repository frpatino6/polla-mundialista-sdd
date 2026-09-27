import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchDto } from '../models/predictions.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService extends ApiService {
  submitMatchResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
  ): Observable<MatchDto> {
    return this.http.put<MatchDto>(`${this.baseUrl}/api/admin/matches/${matchId}/result`, {
      homeScore,
      awayScore,
    });
  }
}
