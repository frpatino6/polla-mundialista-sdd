import { Component, OnInit, inject, signal } from '@angular/core';
import { Navbar } from '../../core/components/navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { LeaderboardEntryDto } from '../../core/models/leaderboard.models';

/**
 * Leaderboard global (Tarea #13). Renderiza las filas EN EL MISMO ORDEN en
 * que llegan de GET /api/leaderboard: el backend ya aplica el criterio de
 * orden y desempate de docs/design.md §7 (TotalPoints desc, luego
 * ExactPredictions desc, luego Email asc) — este componente no reordena por
 * su cuenta.
 *
 * Cada `ngOnInit` dispara una llamada nueva a LeaderboardService.getLeaderboard()
 * (Observable en frío, sin operadores de cache), así que volver a esta
 * pantalla después de que Admin recalcule un resultado siempre trae el
 * ranking actualizado, nunca uno obsoleto.
 *
 * La fila del usuario en curso se resalta con un fondo tenue y, para no
 * depender solo del color, con un marcador de texto ("Vos" visible y
 * "(tu usuario)" solo para lectores de pantalla).
 */
@Component({
  imports: [Navbar],
  selector: 'app-leaderboard',
  styleUrl: './leaderboard.css',
  templateUrl: './leaderboard.html',
})
export class Leaderboard implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly authService = inject(AuthService);

  /** Email de la sesión en curso; null si no hay sesión (la fila no se resalta). */
  private readonly currentEmail = this.authService.currentUser?.email ?? null;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly entries = signal<LeaderboardEntryDto[]>([]);

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  isCurrentUser(entry: LeaderboardEntryDto): boolean {
    return this.currentEmail !== null && entry.email === this.currentEmail;
  }

  private loadLeaderboard(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.leaderboardService.getLeaderboard().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar el leaderboard. Intenta nuevamente más tarde.');
      },
    });
  }
}
