import { Component, OnInit, inject, signal } from '@angular/core';
import { Navbar } from '../../core/components/navbar/navbar';
import { PredictionsService } from '../../core/services/predictions.service';
import {
  PredictionHistoryEntryDto,
  teamFlag,
  teamInitials,
} from '../../core/models/predictions.models';

/**
 * Historial personal de predicciones (Tarea #13). Reutiliza
 * PredictionsService.getMyHistory() (GET /api/predictions/me, ya existente
 * desde la Tarea #11) y lo presenta como tabla de solo lectura: predicción
 * propia, resultado real ("Pendiente" si el partido aún no se jugó) y puntos
 * obtenidos ("—" mientras esté pendiente).
 *
 * Los equipos se muestran con el mismo lenguaje visual de Predicciones: bandera
 * emoji cuando el fixture la tiene mapeada y, si no, un badge de iniciales,
 * siempre acompañado del nombre en texto.
 */
@Component({
  imports: [Navbar],
  selector: 'app-history',
  styleUrl: './history.css',
  templateUrl: './history.html',
})
export class History implements OnInit {
  private readonly predictionsService = inject(PredictionsService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly history = signal<PredictionHistoryEntryDto[]>([]);
  readonly teamFlag = teamFlag;
  readonly teamInitials = teamInitials;

  ngOnInit(): void {
    this.loadHistory();
  }

  isPending(entry: PredictionHistoryEntryDto): boolean {
    return entry.actualHomeScore === null || entry.actualAwayScore === null;
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.predictionsService.getMyHistory().subscribe({
      next: (history) => {
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudo cargar tu historial. Intenta nuevamente más tarde.');
      },
    });
  }
}
