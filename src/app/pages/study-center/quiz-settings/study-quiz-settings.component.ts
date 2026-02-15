import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

type QuizSettings = {
  timed: boolean;
  secondsPerQuestion: number; // used only if timed
  questionCount: number;
};

const KEY = 'scrubcompanion_quiz_settings_v1';

function loadSettings(): QuizSettings {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { timed: false, secondsPerQuestion: 30, questionCount: 10 };
  try {
    const p = JSON.parse(raw) as Partial<QuizSettings>;
    return {
      timed: !!p.timed,
      secondsPerQuestion: Number(p.secondsPerQuestion ?? 30),
      questionCount: Number(p.questionCount ?? 10),
    };
  } catch {
    return { timed: false, secondsPerQuestion: 30, questionCount: 10 };
  }
}

function saveSettings(s: QuizSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

@Component({
  selector: 'app-study-quiz-settings',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './study-quiz-settings.component.html',
  styleUrl: './study-quiz-settings.component.scss',
})
export class StudyQuizSettingsComponent {
  readonly settings = signal<QuizSettings>(loadSettings());

  readonly secondsOptions = [15, 20, 30, 45, 60, 90];
  readonly countOptions = [5, 10, 15, 20, 25];

  readonly summary = computed(() => {
    const s = this.settings();
    return s.timed
      ? `Timed • ${s.secondsPerQuestion}s/question • ${s.questionCount} questions`
      : `Untimed • ${s.questionCount} questions`;
  });

  toggleTimed(v: boolean): void {
    const next = { ...this.settings(), timed: v };
    this.settings.set(next);
    saveSettings(next);
  }

  setSeconds(v: number): void {
    const next = { ...this.settings(), secondsPerQuestion: v };
    this.settings.set(next);
    saveSettings(next);
  }

  setCount(v: number): void {
    const next = { ...this.settings(), questionCount: v };
    this.settings.set(next);
    saveSettings(next);
  }

  reset(): void {
    const next: QuizSettings = { timed: false, secondsPerQuestion: 30, questionCount: 10 };
    this.settings.set(next);
    saveSettings(next);
  }
}
