import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PredictionDto, PredictionHistoryEntryDto } from '../models/predictions.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PredictionsService extends ApiService {
  getMyHistory(): Observable<PredictionHistoryEntryDto[]> {
    return this.http.get<PredictionHistoryEntryDto[]>(`${this.baseUrl}/api/predictions/me`);
  }

  registerPrediction(
    matchId: string,
    predictedHomeScore: number,
    predictedAwayScore: number,
  ): Observable<PredictionDto> {
    return this.http.post<PredictionDto>(`${this.baseUrl}/api/predictions`, {
      matchId,
      predictedHomeScore,
      predictedAwayScore,
    });
  }
}
