import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription, forkJoin, interval, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionsService } from '../../core/services/predictions.service';
import {
  MATCH_GROUP_LABELS,
  MatchDto,
  MatchGroup,
  PredictionHistoryEntryDto,
} from '../../core/models/predictions.models';

/** Cada cuántos ms se reevalúa si un partido ya arrancó (bloqueo por kickoff). */
const LOCK_CHECK_INTERVAL_MS = 30000;

type PredictionFormGroup = FormGroup<{
  homeScore: FormControl<number>;
  awayScore: FormControl<number>;
}>;

interface MatchViewModel {
  match: MatchDto;
  existingPrediction: PredictionHistoryEntryDto | null;
  form: PredictionFormGroup;
  locked: boolean;
  saving: boolean;
  errorMessage: string | null;
  savedMessage: string | null;
}

interface GroupSection {
  group: MatchGroup;
  label: string;
  matches: MatchViewModel[];
}

/**
 * Pantalla real de predicciones (Tarea #11). Reemplaza a predictions-placeholder.
 * Carga los partidos y el historial de predicciones del usuario, los combina en
 * un view model por partido y deshabilita el formulario de cada partido cuando
 * `now >= match.kickoffAt`, refrescando ese estado periódicamente mientras la
 * pantalla sigue abierta (sin recargar).
 */
@Component({
  imports: [ReactiveFormsModule, DatePipe],
  selector: 'app-predictions',
  styleUrl: './predictions.css',
  templateUrl: './predictions.html',
})
export class Predictions implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly matchesService = inject(MatchesService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly authService = inject(AuthService);

  readonly email = this.authService.currentUser?.email ?? null;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  private readonly groupA = signal<MatchViewModel[]>([]);
  private readonly groupB = signal<MatchViewModel[]>([]);

  readonly sections = computed<GroupSection[]>(() => [
    { group: 'A', label: MATCH_GROUP_LABELS['A'], matches: this.groupA() },
    { group: 'B', label: MATCH_GROUP_LABELS['B'], matches: this.groupB() },
  ]);

  private lockSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.lockSubscription?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  submit(vm: MatchViewModel): void {
    if (vm.locked || vm.form.invalid) {
      vm.form.markAllAsTouched();
      return;
    }

    vm.errorMessage = null;
    vm.savedMessage = null;
    vm.saving = true;
    this.notifyGroupsChanged();

    const { homeScore, awayScore } = vm.form.getRawValue();

    this.predictionsService.registerPrediction(vm.match.id, homeScore, awayScore).subscribe({
      next: (dto) => {
        vm.saving = false;
        vm.savedMessage = 'Predicción guardada.';
        vm.existingPrediction = {
          matchId: vm.match.id,
          homeTeam: vm.match.homeTeam,
          awayTeam: vm.match.awayTeam,
          predictedHomeScore: dto.predictedHomeScore,
          predictedAwayScore: dto.predictedAwayScore,
          actualHomeScore: vm.match.homeScore,
          actualAwayScore: vm.match.awayScore,
          pointsAwarded: dto.pointsAwarded,
        };
        this.notifyGroupsChanged();
      },
      error: (err) => {
        vm.saving = false;
        if (err?.status === 409) {
          // El chequeo de cliente (kickoffAt) quedó desincronizado con el reloj
          // del servidor: el partido ya inició. Reflejamos el bloqueo sin romper la pantalla.
          vm.locked = true;
          vm.form.disable();
          vm.errorMessage =
            err?.error?.message ?? 'El partido ya inició; no se puede registrar la predicción.';
        } else {
          vm.errorMessage = err?.error?.message ?? 'No se pudo guardar la predicción.';
        }
        this.notifyGroupsChanged();
      },
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      matches: this.matchesService.getMatches(),
      history: this.predictionsService.getMyHistory(),
    }).subscribe({
      next: ({ matches, history }) => {
        const historyByMatchId = new Map(history.map((entry) => [entry.matchId, entry]));

        const viewModels = matches
          .slice()
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
          .map((match) => this.createViewModel(match, historyByMatchId.get(match.id) ?? null));

        this.groupA.set(viewModels.filter((vm) => vm.match.group === 'A'));
        this.groupB.set(viewModels.filter((vm) => vm.match.group === 'B'));
        this.loading.set(false);
        this.startLockWatcher();
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('No se pudieron cargar los partidos. Intenta nuevamente más tarde.');
      },
    });
  }

  private createViewModel(
    match: MatchDto,
    existingPrediction: PredictionHistoryEntryDto | null,
  ): MatchViewModel {
    const form = this.fb.nonNullable.group({
      homeScore: [
        existingPrediction?.predictedHomeScore ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      awayScore: [
        existingPrediction?.predictedAwayScore ?? 0,
        [Validators.required, Validators.min(0)],
      ],
    });

    const locked = this.isLocked(match);
    if (locked) {
      form.disable();
    }

    return {
      match,
      existingPrediction,
      form,
      locked,
      saving: false,
      errorMessage: null,
      savedMessage: null,
    };
  }

  private isLocked(match: MatchDto): boolean {
    return new Date() >= new Date(match.kickoffAt);
  }

  private startLockWatcher(): void {
    this.lockSubscription = interval(LOCK_CHECK_INTERVAL_MS)
      .pipe(startWith(0))
      .subscribe(() => this.refreshLockState());
  }

  private refreshLockState(): void {
    let changed = false;

    for (const vm of [...this.groupA(), ...this.groupB()]) {
      const locked = this.isLocked(vm.match);
      if (locked !== vm.locked) {
        vm.locked = locked;
        if (locked) {
          vm.form.disable();
        } else {
          vm.form.enable();
        }
        changed = true;
      }
    }

    if (changed) {
      this.notifyGroupsChanged();
    }
  }

  /**
   * Fuerza una re-renderización de las secciones. Necesario porque esta app corre
   * sin zone.js (Angular zoneless, ver frontend/src/main.ts y app.config.ts): mutar
   * campos de un MatchViewModel en el sitio no dispara detección de cambios por sí
   * solo, así que reemplazamos la referencia del array que respalda cada signal de
   * grupo para que Angular vuelva a leer el estado actualizado.
   */
  private notifyGroupsChanged(): void {
    this.groupA.set([...this.groupA()]);
    this.groupB.set([...this.groupB()]);
  }
}
