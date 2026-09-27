import { MATCHES_COPY } from '../../core/copy/matches.copy';

export const ADMIN_MATCHES_COPY = {
  title: 'Panel Admin — Resultados',
  subtitle:
    'Cargá el resultado real de cada partido. Al guardar, el backend recalcula los puntos de todas las predicciones afectadas y el leaderboard y el historial quedan actualizados.',
  states: {
    loading: MATCHES_COPY.states.loading,
    loadError: MATCHES_COPY.states.loadError,
    empty:
      'Todavía no hay partidos cargados. Cargá los partidos desde la base de datos o contactá al administrador.',
  },
  match: {
    vs: MATCHES_COPY.vs,
    status: {
      finished: (homeScore: number, awayScore: number) => `Finalizado: ${homeScore} - ${awayScore}`,
      pending: MATCHES_COPY.status.pending,
    },
  },
  fields: {
    homeScore: { label: 'Local' },
    awayScore: { label: 'Visitante' },
  },
  feedback: {
    saved: 'Resultado guardado. Puntos recalculados.',
    saveError: 'No se pudo guardar el resultado.',
  },
  actions: {
    save: 'Guardar resultado',
    saving: MATCHES_COPY.actions.saving,
  },
} as const;
