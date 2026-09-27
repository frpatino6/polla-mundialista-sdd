import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Navbar } from '../../core/components/navbar/navbar';
import { AdminService } from '../../core/services/admin.service';
import { MatchesService } from '../../core/services/matches.service';
import {
  MATCH_GROUP_LABELS,
  MatchDto,
  teamFlag,
  teamInitials,
} from '../../core/models/predictions.models';
import { ADMIN_MATCHES_COPY } from './admin-matches.copy';

type ResultFormGroup = FormGroup<{
  homeScore: FormControl<number>;
  awayScore: FormControl<number>;
}>;

interface AdminMatchViewModel {
  match: MatchDto;
  form: ResultFormGroup;
  saving: boolean;
  errorMessage: string | null;
  savedMessage: string | null;
}

/**
 * Panel Admin (Tarea #12). Lista los 12 partidos y permite cargar/corregir
 * el resultado real de cada uno vía PUT /api/admin/matches/{id}/result.
 * El backend recalcula los puntos de las predicciones asociadas al guardar;
 * esta pantalla solo refleja el nuevo estado del partido (fila actualizada),
 * no el leaderboard/historial (Tarea #13, fuera de alcance aquí).
 *
 * A diferencia de Predicciones, acá los labels "Local" y "Visitante" quedan
 * visibles: el admin carga el marcador real, no una predicción, y las dos
 * columnas no se distinguen por el contexto visual de la card.
 */
@Component({
  imports: [ReactiveFormsModule, DatePipe, Navbar],
  selector: 'app-admin-matches',
  styleUrl: './admin-matches.css',
  templateUrl: './admin-matches.html',
})
export class AdminMatches implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly matchesService = inject(MatchesService);
  private readonly adminService = inject(AdminService);

  readonly groupLabels = MATCH_GROUP_LABELS;
  readonly teamFlag = teamFlag;
  readonly teamInitials = teamInitials;
  readonly copy = ADMIN_MATCHES_COPY;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  private readonly viewModels = signal<AdminMatchViewModel[]>([]);
  readonly matches = this.viewModels.asReadonly();

  ngOnInit(): void {
    this.loadMatches();
  }

  scoreId(vm: AdminMatchViewModel, side: 'home' | 'away'): string {
    return `admin-score-${side}-${vm.match.id}`;
  }

  hasResult(match: MatchDto): boolean {
    return match.homeScore !== null && match.awayScore !== null;
  }

  /**
   * Rótulo del badge de un partido ya jugado. `hasResult` ya garantiza que ambos
   * marcadores existen, pero el template no puede estrechar el tipo: se resuelve
   * con el mismo `?? 0` que usa el resto de la pantalla.
   */
  finishedStatus(match: MatchDto): string {
    return ADMIN_MATCHES_COPY.match.status.finished(match.homeScore ?? 0, match.awayScore ?? 0);
  }

  submit(vm: AdminMatchViewModel): void {
    if (vm.form.invalid) {
      vm.form.markAllAsTouched();
      return;
    }

    vm.errorMessage = null;
    vm.savedMessage = null;
    vm.saving = true;
    this.notifyChanged();

    const { homeScore, awayScore } = vm.form.getRawValue();

    this.adminService.submitMatchResult(vm.match.id, homeScore, awayScore).subscribe({
      next: (updatedMatch) => {
        vm.saving = false;
        vm.savedMessage = ADMIN_MATCHES_COPY.feedback.saved;
        vm.match = updatedMatch;
        vm.form.setValue({
          homeScore: updatedMatch.homeScore ?? 0,
          awayScore: updatedMatch.awayScore ?? 0,
        });
        this.notifyChanged();
      },
      error: (err) => {
        vm.saving = false;
        vm.errorMessage = err?.error?.message ?? ADMIN_MATCHES_COPY.feedback.saveError;
        this.notifyChanged();
      },
    });
  }

  private loadMatches(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.matchesService.getMatches().subscribe({
      next: (matches) => {
        const viewModels = matches
          .slice()
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
          .map((match) => this.createViewModel(match));

        this.viewModels.set(viewModels);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(ADMIN_MATCHES_COPY.states.loadError);
      },
    });
  }

  private createViewModel(match: MatchDto): AdminMatchViewModel {
    const form = this.fb.nonNullable.group({
      homeScore: [match.homeScore ?? 0, [Validators.required, Validators.min(0)]],
      awayScore: [match.awayScore ?? 0, [Validators.required, Validators.min(0)]],
    });

    return { match, form, saving: false, errorMessage: null, savedMessage: null };
  }

  /**
   * Reemplaza la referencia del array de view models en vez de mutar sus
   * elementos in-place: la app corre zoneless (ver predictions.ts, Tarea #11),
   * así que solo reemplazar la referencia que respalda el signal fuerza a
   * Angular a releer el estado actualizado de cada fila.
   */
  private notifyChanged(): void {
    this.viewModels.set([...this.viewModels()]);
  }
}
