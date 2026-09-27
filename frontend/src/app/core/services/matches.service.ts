import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MatchDto } from '../models/predictions.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MatchesService extends ApiService {
  getMatches(): Observable<MatchDto[]> {
    return this.http.get<MatchDto[]>(`${this.baseUrl}/api/matches`);
  }
}
