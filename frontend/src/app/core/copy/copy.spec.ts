import { ADMIN_MATCHES_COPY } from '../../admin/admin-matches/admin-matches.copy';
import { FORGOT_PASSWORD_COPY } from '../../auth/forgot-password/forgot-password.copy';
import { LOGIN_COPY } from '../../auth/login/login.copy';
import { REGISTER_COPY } from '../../auth/register/register.copy';
import { RESET_PASSWORD_COPY } from '../../auth/reset-password/reset-password.copy';
import { LEADERBOARD_COPY } from '../../leaderboard/leaderboard/leaderboard.copy';
import { HISTORY_COPY } from '../../predictions/history/history.copy';
import { PREDICTIONS_COPY } from '../../predictions/predictions/predictions.copy';
import { NAVBAR_COPY } from '../components/navbar/navbar.copy';
import { AUTH_COPY } from './auth.copy';
import { MATCHES_COPY } from './matches.copy';

type CopyModule = Record<string, unknown>;

// Todos los módulos de copy de la app entran al barrido: `navbar` incluido, porque sus
// etiquetas de link (`Leaderboard`, `Mi Historial`) chocan con los títulos de página y esa
// coincidencia tiene que seguir vigilada (ver docs/design.md §5.2).
const FEATURE_COPY: ReadonlyArray<readonly [string, CopyModule]> = [
  ['LOGIN_COPY', LOGIN_COPY],
  ['REGISTER_COPY', REGISTER_COPY],
  ['FORGOT_PASSWORD_COPY', FORGOT_PASSWORD_COPY],
  ['RESET_PASSWORD_COPY', RESET_PASSWORD_COPY],
  ['LEADERBOARD_COPY', LEADERBOARD_COPY],
  ['HISTORY_COPY', HISTORY_COPY],
  ['PREDICTIONS_COPY', PREDICTIONS_COPY],
  ['ADMIN_MATCHES_COPY', ADMIN_MATCHES_COPY],
  ['NAVBAR_COPY', NAVBAR_COPY],
];

// Duplicados deliberados: no son reutilización real, así que no van a core/copy.
// La clave es el string y el valor el motivo por el que se deja duplicado a propósito.
const DELIBERATELY_DUPLICATED_COPY: Readonly<Record<string, string>> = {
  Leaderboard: 'Etiqueta del nav vs. título de página: pueden divergir legitimamente.',
  'Mi Historial': 'Etiqueta del nav vs. título de página: pueden divergir legitimamente.',
  Puntos:
    'Columna de historial vs. columna de leaderboard: pueden divergir ("Puntos" vs "Puntos totales").',
  'La contraseña debe tener al menos 6 caracteres.':
    'Atada a la regla de validación, no al copy (reset-password usa mínimo 8): la frase la genera la regla, no un catálogo.',
};

const collectStrings = (node: unknown, path: string, into: Map<string, string[]>): void => {
  if (typeof node === 'string') {
    const paths = into.get(node) ?? [];
    paths.push(path);
    into.set(node, paths);
    return;
  }
  // Las funciones de dominio del copy (match.result(...), goalsFor(...)) no son texto
  // estático, así que quedan fuera del barrido.
  if (typeof node !== 'object' || node === null) {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    collectStrings(value, path ? `${path}.${key}` : key, into);
  }
};

const collect = (root: CopyModule): Map<string, string[]> => {
  const into = new Map<string, string[]>();
  collectStrings(root, '', into);
  return into;
};

const SHARED_VALUES: ReadonlySet<string> = new Set([
  ...collect(AUTH_COPY).keys(),
  ...collect(MATCHES_COPY).keys(),
]);

// Strings que aparecen en más de un módulo de feature, con las rutas donde salen.
const crossFeatureDuplicates = (): Map<string, string[]> => {
  const owners = new Map<string, string[]>();
  const locations = new Map<string, string[]>();

  for (const [moduleName, copy] of FEATURE_COPY) {
    for (const [value, paths] of collect(copy)) {
      const valueOwners = owners.get(value) ?? [];
      valueOwners.push(moduleName);
      owners.set(value, valueOwners);

      const valueLocations = locations.get(value) ?? [];
      valueLocations.push(`${moduleName}.${paths[0]}`);
      locations.set(value, valueLocations);
    }
  }

  const duplicates = new Map<string, string[]>();
  for (const [value, valueOwners] of owners) {
    if (valueOwners.length > 1) {
      duplicates.set(value, locations.get(value) ?? []);
    }
  }
  return duplicates;
};

describe('core/copy', () => {
  it('no deja strings duplicados entre features fuera de los módulos compartidos o la allowlist', () => {
    const offenders = [...crossFeatureDuplicates()]
      .filter(([value]) => !SHARED_VALUES.has(value))
      .filter(([value]) => !(value in DELIBERATELY_DUPLICATED_COPY))
      .map(([value, locations]) => `  ${JSON.stringify(value)} → ${locations.join(', ')}`);

    expect(
      offenders.join('\n'),
      'duplicados cross-feature sin origen compartido ni allowlist',
    ).toBe('');
  });

  it('las features usan exactamente los valores de los módulos compartidos', () => {
    const pairs: ReadonlyArray<readonly [string, string, string]> = [
      ['LOGIN_COPY.brand', LOGIN_COPY.brand, AUTH_COPY.brand],
      ['REGISTER_COPY.brand', REGISTER_COPY.brand, AUTH_COPY.brand],
      ['FORGOT_PASSWORD_COPY.brand', FORGOT_PASSWORD_COPY.brand, AUTH_COPY.brand],
      ['RESET_PASSWORD_COPY.brand', RESET_PASSWORD_COPY.brand, AUTH_COPY.brand],
      ['LOGIN_COPY.fields.email.label', LOGIN_COPY.fields.email.label, AUTH_COPY.emailField.label],
      [
        'REGISTER_COPY.fields.email.label',
        REGISTER_COPY.fields.email.label,
        AUTH_COPY.emailField.label,
      ],
      [
        'FORGOT_PASSWORD_COPY.fields.email.label',
        FORGOT_PASSWORD_COPY.fields.email.label,
        AUTH_COPY.emailField.label,
      ],
      [
        'LOGIN_COPY.fields.email.placeholder',
        LOGIN_COPY.fields.email.placeholder,
        AUTH_COPY.emailField.placeholder,
      ],
      [
        'REGISTER_COPY.fields.email.placeholder',
        REGISTER_COPY.fields.email.placeholder,
        AUTH_COPY.emailField.placeholder,
      ],
      [
        'FORGOT_PASSWORD_COPY.fields.email.placeholder',
        FORGOT_PASSWORD_COPY.fields.email.placeholder,
        AUTH_COPY.emailField.placeholder,
      ],
      ['LOGIN_COPY.errors.email', LOGIN_COPY.errors.email, AUTH_COPY.emailField.error],
      ['REGISTER_COPY.errors.email', REGISTER_COPY.errors.email, AUTH_COPY.emailField.error],
      [
        'FORGOT_PASSWORD_COPY.errors.email',
        FORGOT_PASSWORD_COPY.errors.email,
        AUTH_COPY.emailField.error,
      ],
      [
        'LOGIN_COPY.actions.showPassword',
        LOGIN_COPY.actions.showPassword,
        AUTH_COPY.passwordToggle.show,
      ],
      [
        'REGISTER_COPY.actions.showPassword',
        REGISTER_COPY.actions.showPassword,
        AUTH_COPY.passwordToggle.show,
      ],
      [
        'RESET_PASSWORD_COPY.actions.showPassword',
        RESET_PASSWORD_COPY.actions.showPassword,
        AUTH_COPY.passwordToggle.show,
      ],
      [
        'LOGIN_COPY.actions.hidePassword',
        LOGIN_COPY.actions.hidePassword,
        AUTH_COPY.passwordToggle.hide,
      ],
      [
        'REGISTER_COPY.actions.hidePassword',
        REGISTER_COPY.actions.hidePassword,
        AUTH_COPY.passwordToggle.hide,
      ],
      [
        'RESET_PASSWORD_COPY.actions.hidePassword',
        RESET_PASSWORD_COPY.actions.hidePassword,
        AUTH_COPY.passwordToggle.hide,
      ],
      ['REGISTER_COPY.hasAccount.cta', REGISTER_COPY.hasAccount.cta, AUTH_COPY.signIn.cta],
      [
        'FORGOT_PASSWORD_COPY.rememberedPassword.cta',
        FORGOT_PASSWORD_COPY.rememberedPassword.cta,
        AUTH_COPY.signIn.cta,
      ],
      [
        'RESET_PASSWORD_COPY.rememberedPassword.cta',
        RESET_PASSWORD_COPY.rememberedPassword.cta,
        AUTH_COPY.signIn.cta,
      ],
      [
        'FORGOT_PASSWORD_COPY.rememberedPassword.prompt',
        FORGOT_PASSWORD_COPY.rememberedPassword.prompt,
        AUTH_COPY.rememberedPassword.prompt,
      ],
      [
        'RESET_PASSWORD_COPY.rememberedPassword.prompt',
        RESET_PASSWORD_COPY.rememberedPassword.prompt,
        AUTH_COPY.rememberedPassword.prompt,
      ],
      [
        'LOGIN_COPY.fields.password.label',
        LOGIN_COPY.fields.password.label,
        AUTH_COPY.passwordField.label,
      ],
      [
        'REGISTER_COPY.fields.password.label',
        REGISTER_COPY.fields.password.label,
        AUTH_COPY.passwordField.label,
      ],
      ['PREDICTIONS_COPY.match.vs', PREDICTIONS_COPY.match.vs, MATCHES_COPY.vs],
      ['HISTORY_COPY.match.vs', HISTORY_COPY.match.vs, MATCHES_COPY.vs],
      ['ADMIN_MATCHES_COPY.match.vs', ADMIN_MATCHES_COPY.match.vs, MATCHES_COPY.vs],
      [
        'PREDICTIONS_COPY.match.status.pending',
        PREDICTIONS_COPY.match.status.pending,
        MATCHES_COPY.status.pending,
      ],
      ['HISTORY_COPY.pending.result', HISTORY_COPY.pending.result, MATCHES_COPY.status.pending],
      [
        'ADMIN_MATCHES_COPY.match.status.pending',
        ADMIN_MATCHES_COPY.match.status.pending,
        MATCHES_COPY.status.pending,
      ],
      [
        'PREDICTIONS_COPY.states.loading',
        PREDICTIONS_COPY.states.loading,
        MATCHES_COPY.states.loading,
      ],
      [
        'ADMIN_MATCHES_COPY.states.loading',
        ADMIN_MATCHES_COPY.states.loading,
        MATCHES_COPY.states.loading,
      ],
      [
        'PREDICTIONS_COPY.states.loadError',
        PREDICTIONS_COPY.states.loadError,
        MATCHES_COPY.states.loadError,
      ],
      [
        'ADMIN_MATCHES_COPY.states.loadError',
        ADMIN_MATCHES_COPY.states.loadError,
        MATCHES_COPY.states.loadError,
      ],
      [
        'PREDICTIONS_COPY.actions.saving',
        PREDICTIONS_COPY.actions.saving,
        MATCHES_COPY.actions.saving,
      ],
      [
        'ADMIN_MATCHES_COPY.actions.saving',
        ADMIN_MATCHES_COPY.actions.saving,
        MATCHES_COPY.actions.saving,
      ],
    ];

    for (const [path, actual, expected] of pairs) {
      expect(actual, path).toBe(expected);
    }
  });

  it('mantiene exacta la allowlist de duplicados deliberados', () => {
    const duplicates = crossFeatureDuplicates();

    // Que la allowlist no se pudre: toda entrada tiene que seguir siendo un duplicado real.
    const stale = Object.keys(DELIBERATELY_DUPLICATED_COPY).filter(
      (value) => !duplicates.has(value),
    );
    expect(stale, 'entradas de la allowlist que ya no son duplicados cross-feature').toEqual([]);

    // Que la allowlist no se infle: ningún duplicado real puede faltar en ella.
    const unlisted = [...duplicates]
      .filter(([value]) => !SHARED_VALUES.has(value))
      .filter(([value]) => !(value in DELIBERATELY_DUPLICATED_COPY))
      .map(([value, locations]) => `  ${JSON.stringify(value)} → ${locations.join(', ')}`);
    expect(unlisted.join('\n'), 'duplicados cross-feature que faltan en la allowlist').toBe('');
  });
});
