import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription, forkJoin, interval, startWith } from 'rxjs';
import { Navbar } from '../../core/components/navbar/navbar';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionsService } from '../../core/services/predictions.service';
import {
  MATCH_GROUP_LABELS,
  MatchDto,
  MatchGroup,
  PredictionHistoryEntryDto,
  teamFlag,
  teamInitials,
} from '../../core/models/predictions.models';
import { PREDICTIONS_COPY } from './predictions.copy';

/** Cada cuántos ms se reevalúa si un partido ya arrancó (bloqueo por kickoff). */
const LOCK_CHECK_INTERVAL_MS = 30000;

/** Estado del badge de cada tarjeta: ya sumando puntos, guardada sin resultado, o sin predecir. */
type PredictionStatus = 'earned' | 'awaiting' | 'pending';

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
 *
 * Los partidos se muestran en pestañas por grupo (Grupo A por defecto). `sections`
 * sigue siendo la vista agrupada completa que consume el historial; la pantalla
 * usa `visibleMatches`, que es la sección de la pestaña activa.
 */
@Component({
  imports: [ReactiveFormsModule, DatePipe, Navbar],
  selector: 'app-predictions',
  styleUrl: './predictions.css',
  templateUrl: './predictions.html',
})
export class Predictions implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly matchesService = inject(MatchesService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly authService = inject(AuthService);

  /** Enlace al Panel Admin visible solo para el rol Admin (Tarea #12). */
  readonly isAdmin = this.authService.role === 'Admin';
  readonly copy = PREDICTIONS_COPY;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  private readonly groupA = signal<MatchViewModel[]>([]);
  private readonly groupB = signal<MatchViewModel[]>([]);

  readonly groupLabels = MATCH_GROUP_LABELS;
  readonly groups: readonly MatchGroup[] = ['A', 'B'];
  readonly teamFlag = teamFlag;
  readonly teamInitials = teamInitials;

  /** Pestaña de grupo visible; Grupo A por defecto. */
  readonly activeGroup = signal<MatchGroup>('A');
  readonly visibleMatches = computed<MatchViewModel[]>(() =>
    this.activeGroup() === 'A' ? this.groupA() : this.groupB(),
  );

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('groupTab');

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

  selectGroup(group: MatchGroup): void {
    this.activeGroup.set(group);
  }

  tabId(group: MatchGroup): string {
    return `group-tab-${group}`;
  }

  panelId(group: MatchGroup): string {
    return `group-panel-${group}`;
  }

  scoreId(vm: MatchViewModel, side: 'home' | 'away'): string {
    return `score-${side}-${vm.match.id}`;
  }

  matchesIn(group: MatchGroup): number {
    return (group === 'A' ? this.groupA() : this.groupB()).length;
  }

  /** Flechas ← → y Home/End para recorrer el tablist, como espera el patrón ARIA de tabs. */
  onTabKeydown(event: KeyboardEvent, group: MatchGroup): void {
    const current = this.groups.indexOf(group);
    let next: number;

    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % this.groups.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + this.groups.length) % this.groups.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = this.groups.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = this.groups[next];
    this.selectGroup(target);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  statusOf(vm: MatchViewModel): PredictionStatus {
    const points = this.pointsOf(vm);
    if (points > 0) {
      return 'earned';
    }
    return vm.existingPrediction ? 'awaiting' : 'pending';
  }

  pointsOf(vm: MatchViewModel): number {
    return vm.existingPrediction?.pointsAwarded ?? 0;
  }

  hasResult(match: MatchDto): match is MatchDto & { homeScore: number; awayScore: number } {
    return match.homeScore !== null && match.awayScore !== null;
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
        vm.savedMessage = PREDICTIONS_COPY.feedback.saved;
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
          vm.errorMessage = err?.error?.message ?? PREDICTIONS_COPY.feedback.kickoffConflict;
        } else {
          vm.errorMessage = err?.error?.message ?? PREDICTIONS_COPY.feedback.saveError;
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
        this.loadError.set(PREDICTIONS_COPY.states.loadError);
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
