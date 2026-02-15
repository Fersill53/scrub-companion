/*
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';

import { PreferenceCardStore } from '../../data/preference-card-store.service';
import { CaseItem, PreferenceCard, Specialty } from '../../data/preference-card.model';
import { CARD_TEMPLATES, CardTemplateId, getTemplateById } from '../../data/card-templates';

type ItemForm = FormGroup<{
  name: ReturnType<FormBuilder['nonNullable']['control']>;
  qty: ReturnType<FormBuilder['control']>;
  notes: ReturnType<FormBuilder['nonNullable']['control']>;
}>;

const SPECIALTIES: Specialty[] = [
  'General',
  'Ortho',
  'Neuro',
  'CV',
  'GYN',
  'ENT',
  'Plastics',
  'Urology',
  'Ophthalmology',
  'Other',
];

@Component({
  selector: 'app-preference-card-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
  ],
  templateUrl: './preference-card-editor.component.html',
  styleUrl: './preference-card-editor.component.scss',
})
export class PreferenceCardEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(PreferenceCardStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly specialties = SPECIALTIES;
  readonly templates = CARD_TEMPLATES;

  readonly isEditMode = signal(false);
  readonly loadedId = signal<string | null>(null);

  readonly tagDraft = signal('');

  readonly titleText = computed(() => (this.isEditMode() ? 'Edit Preference Card' : 'New Preference Card'));

  readonly form = this.fb.nonNullable.group({
    // basics
    id: this.fb.nonNullable.control(''),
    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control<Specialty>('Other'),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),
    tags: this.fb.nonNullable.control<string[]>([]),

    // setup
    positioning: this.fb.nonNullable.control(''),
    prepDrape: this.fb.nonNullable.control(''),
    equipment: this.fb.array<ItemForm>([]),

    // pick list
    instruments: this.fb.array<ItemForm>([]),
    supplies: this.fb.array<ItemForm>([]),
    sutures: this.fb.array<ItemForm>([]),

    // notes
    pearls: this.fb.nonNullable.control(''),
  });

  get equipmentFA() { return this.form.controls.equipment; }
  get instrumentsFA() { return this.form.controls.instruments; }
  get suppliesFA() { return this.form.controls.supplies; }
  get suturesFA() { return this.form.controls.sutures; }

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(pm => {
      const id = pm.get('id');

      if (!id) {
        // New card
        this.isEditMode.set(false);
        const blank = this.store.createBlank();
        this.patchFromCard(blank);
        return;
      }

      // Edit existing
      const found = this.store.getById(id);
      if (!found) {
        this.router.navigateByUrl('/cards');
        return;
      }

      this.isEditMode.set(true);
      this.loadedId.set(id);
      this.patchFromCard(found);
    });
  }

  onTemplateChange(ev: MatSelectChange): void {
    const templateId = ev.value as CardTemplateId;
    this.applyTemplate(templateId);
  }

  applyTemplate(templateId: CardTemplateId): void {
    const t = getTemplateById(templateId);
    if (!t) return;

    // Apply only the template sections — don’t overwrite title/procedure/surgeon user may already be typing
    this.form.controls.specialty.setValue(t.defaults.specialty);

    this.form.controls.positioning.setValue(t.defaults.positioning ?? '');
    this.form.controls.prepDrape.setValue(t.defaults.prepDrape ?? '');
    this.form.controls.pearls.setValue(t.defaults.pearls ?? '');

    // Merge tags unique
    const existing = new Set(this.form.controls.tags.value ?? []);
    for (const tag of t.defaults.tags ?? []) existing.add(tag);
    this.form.controls.tags.setValue([...existing]);

    this.replaceItems(this.equipmentFA, t.defaults.equipment ?? []);
    this.replaceItems(this.instrumentsFA, t.defaults.instruments ?? []);
    this.replaceItems(this.suppliesFA, t.defaults.supplies ?? []);
    this.replaceItems(this.suturesFA, t.defaults.sutures ?? []);
  }

  addTag(): void {
    const raw = this.tagDraft().trim();
    if (!raw) return;

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const existing = new Set(this.form.controls.tags.value ?? []);
    parts.forEach(p => existing.add(p));

    this.form.controls.tags.setValue([...existing]);
    this.tagDraft.set('');
  }

  removeTag(tag: string): void {
    this.form.controls.tags.setValue((this.form.controls.tags.value ?? []).filter(t => t !== tag));
  }

  addItem(list: 'equipment' | 'instruments' | 'supplies' | 'sutures'): void {
    this.getFA(list).push(this.makeItemFG({ name: '', qty: null, notes: '' }));
  }

  removeItem(list: 'equipment' | 'instruments' | 'supplies' | 'sutures', index: number): void {
    this.getFA(list).removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const card: Omit<PreferenceCard, 'createdAt' | 'updatedAt'> = {
      id: raw.id,
      title: raw.title,
      specialty: raw.specialty,
      procedure: raw.procedure,
      surgeon: raw.surgeon || '',
      facility: raw.facility || '',
      tags: raw.tags ?? [],

      positioning: raw.positioning || '',
      prepDrape: raw.prepDrape || '',
      equipment: this.readItems(this.equipmentFA),

      instruments: this.readItems(this.instrumentsFA),
      supplies: this.readItems(this.suppliesFA),
      sutures: this.readItems(this.suturesFA),

      pearls: raw.pearls || '',
    };

    const saved = this.store.upsert(card);
    this.router.navigate(['/cards', saved.id]);
  }

  cancel(): void {
    const id = this.loadedId();
    if (id) this.router.navigate(['/cards', id]);
    else this.router.navigateByUrl('/cards');
  }

  // ---------- helpers ----------
  private patchFromCard(card: PreferenceCard): void {
    this.form.controls.id.setValue(card.id);
    this.form.controls.title.setValue(card.title ?? '');
    this.form.controls.specialty.setValue(card.specialty ?? 'Other');
    this.form.controls.procedure.setValue(card.procedure ?? '');
    this.form.controls.surgeon.setValue(card.surgeon ?? '');
    this.form.controls.facility.setValue(card.facility ?? '');
    this.form.controls.tags.setValue(card.tags ?? []);

    this.form.controls.positioning.setValue(card.positioning ?? '');
    this.form.controls.prepDrape.setValue(card.prepDrape ?? '');
    this.form.controls.pearls.setValue(card.pearls ?? '');

    this.replaceItems(this.equipmentFA, card.equipment ?? []);
    this.replaceItems(this.instrumentsFA, card.instruments ?? []);
    this.replaceItems(this.suppliesFA, card.supplies ?? []);
    this.replaceItems(this.suturesFA, card.sutures ?? []);
  }

  private makeItemFG(item: CaseItem): ItemForm {
    return this.fb.nonNullable.group({
      name: this.fb.nonNullable.control(item.name ?? '', [Validators.required]),
      qty: this.fb.control<number | null>(item.qty ?? null),
      notes: this.fb.nonNullable.control(item.notes ?? ''),
    });
  }

  private replaceItems(fa: FormArray<ItemForm>, items: CaseItem[]): void {
    while (fa.length) fa.removeAt(0);
    items.forEach(i => fa.push(this.makeItemFG(i)));
  }

  private readItems(fa: FormArray<ItemForm>): CaseItem[] {
    return fa.controls
      .map(ctrl => ctrl.getRawValue())
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: (v.qty ?? null) as number | null,
        notes: (v.notes ?? '').trim(),
      }))
      .filter(i => i.name.length > 0);
  }

  private getFA(list: 'equipment' | 'instruments' | 'supplies' | 'sutures'): FormArray<ItemForm> {
    return this.form.controls[list] as unknown as FormArray<ItemForm>;
  }
}
*

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type Item = { name: string; qty?: number | null; notes?: string };
type PreferenceCard = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  tags: string[];
  positioning?: string;
  prepDrape?: string;
  pearls?: string;
  equipment: Item[];
  instruments: Item[];
  supplies: Item[];
  sutures: Item[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'scrubcompanion_prefcards_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'pc_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function safeLoadAll(): PreferenceCard[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PreferenceCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(cards: PreferenceCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

@Component({
  selector: 'app-preference-card-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './preference-card-editor.component.html',
  styleUrl: './preference-card-editor.component.scss',
})
export class PreferenceCardEditorComponent {
  readonly tagDraft = signal('');

  private readonly fb = new FormBuilder();

  readonly form = this.fb.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),
    tags: this.fb.nonNullable.control<string[]>([]),

    positioning: this.fb.nonNullable.control(''),
    prepDrape: this.fb.nonNullable.control(''),
    pearls: this.fb.nonNullable.control(''),

    equipment: this.fb.array([] as FormGroup[]),
    instruments: this.fb.array([] as FormGroup[]),
    supplies: this.fb.array([] as FormGroup[]),
    sutures: this.fb.array([] as FormGroup[]),
  });

  readonly editingId = signal<string | null>(null);

  readonly pageTitle = computed(() => (this.editingId() ? 'Edit Preference Card' : 'New Preference Card'));

  get equipmentFA(): FormArray<FormGroup> {
    return this.form.controls['equipment'] as unknown as FormArray<FormGroup>;
  }
  get instrumentsFA(): FormArray<FormGroup> {
    return this.form.controls['instruments'] as unknown as FormArray<FormGroup>;
  }
  get suppliesFA(): FormArray<FormGroup> {
    return this.form.controls['supplies'] as unknown as FormArray<FormGroup>;
  }
  get suturesFA(): FormArray<FormGroup> {
    return this.form.controls['sutures'] as unknown as FormArray<FormGroup>;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snack: MatSnackBar,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      const found = safeLoadAll().find(c => c.id === id);
      if (found) this.patchFromCard(found);
      else this.seedDefaults();
    } else {
      this.seedDefaults();
    }
  }

  // ---------- tags ----------
  addTag(): void {
    const raw = this.tagDraft().trim();
    if (!raw) return;

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const existing = new Set(this.form.controls.tags.value ?? []);
    parts.forEach(p => existing.add(p));

    this.form.controls.tags.setValue([...existing]);
    this.tagDraft.set('');
  }

  removeTag(tag: string): void {
    this.form.controls.tags.setValue((this.form.controls.tags.value ?? []).filter(t => t !== tag));
  }

  // ---------- items ----------
  addEquipment(): void {
    this.equipmentFA.push(this.makeItemFG());
  }
  removeEquipment(i: number): void {
    this.equipmentFA.removeAt(i);
  }

  addInstrument(): void {
    this.instrumentsFA.push(this.makeItemFG());
  }
  removeInstrument(i: number): void {
    this.instrumentsFA.removeAt(i);
  }

  addSupply(): void {
    this.suppliesFA.push(this.makeItemFG());
  }
  removeSupply(i: number): void {
    this.suppliesFA.removeAt(i);
  }

  addSuture(): void {
    this.suturesFA.push(this.makeItemFG());
  }
  removeSuture(i: number): void {
    this.suturesFA.removeAt(i);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Fix required fields (Title + Procedure).', 'OK', { duration: 2600 });
      return;
    }

    const raw = this.form.getRawValue() as unknown as {
      id: string;
      title: string;
      specialty: string;
      procedure: string;
      surgeon: string;
      facility: string;
      tags: string[];
      positioning: string;
      prepDrape: string;
      pearls: string;
    };

    const all = safeLoadAll();
    const existing = all.find(c => c.id === (raw.id || this.editingId() || ''));

    const card: PreferenceCard = {
      id: raw.id || existing?.id || safeUuid(),
      title: (raw.title ?? '').trim(),
      specialty: (raw.specialty ?? '').trim(),
      procedure: (raw.procedure ?? '').trim(),
      surgeon: (raw.surgeon ?? '').trim(),
      facility: (raw.facility ?? '').trim(),
      tags: raw.tags ?? [],
      positioning: (raw.positioning ?? '').trim(),
      prepDrape: (raw.prepDrape ?? '').trim(),
      pearls: (raw.pearls ?? '').trim(),

      equipment: this.readItems(this.equipmentFA),
      instruments: this.readItems(this.instrumentsFA),
      supplies: this.readItems(this.suppliesFA),
      sutures: this.readItems(this.suturesFA),

      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    const next = existing
      ? all.map(c => (c.id === card.id ? card : c))
      : [card, ...all];

    saveAll(next);

    this.snack.open('Preference card saved.', 'OK', { duration: 2200 });
    this.router.navigate(['/preference-cards/view', card.id]);
  }

  cancel(): void {
    const id = this.editingId();
    if (id) this.router.navigate(['/preference-cards/view', id]);
    else this.router.navigate(['/preference-cards']);
  }

  // ---------- helpers ----------
  private seedDefaults(): void {
    this.form.controls.id.setValue(safeUuid());
    this.form.controls.tags.setValue([]);

    // start with a couple rows so the page doesn’t look “empty”
    this.equipmentFA.push(this.makeItemFG());
    this.instrumentsFA.push(this.makeItemFG());
    this.suppliesFA.push(this.makeItemFG());
    this.suturesFA.push(this.makeItemFG());
  }

  private makeItemFG(v?: Item): FormGroup {
    return this.fb.group({
      name: this.fb.nonNullable.control((v?.name ?? ''), [Validators.required]),
      qty: this.fb.control<number | null>(v?.qty ?? null),
      notes: this.fb.nonNullable.control(v?.notes ?? ''),
    });
  }

  private readItems(arr: FormArray<FormGroup>): Item[] {
    return arr.controls
      .map(ctrl => ctrl.getRawValue() as unknown as { name: string; qty: number | null; notes: string })
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: v.qty ?? null,
        notes: (v.notes ?? '').trim(),
      }))
      .filter(x => x.name.length > 0);
  }

  private patchFromCard(c: PreferenceCard): void {
    this.form.controls.id.setValue(c.id);
    this.form.controls.title.setValue(c.title ?? '');
    this.form.controls.specialty.setValue(c.specialty ?? '');
    this.form.controls.procedure.setValue(c.procedure ?? '');
    this.form.controls.surgeon.setValue(c.surgeon ?? '');
    this.form.controls.facility.setValue(c.facility ?? '');
    this.form.controls.tags.setValue(c.tags ?? []);
    this.form.controls.positioning.setValue(c.positioning ?? '');
    this.form.controls.prepDrape.setValue(c.prepDrape ?? '');
    this.form.controls.pearls.setValue(c.pearls ?? '');

    this.replaceItems(this.equipmentFA, c.equipment ?? []);
    this.replaceItems(this.instrumentsFA, c.instruments ?? []);
    this.replaceItems(this.suppliesFA, c.supplies ?? []);
    this.replaceItems(this.suturesFA, c.sutures ?? []);
  }

  private replaceItems(arr: FormArray<FormGroup>, items: Item[]): void {
    while (arr.length) arr.removeAt(0);
    (items.length ? items : [{ name: '', qty: null, notes: '' }]).forEach(i => arr.push(this.makeItemFG(i)));
  }
}
*/

// Forgot to add the steps for the next button

/*
import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

type Item = { name: string; qty?: number | null; notes?: string };
type PreferenceCard = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  tags: string[];

  positioning?: string;
  prepDrape?: string;
  pearls?: string;

  equipment: Item[];
  instruments: Item[];
  supplies: Item[];
  sutures: Item[];

  createdAt: string;
  updatedAt: string;
};

type Template = {
  id: string;
  label: string;
  patch: Partial<PreferenceCard>;
};

const STORAGE_KEY = 'scrubcompanion_prefcards_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'pc_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function safeLoadAll(): PreferenceCard[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PreferenceCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(cards: PreferenceCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

@Component({
  selector: 'app-preference-card-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatStepperModule,
  ],
  templateUrl: './preference-card-editor.component.html',
  styleUrl: './preference-card-editor.component.scss',
})
export class PreferenceCardEditorComponent {
  // used by your HTML
  readonly specialties: string[] = [
    'Ortho',
    'Neuro',
    'General',
    'OB/GYN',
    'ENT',
    'Plastics',
    'Urology',
    'Vascular',
    'Cardiac',
    'Ophthalmology',
    'Peds',
  ];

  // used by your HTML
  readonly templates: Template[] = [
    {
      id: 'blank',
      label: 'Blank (no changes)',
      patch: {},
    },
    {
      id: 'ortho-basic',
      label: 'Ortho (basic skeleton)',
      patch: {
        specialty: 'Ortho',
        positioning: 'Supine (confirm surgeon preference)',
        prepDrape: 'Per surgeon preference; include stockinette if needed',
        equipment: [
          { name: 'Tourniquet', qty: 1, notes: 'If applicable' },
          { name: 'Bovie', qty: 1 },
          { name: 'Suction', qty: 1 },
        ],
      },
    },
    {
      id: 'lap-basic',
      label: 'General (lap basic skeleton)',
      patch: {
        specialty: 'General',
        equipment: [
          { name: 'Tower', qty: 1 },
          { name: 'Insufflator', qty: 1 },
          { name: 'Light source', qty: 1 },
          { name: 'Camera head', qty: 1 },
        ],
        supplies: [
          { name: 'Trocar set', qty: 1, notes: 'Sizes per surgeon' },
          { name: 'Endo bag', qty: 1 },
        ],
      },
    },
  ];

  readonly tagDraft = signal('');

  private readonly fb = new FormBuilder();

  readonly form = this.fb.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),
    tags: this.fb.nonNullable.control<string[]>([]),

    positioning: this.fb.nonNullable.control(''),
    prepDrape: this.fb.nonNullable.control(''),
    pearls: this.fb.nonNullable.control(''),

    equipment: this.fb.array([] as FormGroup[]),
    instruments: this.fb.array([] as FormGroup[]),
    supplies: this.fb.array([] as FormGroup[]),
    sutures: this.fb.array([] as FormGroup[]),
  });

  readonly editingId = signal<string | null>(null);

  // your HTML calls titleText()
  readonly titleText = computed(() => (this.editingId() ? 'Edit Preference Card' : 'New Preference Card'));

  get equipmentFA(): FormArray<FormGroup> {
    return this.form.controls['equipment'] as unknown as FormArray<FormGroup>;
  }
  get instrumentsFA(): FormArray<FormGroup> {
    return this.form.controls['instruments'] as unknown as FormArray<FormGroup>;
  }
  get suppliesFA(): FormArray<FormGroup> {
    return this.form.controls['supplies'] as unknown as FormArray<FormGroup>;
  }
  get suturesFA(): FormArray<FormGroup> {
    return this.form.controls['sutures'] as unknown as FormArray<FormGroup>;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snack: MatSnackBar,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      const found = safeLoadAll().find(c => c.id === id);
      if (found) this.patchFromCard(found);
      else this.seedDefaults();
    } else {
      this.seedDefaults();
    }
  }

  // called by your template
  onTemplateChange(ev: MatSelectChange): void {
    const id = String(ev.value || '');
    const t = this.templates.find(x => x.id === id);
    if (!t) return;

    // patch simple fields
    const p = t.patch;
    if (p.specialty != null) this.form.controls.specialty.setValue(p.specialty ?? '');
    if (p.positioning != null) this.form.controls.positioning.setValue(p.positioning ?? '');
    if (p.prepDrape != null) this.form.controls.prepDrape.setValue(p.prepDrape ?? '');
    if (p.pearls != null) this.form.controls.pearls.setValue(p.pearls ?? '');

    // patch arrays (replace)
    if (p.equipment) this.replaceItems(this.equipmentFA, p.equipment);
    if (p.instruments) this.replaceItems(this.instrumentsFA, p.instruments);
    if (p.supplies) this.replaceItems(this.suppliesFA, p.supplies);
    if (p.sutures) this.replaceItems(this.suturesFA, p.sutures);

    this.snack.open(`Template applied: ${t.label}`, 'OK', { duration: 2000 });
  }

  // generic add/remove your HTML is calling
  addItem(section: 'equipment' | 'instruments' | 'supplies' | 'sutures'): void {
    this.sectionFA(section).push(this.makeItemFG());
  }

  removeItem(section: 'equipment' | 'instruments' | 'supplies' | 'sutures', index: number): void {
    this.sectionFA(section).removeAt(index);
  }

  // tags
  addTag(): void {
    const raw = this.tagDraft().trim();
    if (!raw) return;

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const existing = new Set(this.form.controls.tags.value ?? []);
    parts.forEach(p => existing.add(p));

    this.form.controls.tags.setValue([...existing]);
    this.tagDraft.set('');
  }

  removeTag(tag: string): void {
    this.form.controls.tags.setValue((this.form.controls.tags.value ?? []).filter(t => t !== tag));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Fix required fields (Title + Procedure).', 'OK', { duration: 2600 });
      return;
    }

    const raw = this.form.getRawValue() as unknown as {
      id: string;
      title: string;
      specialty: string;
      procedure: string;
      surgeon: string;
      facility: string;
      tags: string[];
      positioning: string;
      prepDrape: string;
      pearls: string;
    };

    const all = safeLoadAll();
    const existing = all.find(c => c.id === (raw.id || this.editingId() || ''));

    const card: PreferenceCard = {
      id: raw.id || existing?.id || safeUuid(),
      title: (raw.title ?? '').trim(),
      specialty: (raw.specialty ?? '').trim(),
      procedure: (raw.procedure ?? '').trim(),
      surgeon: (raw.surgeon ?? '').trim(),
      facility: (raw.facility ?? '').trim(),
      tags: raw.tags ?? [],

      positioning: (raw.positioning ?? '').trim(),
      prepDrape: (raw.prepDrape ?? '').trim(),
      pearls: (raw.pearls ?? '').trim(),

      equipment: this.readItems(this.equipmentFA),
      instruments: this.readItems(this.instrumentsFA),
      supplies: this.readItems(this.suppliesFA),
      sutures: this.readItems(this.suturesFA),

      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    const next = existing ? all.map(c => (c.id === card.id ? card : c)) : [card, ...all];
    saveAll(next);

    this.snack.open('Preference card saved.', 'OK', { duration: 2200 });
    this.router.navigate(['/preference-cards/view', card.id]);
  }

  cancel(): void {
    const id = this.editingId();
    if (id) this.router.navigate(['/preference-cards/view', id]);
    else this.router.navigate(['/preference-cards']);
  }

  // ---------- helpers ----------
  private seedDefaults(): void {
    this.form.controls.id.setValue(safeUuid());
    this.form.controls.tags.setValue([]);

    // add starter rows so stepper sections aren't empty
    this.equipmentFA.push(this.makeItemFG());
    this.instrumentsFA.push(this.makeItemFG());
    this.suppliesFA.push(this.makeItemFG());
    this.suturesFA.push(this.makeItemFG());
  }

  private sectionFA(section: 'equipment' | 'instruments' | 'supplies' | 'sutures'): FormArray<FormGroup> {
    switch (section) {
      case 'equipment':
        return this.equipmentFA;
      case 'instruments':
        return this.instrumentsFA;
      case 'supplies':
        return this.suppliesFA;
      case 'sutures':
        return this.suturesFA;
    }
  }

  private makeItemFG(v?: Item): FormGroup {
    return this.fb.group({
      name: this.fb.nonNullable.control((v?.name ?? ''), [Validators.required]),
      qty: this.fb.control<number | null>(v?.qty ?? null),
      notes: this.fb.nonNullable.control(v?.notes ?? ''),
    });
  }

  private readItems(arr: FormArray<FormGroup>): Item[] {
    return arr.controls
      .map(ctrl => ctrl.getRawValue() as unknown as { name: string; qty: number | null; notes: string })
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: v.qty ?? null,
        notes: (v.notes ?? '').trim(),
      }))
      .filter(x => x.name.length > 0);
  }

  private patchFromCard(c: PreferenceCard): void {
    this.form.controls.id.setValue(c.id);
    this.form.controls.title.setValue(c.title ?? '');
    this.form.controls.specialty.setValue(c.specialty ?? '');
    this.form.controls.procedure.setValue(c.procedure ?? '');
    this.form.controls.surgeon.setValue(c.surgeon ?? '');
    this.form.controls.facility.setValue(c.facility ?? '');
    this.form.controls.tags.setValue(c.tags ?? []);

    this.form.controls.positioning.setValue(c.positioning ?? '');
    this.form.controls.prepDrape.setValue(c.prepDrape ?? '');
    this.form.controls.pearls.setValue(c.pearls ?? '');

    this.replaceItems(this.equipmentFA, c.equipment ?? []);
    this.replaceItems(this.instrumentsFA, c.instruments ?? []);
    this.replaceItems(this.suppliesFA, c.supplies ?? []);
    this.replaceItems(this.suturesFA, c.sutures ?? []);
  }

  private replaceItems(arr: FormArray<FormGroup>, items: Item[]): void {
    while (arr.length) arr.removeAt(0);
    (items.length ? items : [{ name: '', qty: null, notes: '' }]).forEach(i => arr.push(this.makeItemFG(i)));
  }
}
*/

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

type Item = { name: string; qty?: number | null; notes?: string };
type PreferenceCard = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  tags: string[];

  positioning?: string;
  prepDrape?: string;
  pearls?: string;

  equipment: Item[];
  instruments: Item[];
  supplies: Item[];
  sutures: Item[];

  createdAt: string;
  updatedAt: string;
};

type Template = {
  id: string;
  label: string;
  patch: Partial<PreferenceCard>;
};

const STORAGE_KEY = 'scrubcompanion_prefcards_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'pc_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function safeLoadAll(): PreferenceCard[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PreferenceCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(cards: PreferenceCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

@Component({
  selector: 'app-preference-card-editor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatStepperModule,
  ],
  templateUrl: './preference-card-editor.component.html',
  styleUrl: './preference-card-editor.component.scss',
})
export class PreferenceCardEditorComponent {
  readonly specialties: string[] = [
    'Ortho',
    'Neuro',
    'General',
    'OB/GYN',
    'ENT',
    'Plastics',
    'Urology',
    'Vascular',
    'Cardiac',
    'Ophthalmology',
    'Peds',
  ];

  readonly templates: Template[] = [
    {
      id: 'blank',
      label: 'Blank (no changes)',
      patch: {},
    },
    {
      id: 'ortho-basic',
      label: 'Ortho (basic skeleton)',
      patch: {
        specialty: 'Ortho',
        positioning: 'Supine (confirm surgeon preference)',
        prepDrape: 'Per surgeon preference; include stockinette if needed',
        equipment: [
          { name: 'Tourniquet', qty: 1, notes: 'If applicable' },
          { name: 'Bovie', qty: 1 },
          { name: 'Suction', qty: 1 },
        ],
      },
    },
    {
      id: 'lap-basic',
      label: 'General (lap basic skeleton)',
      patch: {
        specialty: 'General',
        equipment: [
          { name: 'Tower', qty: 1 },
          { name: 'Insufflator', qty: 1 },
          { name: 'Light source', qty: 1 },
          { name: 'Camera head', qty: 1 },
        ],
        supplies: [
          { name: 'Trocar set', qty: 1, notes: 'Sizes per surgeon' },
          { name: 'Endo bag', qty: 1 },
        ],
      },
    },
  ];

  readonly tagDraft = signal('');

  private readonly fb = new FormBuilder();

  readonly form = this.fb.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),
    tags: this.fb.nonNullable.control<string[]>([]),

    positioning: this.fb.nonNullable.control(''),
    prepDrape: this.fb.nonNullable.control(''),
    pearls: this.fb.nonNullable.control(''),

    equipment: this.fb.array([] as FormGroup[]),
    instruments: this.fb.array([] as FormGroup[]),
    supplies: this.fb.array([] as FormGroup[]),
    sutures: this.fb.array([] as FormGroup[]),
  });

  readonly editingId = signal<string | null>(null);

  readonly titleText = computed(() => (this.editingId() ? 'Edit Preference Card' : 'New Preference Card'));

  get equipmentFA(): FormArray<FormGroup> {
    return this.form.controls['equipment'] as unknown as FormArray<FormGroup>;
  }
  get instrumentsFA(): FormArray<FormGroup> {
    return this.form.controls['instruments'] as unknown as FormArray<FormGroup>;
  }
  get suppliesFA(): FormArray<FormGroup> {
    return this.form.controls['supplies'] as unknown as FormArray<FormGroup>;
  }
  get suturesFA(): FormArray<FormGroup> {
    return this.form.controls['sutures'] as unknown as FormArray<FormGroup>;
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly snack: MatSnackBar,
  ) {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editingId.set(id);
      const found = safeLoadAll().find(c => c.id === id);
      if (found) this.patchFromCard(found);
      else this.seedDefaults();
    } else {
      this.seedDefaults();
    }
  }

  onTemplateChange(ev: MatSelectChange): void {
    const id = String(ev.value || '');
    const t = this.templates.find(x => x.id === id);
    if (!t) return;

    const p = t.patch;
    if (p.specialty != null) this.form.controls.specialty.setValue(p.specialty ?? '');
    if (p.positioning != null) this.form.controls.positioning.setValue(p.positioning ?? '');
    if (p.prepDrape != null) this.form.controls.prepDrape.setValue(p.prepDrape ?? '');
    if (p.pearls != null) this.form.controls.pearls.setValue(p.pearls ?? '');

    if (p.equipment) this.replaceItems(this.equipmentFA, p.equipment);
    if (p.instruments) this.replaceItems(this.instrumentsFA, p.instruments);
    if (p.supplies) this.replaceItems(this.suppliesFA, p.supplies);
    if (p.sutures) this.replaceItems(this.suturesFA, p.sutures);

    this.snack.open(`Template applied: ${t.label}`, 'OK', { duration: 2000 });
  }

  addItem(section: 'equipment' | 'instruments' | 'supplies' | 'sutures'): void {
    this.sectionFA(section).push(this.makeItemFG());
  }

  removeItem(section: 'equipment' | 'instruments' | 'supplies' | 'sutures', index: number): void {
    this.sectionFA(section).removeAt(index);
  }

  addTag(): void {
    const raw = this.tagDraft().trim();
    if (!raw) return;

    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const existing = new Set(this.form.controls.tags.value ?? []);
    parts.forEach(p => existing.add(p));

    this.form.controls.tags.setValue([...existing]);
    this.tagDraft.set('');
  }

  removeTag(tag: string): void {
    this.form.controls.tags.setValue((this.form.controls.tags.value ?? []).filter(t => t !== tag));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Fix required fields (Title + Procedure).', 'OK', { duration: 2600 });
      return;
    }

    const raw = this.form.getRawValue() as unknown as {
      id: string;
      title: string;
      specialty: string;
      procedure: string;
      surgeon: string;
      facility: string;
      tags: string[];
      positioning: string;
      prepDrape: string;
      pearls: string;
    };

    const all = safeLoadAll();
    const existing = all.find(c => c.id === (raw.id || this.editingId() || ''));

    const card: PreferenceCard = {
      id: raw.id || existing?.id || safeUuid(),
      title: (raw.title ?? '').trim(),
      specialty: (raw.specialty ?? '').trim(),
      procedure: (raw.procedure ?? '').trim(),
      surgeon: (raw.surgeon ?? '').trim(),
      facility: (raw.facility ?? '').trim(),
      tags: raw.tags ?? [],

      positioning: (raw.positioning ?? '').trim(),
      prepDrape: (raw.prepDrape ?? '').trim(),
      pearls: (raw.pearls ?? '').trim(),

      equipment: this.readItems(this.equipmentFA),
      instruments: this.readItems(this.instrumentsFA),
      supplies: this.readItems(this.suppliesFA),
      sutures: this.readItems(this.suturesFA),

      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    const next = existing ? all.map(c => (c.id === card.id ? card : c)) : [card, ...all];
    saveAll(next);

    this.snack.open('Preference card saved.', 'OK', { duration: 2200 });
    this.router.navigate(['/preference-cards/view', card.id]);
  }

  cancel(): void {
    const id = this.editingId();
    if (id) this.router.navigate(['/preference-cards/view', id]);
    else this.router.navigate(['/preference-cards']);
  }

  private seedDefaults(): void {
    this.form.controls.id.setValue(safeUuid());
    this.form.controls.tags.setValue([]);

    this.equipmentFA.push(this.makeItemFG());
    this.instrumentsFA.push(this.makeItemFG());
    this.suppliesFA.push(this.makeItemFG());
    this.suturesFA.push(this.makeItemFG());
  }

  private sectionFA(section: 'equipment' | 'instruments' | 'supplies' | 'sutures'): FormArray<FormGroup> {
    switch (section) {
      case 'equipment':
        return this.equipmentFA;
      case 'instruments':
        return this.instrumentsFA;
      case 'supplies':
        return this.suppliesFA;
      case 'sutures':
        return this.suturesFA;
    }
  }

  private makeItemFG(v?: Item): FormGroup {
    return this.fb.group({
      // IMPORTANT: do NOT require name here, or it blocks stepper "Next" in linear mode.
      // We filter empty rows out on save anyway.
      name: this.fb.nonNullable.control(v?.name ?? ''),
      qty: this.fb.control<number | null>(v?.qty ?? null),
      notes: this.fb.nonNullable.control(v?.notes ?? ''),
    });
  }

  private readItems(arr: FormArray<FormGroup>): Item[] {
    return arr.controls
      .map(ctrl => ctrl.getRawValue() as unknown as { name: string; qty: number | null; notes: string })
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: v.qty ?? null,
        notes: (v.notes ?? '').trim(),
      }))
      .filter(x => x.name.length > 0);
  }

  private patchFromCard(c: PreferenceCard): void {
    this.form.controls.id.setValue(c.id);
    this.form.controls.title.setValue(c.title ?? '');
    this.form.controls.specialty.setValue(c.specialty ?? '');
    this.form.controls.procedure.setValue(c.procedure ?? '');
    this.form.controls.surgeon.setValue(c.surgeon ?? '');
    this.form.controls.facility.setValue(c.facility ?? '');
    this.form.controls.tags.setValue(c.tags ?? []);

    this.form.controls.positioning.setValue(c.positioning ?? '');
    this.form.controls.prepDrape.setValue(c.prepDrape ?? '');
    this.form.controls.pearls.setValue(c.pearls ?? '');

    this.replaceItems(this.equipmentFA, c.equipment ?? []);
    this.replaceItems(this.instrumentsFA, c.instruments ?? []);
    this.replaceItems(this.suppliesFA, c.supplies ?? []);
    this.replaceItems(this.suturesFA, c.sutures ?? []);
  }

  private replaceItems(arr: FormArray<FormGroup>, items: Item[]): void {
    while (arr.length) arr.removeAt(0);
    (items.length ? items : [{ name: '', qty: null, notes: '' }]).forEach(i => arr.push(this.makeItemFG(i)));
  }
}
