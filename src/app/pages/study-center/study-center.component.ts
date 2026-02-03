import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type StudyModuleKey = 'flashcards' | 'quiz' | 'microlearning' | 'checkoffs';

type StudyProgress = {
  lastModule?: StudyModuleKey;
  lastOpenedAt?: string; // ISO
  flashcardsReviewed?: number;
  quizAttempts?: number;
  microLessonsCompleted?: number;
  checkoffsCompleted?: number;
};

const STORAGE_KEY = 'scrubcompanion_study_progress_v1';

function loadProgress(): StudyProgress {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StudyProgress;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(p: StudyProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './study-center.component.html',
  styleUrl: './study-center.component.scss',
})
export class StudyComponent {
  readonly progress = signal<StudyProgress>(loadProgress());

  readonly lastModuleLabel = computed(() => {
    const key = this.progress().lastModule;
    if (!key) return 'Nothing yet';
    if (key === 'flashcards') return 'Flashcards';
    if (key === 'quiz') return 'Quiz';
    if (key === 'microlearning') return 'Microlearning';
    return 'Checkoffs';
  });

  readonly stats = computed(() => {
    const p = this.progress();
    return {
      flashcardsReviewed: p.flashcardsReviewed ?? 0,
      quizAttempts: p.quizAttempts ?? 0,
      microLessonsCompleted: p.microLessonsCompleted ?? 0,
      checkoffsCompleted: p.checkoffsCompleted ?? 0,
    };
  });

  constructor(private readonly snack: MatSnackBar) {}

  markOpened(module: StudyModuleKey): void {
    const next: StudyProgress = {
      ...this.progress(),
      lastModule: module,
      lastOpenedAt: new Date().toISOString(),
    };
    this.progress.set(next);
    saveProgress(next);
  }

  resetStudyProgress(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.progress.set({});
    this.snack.open('Study progress cleared (local).', 'OK', { duration: 2500 });
  }
}
