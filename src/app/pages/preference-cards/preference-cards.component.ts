import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { PreferenceCard } from './data/preference-card.model';
import { PreferenceCardStore } from './data/preference-card-store.service';

@Component({
  selector: 'app-preference-cards',
  standalone: true,
  imports: [
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './preference-cards.component.html',
  styleUrl: './preference-cards.component.scss',
})
export class PreferenceCardsComponent {
  readonly query = signal('');
  readonly cards = signal<PreferenceCard[]>(this.store.getAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.cards();

    if (!q) return all;

    return all.filter(c => {
      const hay = [
        c.title,
        c.procedure,
        c.specialty,
        c.surgeon ?? '',
        c.facility ?? '',
        ...(c.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  });

  constructor(private readonly store: PreferenceCardStore) {}

  refresh(): void {
    this.cards.set(this.store.getAll());
  }

  clearSearch(): void {
    this.query.set('');
  }

  deleteCard(id: string): void {
    this.store.delete(id);
    this.refresh();
  }
}
