import { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { PreferenceCardsComponent } from './pages/preference-cards/preference-cards.component';
import { PreferenceCardEditorComponent } from './pages/preference-cards/editor/preference-card-editor/preference-card-editor.component';
import { PreferenceCardViewComponent } from './pages/preference-cards/view/preference-card-view/preference-card-view.component';
import { PreferenceCardPrintComponent } from './pages/preference-cards/print/preference-card-print/preference-card-print.component';

import { PlaybooksComponent } from './pages/playbooks/playbooks.component';
import { SetupBuilderComponent } from './pages/setup-builder/setup-builder.component';
import { StudyCenterComponent } from './pages/study-center/study-center.component';
import { SmartSearchComponent } from './pages/smart-search/smart-search.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: DashboardComponent, title: 'Dashboard' },

      // Preference Cards (ALL under pages/preference-cards/)
      { path: 'cards', component: PreferenceCardsComponent, title: 'Preference Cards' },
      { path: 'cards/new', component: PreferenceCardEditorComponent, title: 'New Preference Card' },
      { path: 'cards/:id', component: PreferenceCardViewComponent, title: 'Preference Card' },
      { path: 'cards/:id/edit', component: PreferenceCardEditorComponent, title: 'Edit Preference Card' },
      { path: 'cards/:id/print', component: PreferenceCardPrintComponent, title: 'Print Preference Card' },

      // Other sections
      { path: 'playbooks', component: PlaybooksComponent, title: 'Playbooks' },
      { path: 'setup', component: SetupBuilderComponent, title: 'OR Setup Builder' },
      { path: 'study', component: StudyCenterComponent, title: 'Study Center' },
      { path: 'search', component: SmartSearchComponent, title: 'Smart Search' },
      { path: 'profile', component: ProfileComponent, title: 'Profile' },

      { path: '**', redirectTo: '' },
    ],
  },
];
