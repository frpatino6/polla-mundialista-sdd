/**
 * Roles soportados por la API, tal como viajan en el JSON (string, no numérico)
 * gracias a JsonStringEnumConverter en el backend (ver Program.cs).
 */
export type UserRole = 'User' | 'Admin';

/** Espejo de PollaMundialista.Application.Dtos.UserDto */
export interface UserDto {
  id: string;
  email: string;
  role: UserRole;
}

/** Espejo de PollaMundialista.Application.Dtos.LoginResultDto */
export interface LoginResultDto {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
}

/** Sesión persistida en localStorage, construida a partir de LoginResultDto */
export interface Session {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Espejo de PollaMundialista.Application.Dtos.ForgotPasswordResultDto.
 * Siempre trae el mismo mensaje genérico, exista o no el email (anti-enumeración,
 * docs/design.md §7.2): el status y el body son indistinguibles en ambos casos.
 */
export interface ForgotPasswordResultDto {
  message: string;
}

/** Espejo de PollaMundialista.Application.Dtos.ResetPasswordResultDto */
export interface ResetPasswordResultDto {
  message: string;
}
