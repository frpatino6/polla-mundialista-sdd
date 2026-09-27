export const LEADERBOARD_COPY = {
  title: 'Leaderboard',
  subtitle:
    'Ranking general de la polla: puntos totales y aciertos exactos de cada participante, en el orden que define el torneo. Tu fila viene destacada.',
  states: {
    loading: 'Cargando leaderboard…',
    empty: 'Todavía no hay predicciones registradas.',
    loadError: 'No se pudo cargar el leaderboard. Intenta nuevamente más tarde.',
  },
  table: {
    caption:
      'Ranking de participantes por puntos totales y marcadores exactos, con la posición en la primera columna.',
    columns: {
      position: 'Pos.',
      user: 'Usuario',
      points: 'Puntos',
      exactPredictions: 'Marcadores exactos',
    },
  },
  currentUser: { badge: 'Vos', srOnly: '(tu usuario)' },
} as const;
