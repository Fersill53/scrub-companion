/*
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
*/

//// MAKING IT MOBILE ////

import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

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
    CommonModule,
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
  private readonly router = inject(Router);
  private readonly bp = inject(BreakpointObserver);

  @ViewChild('sidenav') private sidenav?: MatSidenav;

  readonly appTitle = 'Scrub Companion';

  readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/', exact: true },
    { label: 'Preference Cards', icon: 'assignment', path: '/preference-cards' },
    { label: 'Playbooks', icon: 'menu_book', path: '/playbooks' },
    { label: 'OR Setup', icon: 'checklist', path: '/setup' },
    { label: 'Schedule', icon: 'calendar_month', path: '/schedule' },
    { label: 'Study Center', icon: 'school', path: '/study' },
    { label: 'Smart Search', icon: 'search', path: '/search' },
    { label: 'Profile', icon: 'person', path: '/profile' },
  ];

  // responsive
  readonly isHandset = signal(false);
  readonly sidenavMode = computed(() => (this.isHandset() ? 'over' : 'side'));

  // ✅ ONE source of truth. START CLOSED across ALL screen sizes.
  readonly sidenavOpen = signal(false);

  constructor() {
    // set handset flag; ALWAYS keep nav closed on breakpoint changes too
    this.bp.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe(result => {
      this.isHandset.set(result.matches);
      this.sidenavOpen.set(false);
      this.sidenav?.close();
    });

    // auto-close on route change (especially for mobile)
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.sidenavOpen.set(false);
        this.sidenav?.close();
      });
  }

  toggleSidenav(): void {
    const next = !this.sidenavOpen();
    this.sidenavOpen.set(next);

    // keep the actual MatSidenav in sync immediately
    if (next) this.sidenav?.open();
    else this.sidenav?.close();
  }

  onNavClick(): void {
    this.sidenavOpen.set(false);
    this.sidenav?.close();
  }

  onOpenedChange(open: boolean): void {
    // keep signal in sync if user closes via backdrop/esc
    this.sidenavOpen.set(open);
  }
}