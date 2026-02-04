import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';

import { PreferenceCard } from '../../data/preference-card.model';
import { PreferenceCardStore } from '../../data/preference-card-store.service';

@Component({
  selector: 'app-preference-card-print',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './preference-card-print.component.html',
  styleUrl: './preference-card-print.component.scss',
})
export class PreferenceCardPrintComponent {
  readonly card = signal<PreferenceCard | null>(null);

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

  print(): void {
    window.print();
  }
}
