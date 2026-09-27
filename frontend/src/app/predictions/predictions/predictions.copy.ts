import { MATCHES_COPY } from '../../core/copy/matches.copy';

export const PREDICTIONS_COPY = {
  title: 'Predicciones del Torneo',
  subtitle:
    'Cargá el marcador que creés para cada partido. Podés cambiar tu predicción todas las veces que quieras: se bloquea en el momento exacto en que arranca el partido.',
  states: {
    loading: MATCHES_COPY.states.loading,
    loadError: MATCHES_COPY.states.loadError,
    empty: 'Todavía no hay partidos cargados en este grupo.',
  },
  groups: { ariaLabel: 'Grupos del torneo' },
  match: {
    vs: MATCHES_COPY.vs,
    result: (homeScore: number, awayScore: number) => `Resultado: ${homeScore} - ${awayScore}`,
    goalsFor: (team: string) => `Goles de ${team}`,
    status: {
      points: (points: number) => `+${points} pts`,
      awaiting: 'Guardada · sin resultado',
      pending: MATCHES_COPY.status.pending,
    },
  },
  feedback: {
    saved: 'Predicción guardada.',
    locked: 'El partido ya inició; no se pueden registrar predicciones.',
    kickoffConflict: 'El partido ya inició; no se puede registrar la predicción.',
    saveError: 'No se pudo guardar la predicción.',
  },
  actions: {
    save: 'Guardar predicción',
    saving: MATCHES_COPY.actions.saving,
  },
} as const;
