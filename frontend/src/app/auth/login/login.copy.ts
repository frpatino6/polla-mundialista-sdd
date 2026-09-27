export const LOGIN_COPY = {
  brand: 'Polla Mundialista',
  title: 'Bienvenido de nuevo',
  subtitle:
    'Predice los resultados del Mundial y compite en el leaderboard con el resto de la polla.',
  fields: {
    email: { label: 'Email', placeholder: 'tu@email.com' },
    password: { label: 'Contraseña', placeholder: '••••••••' },
  },
  errors: {
    email: 'Ingresa un email válido.',
    password: 'La contraseña debe tener al menos 6 caracteres.',
    fallback: 'Credenciales inválidas.',
  },
  actions: {
    submit: 'Ingresar',
    submitting: 'Ingresando…',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  rememberMe: 'Recordarme',
  forgotPassword: '¿Olvidaste tu contraseña?',
  noAccount: { prompt: '¿No tienes cuenta?', cta: 'Regístrate' },
} as const;
