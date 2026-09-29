import { AUTH_COPY } from '../../core/copy/auth.copy';

export const REGISTER_COPY = {
  brand: AUTH_COPY.brand,
  title: 'Únete a la polla',
  subtitle:
    'Crea tu cuenta gratis y empieza a predecir los resultados de cada partido del Mundial.',
  fields: {
    email: { label: AUTH_COPY.emailField.label, placeholder: AUTH_COPY.emailField.placeholder },
    password: {
      label: AUTH_COPY.passwordField.label,
      placeholder: AUTH_COPY.passwordPolicy.placeholder,
    },
    confirmPassword: { label: 'Confirmar contraseña', placeholder: 'Repite tu contraseña' },
  },
  errors: {
    email: AUTH_COPY.emailField.error,
    password: AUTH_COPY.passwordPolicy.error,
    confirmPassword: {
      required: 'Confirma tu contraseña.',
      mismatch: 'Las contraseñas no coinciden.',
    },
    fallback: 'No se pudo completar el registro.',
  },
  actions: {
    submit: 'Registrarme',
    submitting: 'Creando cuenta…',
    showPassword: AUTH_COPY.passwordToggle.show,
    hidePassword: AUTH_COPY.passwordToggle.hide,
    showConfirmPassword: 'Mostrar confirmación de contraseña',
    hideConfirmPassword: 'Ocultar confirmación de contraseña',
  },
  hasAccount: { prompt: '¿Ya tienes cuenta?', cta: AUTH_COPY.signIn.cta },
} as const;
