import { AUTH_COPY } from '../../core/copy/auth.copy';

export const LOGIN_COPY = {
  brand: AUTH_COPY.brand,
  title: 'Bienvenido de nuevo',
  subtitle:
    'Predice los resultados del Mundial y compite en el leaderboard con el resto de la polla.',
  fields: {
    email: { label: AUTH_COPY.emailField.label, placeholder: AUTH_COPY.emailField.placeholder },
    password: { label: AUTH_COPY.passwordField.label, placeholder: '••••••••' },
  },
  errors: {
    email: AUTH_COPY.emailField.error,
    password: AUTH_COPY.passwordPolicy.error,
    fallback: 'Credenciales inválidas.',
  },
  actions: {
    submit: 'Ingresar',
    submitting: 'Ingresando…',
    showPassword: AUTH_COPY.passwordToggle.show,
    hidePassword: AUTH_COPY.passwordToggle.hide,
  },
  rememberMe: 'Recordarme',
  forgotPassword: '¿Olvidaste tu contraseña?',
  noAccount: { prompt: '¿No tienes cuenta?', cta: 'Regístrate' },
} as const;
