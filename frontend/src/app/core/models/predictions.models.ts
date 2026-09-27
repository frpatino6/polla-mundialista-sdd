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

/**
 * Banderas emoji de los equipos del fixture, indexadas por el nombre ya
 * normalizado (ver normalizeTeamName). Es una lista de presentación, no de
 * dominio: si el fixture agrega o renombra un equipo, teamFlag devuelve null y
 * la UI cae al badge de iniciales en vez de mostrar una bandera inventada.
 *
 * Inglaterra usa la secuencia de tags 🏴 y no 🇬🇧 porque en un torneo de
 * selecciones Inglaterra no es el Reino Unido (la Union Jack sería conceptualmente
 * incorrecta). Esa secuencia se dibuja bien en macOS, iOS, Windows 10+ y Android;
 * en sistemas con una fuente de emoji vieja puede verse como las letras "GB". Por
 * eso el nombre del equipo va siempre al lado como texto: es el que identifica al
 * equipo, y la bandera es solo el refuerzo visual.
 */
export const TEAM_FLAGS: Record<string, string> = {
  argentina: '🇦🇷',
  brasil: '🇧🇷',
  espana: '🇪🇸',
  francia: '🇫🇷',
  alemania: '🇩🇪',
  portugal: '🇵🇹',
  inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'paises bajos': '🇳🇱',
};

/**
 * Minúsculas, sin tildes ni signos y con espacios colapsados: "Países Bajos" → "paises bajos".
 * Un nombre ausente o en blanco se normaliza a string vacío para que teamFlag caiga al badge de
 * iniciales en vez de romper el render.
 */
function normalizeTeamName(team: string | null | undefined): string {
  if (typeof team !== 'string' || team.trim() === '') {
    return '';
  }

  return team
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bandera emoji del equipo, o null si el fixture trae un equipo sin mapear. */
export function teamFlag(team: string | null | undefined): string | null {
  const key = normalizeTeamName(team);
  if (key === '') {
    return null;
  }

  // Object.hasOwn y no un lookup directo: sin esto un equipo llamado "constructor"
  // o "toString" devolvería la función heredada de Object en vez de null.
  return Object.hasOwn(TEAM_FLAGS, key) ? TEAM_FLAGS[key] : null;
}

/**
 * Iniciales del equipo para el badge neutro que reemplaza a la bandera
 * desconocida: dos letras de la primera palabra más la inicial de la segunda
 * ("Países Bajos" → "PB", "Colombia" → "CO", "Inglaterra" → "IN"). Sin nombre
 * utilizable devuelve "?".
 */
export function teamInitials(team: string | null | undefined): string {
  const words = normalizeTeamName(team).split(' ').filter(Boolean);
  if (words.length === 0) {
    return '?';
  }

  const [first, second] = words;
  return (first.slice(0, 2) + (second?.charAt(0) ?? '')).toUpperCase();
}

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
