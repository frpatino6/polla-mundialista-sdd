export const FORGOT_PASSWORD_COPY = {
  brand: 'Polla Mundialista',
  title: 'Recupera tu contraseña',
  subtitle:
    'Ingresa el email de tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.',
  fields: {
    email: { label: 'Email', placeholder: 'tu@email.com' },
  },
  errors: {
    email: 'Ingresa un email válido.',
    request: 'No se pudo enviar la solicitud. Intenta de nuevo.',
  },
  actions: {
    submit: 'Enviar instrucciones',
    submitting: 'Enviando…',
  },
  rememberedPassword: { prompt: '¿Recordaste tu contraseña?', cta: 'Inicia sesión' },
} as const;
