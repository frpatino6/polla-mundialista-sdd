export const AUTH_COPY = {
  brand: 'Polla Mundialista',
  signIn: { cta: 'Inicia sesión' },
  rememberedPassword: { prompt: '¿Recordaste tu contraseña?' },
  emailField: {
    label: 'Email',
    placeholder: 'tu@email.com',
    error: 'Ingresa un email válido.',
  },
  passwordField: { label: 'Contraseña' },
  passwordPolicy: {
    placeholder: 'Mínimo 8 caracteres',
    error: 'La contraseña debe tener al menos 8 caracteres.',
  },
  passwordToggle: { show: 'Mostrar contraseña', hide: 'Ocultar contraseña' },
} as const;
