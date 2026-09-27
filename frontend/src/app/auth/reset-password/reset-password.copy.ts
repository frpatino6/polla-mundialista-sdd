export const RESET_PASSWORD_COPY = {
  brand: 'Polla Mundialista',
  title: 'Restablece tu contraseña',
  subtitle: 'Ingresa el token que recibiste y elige tu nueva contraseña.',
  fields: {
    token: { label: 'Token de recuperación', placeholder: 'Pega aquí el token recibido' },
    newPassword: { label: 'Nueva contraseña', placeholder: 'Mínimo 8 caracteres' },
  },
  errors: {
    token: 'Ingresa el token que recibiste.',
    newPassword: 'La contraseña debe tener al menos 8 caracteres.',
    fallback: 'No se pudo restablecer la contraseña.',
  },
  actions: {
    submit: 'Restablecer contraseña',
    submitting: 'Restableciendo…',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  success: { cta: 'Ir a iniciar sesión' },
  rememberedPassword: { prompt: '¿Recordaste tu contraseña?', cta: 'Inicia sesión' },
} as const;
