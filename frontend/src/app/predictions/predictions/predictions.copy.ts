export const PREDICTIONS_COPY = {
  title: 'Predicciones del Torneo',
  subtitle:
    'Cargá el marcador que creés para cada partido. Podés cambiar tu predicción todas las veces que quieras: se bloquea en el momento exacto en que arranca el partido.',
  states: {
    loading: 'Cargando partidos…',
    loadError: 'No se pudieron cargar los partidos. Intenta nuevamente más tarde.',
    empty: 'Todavía no hay partidos cargados en este grupo.',
  },
  groups: { ariaLabel: 'Grupos del torneo' },
  match: {
    vs: 'vs',
    result: (homeScore: number, awayScore: number) => `Resultado: ${homeScore} - ${awayScore}`,
    goalsFor: (team: string) => `Goles de ${team}`,
    status: {
      points: (points: number) => `+${points} pts`,
      awaiting: 'Guardada · sin resultado',
      pending: 'Pendiente',
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
    saving: 'Guardando…',
  },
} as const;
