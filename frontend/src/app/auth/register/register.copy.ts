import { AUTH_COPY } from '../../core/copy/auth.copy';

export const REGISTER_COPY = {
  brand: AUTH_COPY.brand,
  title: 'Únete a la polla',
  subtitle:
    'Crea tu cuenta gratis y empieza a predecir los resultados de cada partido del Mundial.',
  fields: {
    email: { label: AUTH_COPY.emailField.label, placeholder: AUTH_COPY.emailField.placeholder },
    password: { label: AUTH_COPY.passwordField.label, placeholder: 'Mínimo 6 caracteres' },
  },
  errors: {
    email: AUTH_COPY.emailField.error,
    password: 'La contraseña debe tener al menos 6 caracteres.',
    fallback: 'No se pudo completar el registro.',
  },
  actions: {
    submit: 'Registrarme',
    submitting: 'Creando cuenta…',
    showPassword: AUTH_COPY.passwordToggle.show,
    hidePassword: AUTH_COPY.passwordToggle.hide,
  },
  hasAccount: { prompt: '¿Ya tienes cuenta?', cta: AUTH_COPY.signIn.cta },
} as const;
