import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PreferenceCardStore } from '../preference-cards/data/preference-card-store.service';
import { PreferenceCard } from '../preference-cards/data/preference-card.model';

const PREFCARDS_KEY = 'scrubcompanion_prefcards_v1';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly appName = 'Scrub Companion';
  readonly versionLabel = 'v0.1 (local-first)';

  readonly lastBackupName = signal<string>('');
  readonly lastImportedName = signal<string>('');

  readonly cardCount = computed(() => this.store.getAll().length);

  constructor(
    private readonly store: PreferenceCardStore,
    private readonly snack: MatSnackBar
  ) {}

  exportPreferenceCards(): void {
    const cards = this.store.getAll();
    const payload = {
      app: this.appName,
      type: 'preference-cards',
      exportedAt: new Date().toISOString(),
      count: cards.length,
      data: cards,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const fileName = `preference-cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    this.lastBackupName.set(fileName);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    this.snack.open(`Exported ${cards.length} card(s).`, 'OK', { duration: 2500 });
  }

  async importPreferenceCardsFromFile(file: File | null): Promise<void> {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      // Accept either our wrapped payload { data: PreferenceCard[] } or a raw array PreferenceCard[]
      const cards = this.extractCards(parsed);

      if (!cards) {
        this.snack.open('That file does not look like a preference card backup.', 'OK', { duration: 3500 });
        return;
      }

      // Basic sanity checks: ensure each has id/title/procedure fields
      const cleaned = cards
        .filter(c => c && typeof c.id === 'string')
        .map(c => ({
          ...c,
          tags: Array.isArray(c.tags) ? c.tags : [],
          equipment: Array.isArray(c.equipment) ? c.equipment : [],
          instruments: Array.isArray(c.instruments) ? c.instruments : [],
          supplies: Array.isArray(c.supplies) ? c.supplies : [],
          sutures: Array.isArray(c.sutures) ? c.sutures : [],
        }));

      localStorage.setItem(PREFCARDS_KEY, JSON.stringify(cleaned));
      this.lastImportedName.set(file.name);

      this.snack.open(`Imported ${cleaned.length} card(s).`, 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Could not read that file. Make sure it is valid JSON.', 'OK', { duration: 3500 });
    }
  }

  clearAllPreferenceCards(): void {
    localStorage.removeItem(PREFCARDS_KEY);
    this.snack.open('All preference cards cleared (local).', 'OK', { duration: 3000 });
  }

  private extractCards(input: unknown): PreferenceCard[] | null {
    // Wrapped payload
    if (input && typeof input === 'object' && 'data' in (input as Record<string, unknown>)) {
      const data = (input as Record<string, unknown>)['data'];
      if (Array.isArray(data)) return data as PreferenceCard[];
    }
    // Raw array
    if (Array.isArray(input)) return input as PreferenceCard[];

    return null;
  }
}
