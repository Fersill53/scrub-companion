import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

type NavItem = {
  label: string;
  icon: string;
  path: string;
  exact?: boolean;
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,

    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  readonly appTitle = 'Scrub Companion';
  readonly isSidenavOpen = signal(true);

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', path: '/', exact: true },
    { label: 'Schedule', icon: 'calendar_month', path: '/schedule', exact: false },
    { label: 'Preference Cards', icon: 'assignment', path: '/cards' },
    { label: 'OR Setup Builder', icon: 'view_quilt', path: '/setup' },
    { label: 'Playbooks', icon: 'menu_book', path: '/playbooks' },
    { label: 'Study Center', icon: 'school', path: '/study' },
    { label: 'Smart Search', icon: 'search', path: '/search' },
    { label: 'Profile', icon: 'person', path: '/profile' },
  ];

  toggleSidenav(): void {
    this.isSidenavOpen.update(v => !v);
  }
}
