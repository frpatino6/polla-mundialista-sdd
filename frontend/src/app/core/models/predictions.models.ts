/**
 * Grupo de un partido. Viaja como string ("A" | "B") gracias al
 * JsonStringEnumConverter registrado en Program.cs, tanto para Minimal API
 * como para los Controllers (MVC, usados por PredictionsController).
 */
export type MatchGroup = 'A' | 'B';

export const MATCH_GROUP_LABELS: Record<MatchGroup, string> = {
  A: 'Grupo A',
  B: 'Grupo B',
};

/** Espejo de PollaMundialista.Application.Dtos.MatchDto */
export interface MatchDto {
  id: string;
  group: MatchGroup;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
}

/** Espejo de PollaMundialista.Application.Dtos.PredictionDto */
export interface PredictionDto {
  id: string;
  userId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded: number;
}

/** Espejo de PollaMundialista.Application.Dtos.PredictionHistoryEntryDto */
export interface PredictionHistoryEntryDto {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  pointsAwarded: number;
}
