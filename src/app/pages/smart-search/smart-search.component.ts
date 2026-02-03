import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

type SearchKind = 'prefcard' | 'playbook' | 'setup';

type SearchResult = {
  kind: SearchKind;
  id: string;

  title: string;
  subtitle: string;

  tags: string[];
  matchedIn: string[];     // fields that matched (for UI)
  snippet: string;         // small preview snippet
  updatedAt?: string;      // ISO if available
};

type PrefCard = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  tags?: string[];
  positioning?: string;
  prepDrape?: string;
  pearls?: string;
  equipment?: { name: string; notes?: string }[];
  instruments?: { name: string; notes?: string }[];
  supplies?: { name: string; notes?: string }[];
  sutures?: { name: string; notes?: string }[];
  updatedAt?: string;
};

type SetupPlan = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  room?: { name: string; notes?: string }[];
  backTable?: { name: string; notes?: string }[];
  mayo?: { name: string; notes?: string }[];
  equipment?: { name: string; notes?: string }[];
  notes?: string;
  updatedAt?: string;
};

type Playbook = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  tags?: string[];
  pearls?: string;
  phases?: {
    name: string;
    goal?: string;
    steps?: { text: string; cue?: string; role?: string; priority?: string }[];
  }[];
  updatedAt?: string;
};

const KEY_PREFCARDS = 'scrubcompanion_prefcards_v1';
const KEY_SETUPS = 'scrubcompanion_setups_v1';
const KEY_PLAYBOOKS = 'scrubcompanion_playbooks_v1';

function safeParseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function clampSnippet(s: string, max = 140): string {
  const t = (s ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

@Component({
  selector: 'app-search',
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
  ],
  templateUrl: './smart-search.component.html',
  styleUrl: './smart-search.component.scss',
})
export class SearchComponent {
  readonly query = signal('');
  readonly activeKinds = signal<SearchKind[]>(['prefcard', 'playbook', 'setup']);

  // load on entry (local-first)
  readonly prefCards = signal<PrefCard[]>(safeParseArray<PrefCard>(localStorage.getItem(KEY_PREFCARDS)));
  readonly setups = signal<SetupPlan[]>(safeParseArray<SetupPlan>(localStorage.getItem(KEY_SETUPS)));
  readonly playbooks = signal<Playbook[]>(safeParseArray<Playbook>(localStorage.getItem(KEY_PLAYBOOKS)));

  readonly totalCounts = computed(() => ({
    prefcard: this.prefCards().length,
    playbook: this.playbooks().length,
    setup: this.setups().length,
  }));

  readonly results = computed<SearchResult[]>(() => {
    const q = normalize(this.query());
    const kinds = new Set(this.activeKinds());

    if (!q) {
      // show “recent-ish” results when query is empty (top few each)
      const recents: SearchResult[] = [];
      if (kinds.has('prefcard')) recents.push(...this.prefCards().slice(0, 6).map(c => this.prefCardToResult(c, [])));
      if (kinds.has('playbook')) recents.push(...this.playbooks().slice(0, 6).map(p => this.playbookToResult(p, [])));
      if (kinds.has('setup')) recents.push(...this.setups().slice(0, 6).map(s => this.setupToResult(s, [])));
      return recents;
    }

    const out: SearchResult[] = [];

    if (kinds.has('prefcard')) {
      for (const c of this.prefCards()) {
        const hit = this.matchPrefCard(c, q);
        if (hit) out.push(hit);
      }
    }

    if (kinds.has('playbook')) {
      for (const p of this.playbooks()) {
        const hit = this.matchPlaybook(p, q);
        if (hit) out.push(hit);
      }
    }

    if (kinds.has('setup')) {
      for (const s of this.setups()) {
        const hit = this.matchSetup(s, q);
        if (hit) out.push(hit);
      }
    }

    // Sort: quick heuristic — title/procedure hits first, then updatedAt desc if present
    out.sort((a, b) => {
      const aPrimary = a.matchedIn.includes('title') || a.matchedIn.includes('procedure');
      const bPrimary = b.matchedIn.includes('title') || b.matchedIn.includes('procedure');
      if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;

      const ad = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bd = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bd - ad;
    });

    return out;
  });

  readonly resultCount = computed(() => this.results().length);

  isKindActive(k: SearchKind): boolean {
    return this.activeKinds().includes(k);
  }

  toggleKind(k: SearchKind): void {
    const cur = this.activeKinds();
    if (cur.includes(k)) {
      const next = cur.filter(x => x !== k);
      this.activeKinds.set(next.length ? next : cur); // don’t allow “none”
      return;
    }
    this.activeKinds.set([...cur, k]);
  }

  clearQuery(): void {
    this.query.set('');
  }

  refreshFromStorage(): void {
    this.prefCards.set(safeParseArray<PrefCard>(localStorage.getItem(KEY_PREFCARDS)));
    this.setups.set(safeParseArray<SetupPlan>(localStorage.getItem(KEY_SETUPS)));
    this.playbooks.set(safeParseArray<Playbook>(localStorage.getItem(KEY_PLAYBOOKS)));
  }

  labelForKind(k: SearchKind): string {
    if (k === 'prefcard') return 'Preference Cards';
    if (k === 'playbook') return 'Playbooks';
    return 'Setups';
  }

  iconForKind(k: SearchKind): string {
    if (k === 'prefcard') return 'assignment';
    if (k === 'playbook') return 'menu_book';
    return 'view_quilt';
  }

  // ---------- matching ----------
  private matchPrefCard(c: PrefCard, q: string): SearchResult | null {
    const matchedIn: string[] = [];
    const tags = c.tags ?? [];

    const fields: Array<[string, string]> = [
      ['title', c.title ?? ''],
      ['procedure', c.procedure ?? ''],
      ['specialty', c.specialty ?? ''],
      ['surgeon', c.surgeon ?? ''],
      ['facility', c.facility ?? ''],
      ['positioning', c.positioning ?? ''],
      ['prepDrape', c.prepDrape ?? ''],
      ['pearls', c.pearls ?? ''],
      ['tags', tags.join(' ')],
      ['equipment', (c.equipment ?? []).map(i => i.name).join(' ')],
      ['instruments', (c.instruments ?? []).map(i => i.name).join(' ')],
      ['supplies', (c.supplies ?? []).map(i => i.name).join(' ')],
      ['sutures', (c.sutures ?? []).map(i => i.name).join(' ')],
    ];

    for (const [key, val] of fields) {
      if (normalize(val).includes(q)) matchedIn.push(key);
    }

    if (!matchedIn.length) return null;

    return this.prefCardToResult(c, matchedIn);
  }

  private prefCardToResult(c: PrefCard, matchedIn: string[]): SearchResult {
    const subtitle = [c.specialty || '—', c.procedure || 'Procedure not set']
      .filter(Boolean)
      .join(' • ');

    const snippetSource =
      (matchedIn.includes('pearls') ? c.pearls :
        matchedIn.includes('positioning') ? c.positioning :
        matchedIn.includes('prepDrape') ? c.prepDrape :
        '') || '';

    const listHint = (() => {
      if (matchedIn.includes('instruments')) return 'Matched in instruments list';
      if (matchedIn.includes('supplies')) return 'Matched in supplies list';
      if (matchedIn.includes('sutures')) return 'Matched in sutures list';
      if (matchedIn.includes('equipment')) return 'Matched in equipment list';
      return '';
    })();

    return {
      kind: 'prefcard',
      id: c.id,
      title: c.title || '(Untitled Card)',
      subtitle,
      tags: c.tags ?? [],
      matchedIn: uniq(matchedIn),
      snippet: clampSnippet(listHint || snippetSource || c.pearls || ''),
      updatedAt: c.updatedAt,
    };
  }

  private matchSetup(s: SetupPlan, q: string): SearchResult | null {
    const matchedIn: string[] = [];

    const fields: Array<[string, string]> = [
      ['title', s.title ?? ''],
      ['procedure', s.procedure ?? ''],
      ['specialty', s.specialty ?? ''],
      ['surgeon', s.surgeon ?? ''],
      ['facility', s.facility ?? ''],
      ['notes', s.notes ?? ''],
      ['room', (s.room ?? []).map(i => i.name).join(' ')],
      ['backTable', (s.backTable ?? []).map(i => i.name).join(' ')],
      ['mayo', (s.mayo ?? []).map(i => i.name).join(' ')],
      ['equipment', (s.equipment ?? []).map(i => i.name).join(' ')],
    ];

    for (const [key, val] of fields) {
      if (normalize(val).includes(q)) matchedIn.push(key);
    }

    if (!matchedIn.length) return null;

    return this.setupToResult(s, matchedIn);
  }

  private setupToResult(s: SetupPlan, matchedIn: string[]): SearchResult {
    const subtitle = [s.specialty || '—', s.procedure || 'Procedure not set']
      .filter(Boolean)
      .join(' • ');

    const where =
      matchedIn.includes('room') ? 'Matched in room checklist' :
      matchedIn.includes('backTable') ? 'Matched in back table list' :
      matchedIn.includes('mayo') ? 'Matched in mayo list' :
      matchedIn.includes('equipment') ? 'Matched in equipment list' :
      matchedIn.includes('notes') ? 'Matched in notes' :
      '';

    return {
      kind: 'setup',
      id: s.id,
      title: s.title || '(Untitled Setup)',
      subtitle,
      tags: [],
      matchedIn: uniq(matchedIn),
      snippet: clampSnippet(where || s.notes || ''),
      updatedAt: s.updatedAt,
    };
  }

  private matchPlaybook(p: Playbook, q: string): SearchResult | null {
    const matchedIn: string[] = [];
    const tags = p.tags ?? [];

    const phaseText = (p.phases ?? [])
      .flatMap(ph => [
        ph.name,
        ph.goal ?? '',
        ...(ph.steps ?? []).map(st => `${st.text} ${st.cue ?? ''} ${st.role ?? ''} ${st.priority ?? ''}`),
      ])
      .join(' ');

    const fields: Array<[string, string]> = [
      ['title', p.title ?? ''],
      ['procedure', p.procedure ?? ''],
      ['specialty', p.specialty ?? ''],
      ['surgeon', p.surgeon ?? ''],
      ['tags', tags.join(' ')],
      ['pearls', p.pearls ?? ''],
      ['phases', phaseText],
    ];

    for (const [key, val] of fields) {
      if (normalize(val).includes(q)) matchedIn.push(key);
    }

    if (!matchedIn.length) return null;

    return this.playbookToResult(p, matchedIn);
  }

  private playbookToResult(p: Playbook, matchedIn: string[]): SearchResult {
    const subtitle = [p.specialty || '—', p.procedure || 'Procedure not set']
      .filter(Boolean)
      .join(' • ');

    const where =
      matchedIn.includes('phases') ? 'Matched inside steps/phases' :
      matchedIn.includes('pearls') ? 'Matched in pearls' :
      '';

    return {
      kind: 'playbook',
      id: p.id,
      title: p.title || '(Untitled Playbook)',
      subtitle,
      tags: p.tags ?? [],
      matchedIn: uniq(matchedIn),
      snippet: clampSnippet(where || p.pearls || ''),
      updatedAt: p.updatedAt,
    };
  }
}
