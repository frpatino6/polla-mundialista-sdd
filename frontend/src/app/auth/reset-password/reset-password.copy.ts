import { AUTH_COPY } from '../../core/copy/auth.copy';

export const RESET_PASSWORD_COPY = {
  brand: AUTH_COPY.brand,
  title: 'Restablece tu contraseña',
  subtitle: 'Ingresa el token que recibiste y elige tu nueva contraseña.',
  fields: {
    token: { label: 'Token de recuperación', placeholder: 'Pega aquí el token recibido' },
    newPassword: { label: 'Nueva contraseña', placeholder: AUTH_COPY.passwordPolicy.placeholder },
  },
  errors: {
    token: 'Ingresa el token que recibiste.',
    newPassword: AUTH_COPY.passwordPolicy.error,
    fallback: 'No se pudo restablecer la contraseña.',
  },
  actions: {
    submit: 'Restablecer contraseña',
    submitting: 'Restableciendo…',
    showPassword: AUTH_COPY.passwordToggle.show,
    hidePassword: AUTH_COPY.passwordToggle.hide,
  },
  success: { cta: 'Ir a iniciar sesión' },
  rememberedPassword: {
    prompt: AUTH_COPY.rememberedPassword.prompt,
    cta: AUTH_COPY.signIn.cta,
  },
} as const;
