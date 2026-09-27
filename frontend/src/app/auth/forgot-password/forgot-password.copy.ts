import { AUTH_COPY } from '../../core/copy/auth.copy';

export const FORGOT_PASSWORD_COPY = {
  brand: AUTH_COPY.brand,
  title: 'Recupera tu contraseña',
  subtitle:
    'Ingresa el email de tu cuenta y te enviaremos instrucciones para restablecer tu contraseña.',
  fields: {
    email: { label: AUTH_COPY.emailField.label, placeholder: AUTH_COPY.emailField.placeholder },
  },
  errors: {
    email: AUTH_COPY.emailField.error,
    request: 'No se pudo enviar la solicitud. Intenta de nuevo.',
  },
  actions: {
    submit: 'Enviar instrucciones',
    submitting: 'Enviando…',
  },
  rememberedPassword: {
    prompt: AUTH_COPY.rememberedPassword.prompt,
    cta: AUTH_COPY.signIn.cta,
  },
} as const;
