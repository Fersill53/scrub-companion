/*
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
*

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { PreferenceCardStore } from './data/preference-card-store.service';
import { PreferenceCard } from './data/preference-card.model';

@Component({
  selector: 'app-preference-cards',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
  ],
  templateUrl: './preference-cards.component.html',
  styleUrl: './preference-cards.component.scss',
})
export class PreferenceCardsComponent {
  private readonly store = inject(PreferenceCardStore);

  readonly query = signal('');
  readonly cards = signal<PreferenceCard[]>(this.store.getAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.cards();

    return this.cards().filter(c => {
      const hay = [c.title, c.procedure, c.specialty ?? '', c.surgeon ?? '', ...(c.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });
}
*

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PreferenceCardStore } from './data/preference-card-store.service';
import { PreferenceCard } from './data/preference-card.model';

@Component({
  selector: 'app-preference-cards',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSnackBarModule,
  ],
  templateUrl: './preference-cards.component.html',
  styleUrl: './preference-cards.component.scss',
})
export class PreferenceCardsComponent {
  private readonly store = inject(PreferenceCardStore);
  private readonly snack = inject(MatSnackBar);

  readonly query = signal('');
  readonly cards = signal<PreferenceCard[]>(this.store.getAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.cards();

    return this.cards().filter(c => {
      const hay = [
        c.title ?? '',
        c.procedure ?? '',
        c.specialty ?? '',
        c.surgeon ?? '',
        ...(c.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });
  });

  refresh(): void {
    this.cards.set(this.store.getAll());
    this.snack.open('Preference cards refreshed.', 'OK', { duration: 1600 });
  }

  clearSearch(): void {
    this.query.set('');
  }

  deleteCard(id: string): void {
    const s = this.store as unknown as { delete?: (id: string) => void; remove?: (id: string) => void };

    if (typeof s.delete === 'function') s.delete(id);
    else if (typeof s.remove === 'function') s.remove(id);

    this.cards.set(this.store.getAll());
    this.snack.open('Preference card deleted.', 'OK', { duration: 1800 });
  }
}
*/

// This is not correct and import routerlink correctly

/*
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { PreferenceCardStore } from './data/preference-card-store.service';
import { PreferenceCard } from './data/preference-card.model';

@Component({
  selector: 'app-preference-cards',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './preference-cards.component.html',
  styleUrl: './preference-cards.component.scss',
})
export class PreferenceCardsComponent {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly store = inject(PreferenceCardStore);

  readonly query = signal<string>('');

  // Reloadable source list
  readonly cards = signal<PreferenceCard[]>(this.store.getAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.cards();

    return this.cards().filter(c => {
      const tags = Array.isArray(c.tags) ? c.tags.join(' ') : '';
      const hay = `${c.title ?? ''} ${c.procedure ?? ''} ${c.surgeon ?? ''} ${tags}`.toLowerCase();
      return hay.includes(q);
    });
  });

  newCard(): void {
    // Force navigation even if routerLink is being ignored or click is intercepted
    this.router.navigateByUrl('/preference-cards/editor');
  }

  refresh(): void {
    this.cards.set(this.store.getAll());
    this.snack.open('Refreshed.', 'OK', { duration: 1500 });
  }

  clearSearch(): void {
    this.query.set('');
  }

  openCard(id: string): void {
    this.router.navigate(['/preference-cards/view', id]);
  }

  deleteCard(id: string): void {
    // If your store has delete(), this will work. If it’s named differently, tell me the method name.
    const ok = confirm('Delete this preference card?');
    if (!ok) return;

    // ts-expect-error - in case your store typing differs slightly
    if (typeof this.store.delete === 'function') {
      // ts-expect-error
      this.store.delete(id);
    } else {
      // fallback: remove from local list only (store still needs real delete)
      this.snack.open('Store delete() not found. Tell me your store method name.', 'OK', { duration: 3500 });
    }

    this.cards.set(this.store.getAll());
    this.snack.open('Deleted.', 'OK', { duration: 1600 });
  }
}
*/

// this should help find out what is wrong...

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { PreferenceCardStore } from './data/preference-card-store.service';
import { PreferenceCard } from './data/preference-card.model';

@Component({
  selector: 'app-preference-cards',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './preference-cards.component.html',
  styleUrl: './preference-cards.component.scss',
})
export class PreferenceCardsComponent {
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly store = inject(PreferenceCardStore);

  readonly query = signal<string>('');
  readonly cards = signal<PreferenceCard[]>(this.store.getAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.cards();

    return this.cards().filter(c => {
      const tags = Array.isArray(c.tags) ? c.tags.join(' ') : '';
      const hay = `${c.title ?? ''} ${c.procedure ?? ''} ${c.surgeon ?? ''} ${tags}`.toLowerCase();
      return hay.includes(q);
    });
  });

  refresh(): void {
    this.cards.set(this.store.getAll());
    this.snack.open('Refreshed.', 'OK', { duration: 1200 });
  }

  clearSearch(): void {
    this.query.set('');
  }

  openCard(id: string): void {
    this.router.navigate(['/preference-cards/view', id]);
  }

  deleteCard(id: string): void {
    const ok = confirm('Delete this preference card?');
    if (!ok) return;

    // If your store uses a different method name, tell me what it is.
    // ts-expect-error
    if (typeof this.store.delete === 'function') {
      // ts-expect-error
      this.store.delete(id);
      this.cards.set(this.store.getAll());
      this.snack.open('Deleted.', 'OK', { duration: 1400 });
      return;
    }

    this.snack.open('Store delete() not found (tell me method name).', 'OK', { duration: 3000 });
  }

  newCard(): void {
    // If you don't see this snack, the click is being blocked by layout/CSS.
    this.snack.open('Opening editor…', 'OK', { duration: 900 });

    this.router
      .navigateByUrl('/preference-cards/editor')
      .then(ok => {
        if (!ok) {
          // Router refused navigation (route mismatch) — hard redirect as fallback
          this.snack.open('Router navigation failed — hard redirecting…', 'OK', { duration: 2000 });
          window.location.assign('/preference-cards/editor');
        }
      })
      .catch(err => {
        console.error(err);
        this.snack.open('Navigation error — hard redirecting…', 'OK', { duration: 2000 });
        window.location.assign('/preference-cards/editor');
      });
  }
}
