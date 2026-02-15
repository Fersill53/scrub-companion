import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { QUIZ_BANK, QuizPack, QuizQuestion } from '../data/quiz-bank';

type QuizSettings = {
  timed: boolean;
  secondsPerQuestion: number;
  questionCount: number;
};

const SETTINGS_KEY = 'scrubcompanion_quiz_settings_v1';

function loadSettings(): QuizSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Mode = 'pick' | 'quiz' | 'results';

@Component({
  selector: 'app-study-quiz',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatRadioModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './study-quiz.component.html',
  styleUrl: './study-quiz.component.scss',
})
export class StudyQuizComponent {
  readonly packs = QUIZ_BANK;

  readonly mode = signal<Mode>('pick');

  readonly selectedPackId = signal<string>(this.packs[0]?.id ?? '');
  readonly settings = signal<QuizSettings>(loadSettings());

  readonly questions = signal<QuizQuestion[]>([]);
  readonly index = signal(0);
  readonly answers = signal<Record<string, string>>({}); // questionId -> choiceId

  readonly current = computed(() => this.questions()[this.index()] ?? null);

  readonly progressPct = computed(() => {
    const total = this.questions().length || 1;
    return Math.round(((this.index()) / total) * 100);
  });

  readonly isLast = computed(() => this.index() >= this.questions().length - 1);

  readonly canNext = computed(() => {
    const q = this.current();
    if (!q) return false;
    const a = this.answers()[q.id];
    return typeof a === 'string' && a.length > 0;
  });

  readonly score = computed(() => {
    const qs = this.questions();
    const map = this.answers();
    let correct = 0;
    qs.forEach(q => {
      if (map[q.id] === q.correctChoiceId) correct += 1;
    });
    return { correct, total: qs.length };
  });

  start(): void {
    const pack = this.getPack(this.selectedPackId());
    if (!pack) return;

    const count = Math.max(1, Math.min(this.settings().questionCount, pack.questions.length));
    const picked = shuffle(pack.questions).slice(0, count);

    this.questions.set(picked);
    this.index.set(0);
    this.answers.set({});
    this.mode.set('quiz');
  }

  pickPack(id: string): void {
    this.selectedPackId.set(id);
  }

  choose(choiceId: string): void {
    const q = this.current();
    if (!q) return;
    this.answers.set({ ...this.answers(), [q.id]: choiceId });
  }

  next(): void {
    if (!this.canNext()) return;
    if (this.isLast()) {
      this.mode.set('results');
      return;
    }
    this.index.set(this.index() + 1);
  }

  prev(): void {
    this.index.set(Math.max(0, this.index() - 1));
  }

  retryMissed(): void {
    const qs = this.questions();
    const map = this.answers();
    const missed = qs.filter(q => map[q.id] !== q.correctChoiceId);
    if (!missed.length) {
      // If none missed, just restart full quiz
      this.start();
      return;
    }
    this.questions.set(shuffle(missed));
    this.index.set(0);
    this.answers.set({});
    this.mode.set('quiz');
  }

  backToPick(): void {
    this.mode.set('pick');
  }

  private getPack(id: string): QuizPack | null {
    return this.packs.find(p => p.id === id) ?? null;
  }
}
