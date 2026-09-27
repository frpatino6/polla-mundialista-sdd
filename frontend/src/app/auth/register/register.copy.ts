export const REGISTER_COPY = {
  brand: 'Polla Mundialista',
  title: 'Únete a la polla',
  subtitle:
    'Crea tu cuenta gratis y empieza a predecir los resultados de cada partido del Mundial.',
  fields: {
    email: { label: 'Email', placeholder: 'tu@email.com' },
    password: { label: 'Contraseña', placeholder: 'Mínimo 6 caracteres' },
  },
  errors: {
    email: 'Ingresa un email válido.',
    password: 'La contraseña debe tener al menos 6 caracteres.',
    fallback: 'No se pudo completar el registro.',
  },
  actions: {
    submit: 'Registrarme',
    submitting: 'Creando cuenta…',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
  },
  hasAccount: { prompt: '¿Ya tienes cuenta?', cta: 'Inicia sesión' },
} as const;
