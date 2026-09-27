import { MATCHES_COPY } from '../../core/copy/matches.copy';

export const HISTORY_COPY = {
  title: 'Mi Historial',
  subtitle:
    'Todas tus predicciones con el resultado real de cada partido y los puntos que te sumo cada una. Las que todavía no se jugaron aparecen como pendientes.',
  states: {
    loading: 'Cargando historial…',
    empty: 'Todavía no has registrado predicciones.',
    loadError: 'No se pudo cargar tu historial. Intenta nuevamente más tarde.',
  },
  table: {
    caption: 'Tus predicciones con el resultado real de cada partido y los puntos que sumaste.',
    columns: {
      match: 'Partido',
      prediction: 'Mi predicción',
      actualResult: 'Resultado real',
      points: 'Puntos',
    },
  },
  match: { vs: MATCHES_COPY.vs },
  pending: { result: MATCHES_COPY.status.pending, points: '—' },
} as const;
