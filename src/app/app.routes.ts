/*
import { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { PreferenceCardsComponent } from './pages/preference-cards/preference-cards.component';
import { PreferenceCardEditorComponent } from './pages/preference-cards/editor/preference-card-editor/preference-card-editor.component';
import { PreferenceCardViewComponent } from './pages/preference-cards/view/preference-card-view/preference-card-view.component';
import { PreferenceCardPrintComponent } from './pages/preference-cards/print/preference-card-print/preference-card-print.component';

import { PlaybooksComponent } from './pages/playbooks/playbooks.component';
import { SetupBuilderComponent } from './pages/setup-builder/setup-builder.component';
import { StudyComponent } from './pages/study-center/study-center.component';
import { SearchComponent } from './pages/smart-search/smart-search.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: DashboardComponent, title: 'Dashboard' },

      // Preference Cards (ALL under pages/preference-cards/)
  {
    path: 'preference-cards',
    children: [
      { path: '', component: PreferenceCardsComponent, title: 'Preference Cards' },
      { path: 'editor', component: PreferenceCardEditorComponent, title: 'New Preference Card' },
      { path: 'preference-cards/:id', component: PreferenceCardViewComponent, title: 'Preference Card' },
      { path: 'preference-cards/:id/edit', component: PreferenceCardEditorComponent, title: 'Edit Preference Card' },
      { path: 'preference-cards/view/:id', component: PreferenceCardViewComponent, title: 'View Preference Card'},
      { path: 'preference-cards/:id/print', component: PreferenceCardPrintComponent, title: 'Print Preference Card' },
    ],
  },

      // Cards aliases (keeps older nav calls working)
      { path: 'cards', pathMatch: 'full', redirectTo: 'preference-cards' },
      { path: 'cards', pathMatch: 'full', redirectTo: 'preference-cards/view/:id' },

      // Other sections
      { path: 'playbooks', component: PlaybooksComponent, title: 'Playbooks' },
      { path: 'setup', component: SetupBuilderComponent, title: 'OR Setup Builder' },
      { path: 'study', component: StudyComponent, title: 'Study Center' },
      { path: 'search', component: SearchComponent, title: 'Smart Search' },
      { path: 'profile', component: ProfileComponent, title: 'Profile' },

      { path: '**', redirectTo: '' },
    ],
  },
];
*/

// Chats version

import { Routes } from '@angular/router';

import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

import { PreferenceCardsComponent } from './pages/preference-cards/preference-cards.component';
import { PreferenceCardEditorComponent } from './pages/preference-cards/editor/preference-card-editor/preference-card-editor.component';
import { PreferenceCardViewComponent } from './pages/preference-cards/view/preference-card-view/preference-card-view.component';
import { PreferenceCardPrintComponent } from './pages/preference-cards/print/preference-card-print/preference-card-print.component';

import { PlaybooksComponent } from './pages/playbooks/playbooks.component';
import { SetupBuilderComponent } from './pages/setup-builder/setup-builder.component';
import { StudyComponent } from './pages/study-center/study-center.component';
import { StudyQuizComponent } from './pages/study-center/quiz/study-quiz.component';
import { StudyQuizSettingsComponent } from './pages/study-center/quiz-settings/study-quiz-settings.component';
import { SearchComponent } from './pages/smart-search/smart-search.component';
import { ProfileComponent } from './pages/profile/profile.component';

import { ScheduleComponent } from './pages/schedule/schedule.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: DashboardComponent, title: 'Dashboard' },
      { path: 'schedule', component: ScheduleComponent, title: 'Schedule' },


      // ✅ Preference Cards
      { path: 'preference-cards', component: PreferenceCardsComponent, title: 'Preference Cards' },
      { path: 'preference-cards/editor', component: PreferenceCardEditorComponent, title: 'New Preference Card' },
      { path: 'preference-cards/editor/:id', component: PreferenceCardEditorComponent, title: 'Edit Preference Card' },
      { path: 'preference-cards/view/:id', component: PreferenceCardViewComponent, title: 'View Preference Card' },
      { path: 'preference-cards/print/:id', component: PreferenceCardPrintComponent, title: 'Print Preference Card' },

      // ✅ Cards aliases (only the ones that can actually be redirected)
      { path: 'cards', pathMatch: 'full', redirectTo: 'preference-cards' },

      // Other sections (keep your existing nav)
      { path: 'playbooks', component: PlaybooksComponent, title: 'Playbooks' },
      { path: 'setup', component: SetupBuilderComponent, title: 'OR Setup Builder' },
      { path: 'study', component: StudyComponent, title: 'Study Center' },
      { path: 'study/quiz', component: StudyQuizComponent, title: 'Quiz'},
      { path: 'study/quiz/settings', component: StudyQuizSettingsComponent},
      { path: 'search', component: SearchComponent, title: 'Smart Search' },
      { path: 'profile', component: ProfileComponent, title: 'Profile' },
      

      { path: '**', redirectTo: '' },
    ],
  },
];
