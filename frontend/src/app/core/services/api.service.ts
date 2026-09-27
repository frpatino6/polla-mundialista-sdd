import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Servicio base sobre HttpClient con la URL base de la API tomada de
 * environment.apiBaseUrl. Los servicios de feature (AuthService, etc.)
 * construyen sus URLs a partir de `baseUrl`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = environment.apiBaseUrl;
}
