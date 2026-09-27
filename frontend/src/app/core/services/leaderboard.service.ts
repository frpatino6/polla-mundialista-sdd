import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LeaderboardEntryDto } from '../models/leaderboard.models';
import { ApiService } from './api.service';

/**
 * Sin ningún operador de cache (shareReplay, etc.): cada llamada a
 * getLeaderboard() dispara un GET nuevo contra la API. Es un criterio de
 * aceptación explícito de la Tarea #13 — el leaderboard debe reflejar el
 * recálculo de puntos del Admin sin servir una respuesta obsoleta.
 */
@Injectable({ providedIn: 'root' })
export class LeaderboardService extends ApiService {
  getLeaderboard(): Observable<LeaderboardEntryDto[]> {
    return this.http.get<LeaderboardEntryDto[]>(`${this.baseUrl}/api/leaderboard`);
  }
}
