import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

import { PreferenceCard } from '../../data/preference-card.model';
import { PreferenceCardStore } from '../../data/preference-card-store.service';

@Component({
  selector: 'app-preference-card-view',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
  ],
  templateUrl: './preference-card-view.component.html',
  styleUrl: './preference-card-view.component.scss',
})
export class PreferenceCardViewComponent {
  readonly card = signal<PreferenceCard | null>(null);

  readonly titleText = computed(() => this.card()?.title || '(Untitled Card)');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly store: PreferenceCardStore
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/cards');
      return;
    }

    const found = this.store.getById(id);
    if (!found) {
      this.router.navigateByUrl('/cards');
      return;
    }

    this.card.set(found);
  }
}
