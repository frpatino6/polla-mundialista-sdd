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
