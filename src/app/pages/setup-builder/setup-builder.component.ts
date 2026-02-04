/*
import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

type SetupItem = {
  name: string;
  qty?: number | null;
  notes?: string;
  checked?: boolean;
};

type SetupPlan = {
  id: string;
  title: string;         // e.g. "Lap Chole - Dr. X"
  procedure: string;     // e.g. "Laparoscopic Cholecystectomy"
  specialty: string;     // e.g. "General"
  surgeon?: string;
  facility?: string;

  room: SetupItem[];
  backTable: SetupItem[];
  mayo: SetupItem[];
  equipment: SetupItem[];

  notes?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

type ItemFG = FormGroup<{
  name: ReturnType<FormBuilder['nonNullable']['control']>;
  qty: ReturnType<FormBuilder['control']>;
  notes: ReturnType<FormBuilder['nonNullable']['control']>;
  checked: ReturnType<FormBuilder['nonNullable']['control']>;
}>;

type TemplateId = 'gen-lap' | 'ortho-basic' | 'csection';

const STORAGE_KEY = 'scrubcompanion_setups_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'su_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type SetupTemplate = {
  id: TemplateId;
  label: string;
  specialty: string;
  procedure: string;
  room: SetupItem[];
  backTable: SetupItem[];
  mayo: SetupItem[];
  equipment: SetupItem[];
  notes?: string;
};

const SETUP_TEMPLATES: SetupTemplate[] = [
  {
    id: 'gen-lap',
    label: 'General — Basic Lap Setup',
    specialty: 'General',
    procedure: 'Laparoscopic Procedure (Basic)',
    room: [
      { name: 'Bed supine, safety strap, arms per surgeon' },
      { name: 'SCDs on' },
      { name: 'Bair Hugger (if used)' },
      { name: 'Kick bucket + ring stand' },
      { name: 'Suction canister(s) + tubing' },
    ],
    backTable: [
      { name: 'Lap basic set (open + lap instruments)' },
      { name: 'Trocars (assorted) — confirm sizes' },
      { name: 'Suction/irrigation (if used)' },
      { name: 'Clip applier (if used)' },
      { name: 'Needle holders + suture scissors' },
    ],
    mayo: [
      { name: 'Knife handle + blades' },
      { name: 'Graspers (2)' },
      { name: 'Maryland / dissector' },
      { name: 'Scissors' },
      { name: 'Suction/irrigation (if used)' },
    ],
    equipment: [
      { name: 'Tower + camera head' },
      { name: 'Light cord + scope (0°/30° confirm)' },
      { name: 'Insufflator tubing + CO₂' },
      { name: 'Bovie + scratch pad' },
    ],
    notes: 'Add procedure-specific items (cholangiogram, endo bag, etc.) as needed.',
  },
  {
    id: 'ortho-basic',
    label: 'Ortho — Basic Setup',
    specialty: 'Ortho',
    procedure: 'Orthopedic Procedure (Basic)',
    room: [
      { name: 'Bed per procedure; pad bony prominences' },
      { name: 'Tourniquet (if used) — confirm size/pressure' },
      { name: 'Extra suction if cement' },
      { name: 'Kick bucket + ring stand' },
    ],
    backTable: [
      { name: 'Basic ortho set' },
      { name: 'Power attachments + batteries' },
      { name: 'Marking pen / ruler' },
      { name: 'Retractors (assorted)' },
    ],
    mayo: [
      { name: 'Knife handle + blades' },
      { name: 'Kocher x2' },
      { name: 'Adson + DeBakey' },
      { name: 'Needle holder + scissors' },
    ],
    equipment: [
      { name: 'Bovie + scratch pad' },
      { name: 'Suction (Yankauer) + tubing' },
      { name: 'Power drill + charger' },
    ],
    notes: 'Add implants/trays once you know surgeon + rep setup.',
  },
  {
    id: 'csection',
    label: 'OB — C-Section Setup (Basic)',
    specialty: 'OB',
    procedure: 'C-Section (Basic)',
    room: [
      { name: 'Supine with left tilt' },
      { name: 'Warming unit (if used)' },
      { name: 'Suction x2 set up' },
      { name: 'Neonate area per facility policy' },
    ],
    backTable: [
      { name: 'C-section set' },
      { name: 'Bladder blade + retractors' },
      { name: 'Needle holders + suture scissors (heavy + fine)' },
      { name: 'Bulb syringe + cord clamps ready' },
    ],
    mayo: [
      { name: 'Knife handle + blades' },
      { name: 'Kocher x2' },
      { name: 'Metz + Mayo scissors' },
      { name: 'Suction tip ready' },
    ],
    equipment: [
      { name: 'Bovie + scratch pad' },
      { name: 'Suction x2' },
    ],
    notes: 'Confirm delayed cord clamping / closure preference.',
  },
];

@Component({
  selector: 'app-setup-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './setup-builder.component.html',
  styleUrl: './setup-builder.component.scss',
})
export class SetupBuilderComponent {
  readonly query = signal('');
  readonly selectedId = signal<string | null>(null);

  readonly templates = SETUP_TEMPLATES;

  readonly setups = signal<SetupPlan[]>(this.loadAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.setups();

    if (!q) return all;

    return all.filter(s => {
      const hay = [s.title, s.procedure, s.specialty, s.surgeon ?? '', s.facility ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });

  readonly selectedSetup = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.setups().find(s => s.id === id) ?? null;
  });

  readonly titleText = computed(() => (this.selectedId() ? 'Setup Builder' : 'Setup Builder'));

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),

    room: this.fb.array<ItemFG>([]),
    backTable: this.fb.array<ItemFG>([]),
    mayo: this.fb.array<ItemFG>([]),
    equipment: this.fb.array<ItemFG>([]),

    notes: this.fb.nonNullable.control(''),
  });

  get roomFA() { return this.form.controls.room; }
  get backTableFA() { return this.form.controls.backTable; }
  get mayoFA() { return this.form.controls.mayo; }
  get equipmentFA() { return this.form.controls.equipment; }

  constructor(private readonly snack: MatSnackBar) {
    // Create a blank initial plan if none exist
    if (this.setups().length === 0) {
      const blank = this.createBlank();
      this.patchFromPlan(blank);
      this.selectedId.set(blank.id);
      this.upsertPlan(blank, true);
    } else {
      const first = this.setups()[0];
      this.selectedId.set(first.id);
      this.patchFromPlan(first);
    }
  }

  newSetup(): void {
    const blank = this.createBlank();
    this.patchFromPlan(blank);
    this.selectedId.set(blank.id);
    this.upsertPlan(blank, true);
    this.snack.open('New setup created.', 'OK', { duration: 2000 });
  }

  select(id: string): void {
    const found = this.setups().find(s => s.id === id);
    if (!found) return;
    this.selectedId.set(id);
    this.patchFromPlan(found);
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (!id) return;

    const next = this.setups().filter(s => s.id !== id);
    this.setups.set(next);
    this.saveAll(next);

    if (next.length) {
      this.selectedId.set(next[0].id);
      this.patchFromPlan(next[0]);
    } else {
      const blank = this.createBlank();
      this.patchFromPlan(blank);
      this.selectedId.set(blank.id);
      this.upsertPlan(blank, true);
    }

    this.snack.open('Setup deleted.', 'OK', { duration: 2200 });
  }

  duplicateSelected(): void {
    const cur = this.selectedSetup();
    if (!cur) return;

    const copy: SetupPlan = {
      ...structuredClone(cur),
      id: safeUuid(),
      title: cur.title ? `${cur.title} (copy)` : 'Untitled (copy)',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.upsertPlan(copy, true);
    this.selectedId.set(copy.id);
    this.patchFromPlan(copy);

    this.snack.open('Setup duplicated.', 'OK', { duration: 2200 });
  }

  onTemplateChange(ev: MatSelectChange): void {
    const id = ev.value as TemplateId;
    const t = this.templates.find(x => x.id === id);
    if (!t) return;

    // Do not overwrite title/surgeon/facility if user already typed them
    if (!this.form.controls.specialty.value) this.form.controls.specialty.setValue(t.specialty);
    if (!this.form.controls.procedure.value) this.form.controls.procedure.setValue(t.procedure);

    this.replaceItems(this.roomFA, t.room);
    this.replaceItems(this.backTableFA, t.backTable);
    this.replaceItems(this.mayoFA, t.mayo);
    this.replaceItems(this.equipmentFA, t.equipment);

    if (!this.form.controls.notes.value) this.form.controls.notes.setValue(t.notes ?? '');

    this.snack.open(`Applied template: ${t.label}`, 'OK', { duration: 2400 });
  }

  addItem(list: 'room' | 'backTable' | 'mayo' | 'equipment'): void {
    this.getFA(list).push(this.makeItemFG({ name: '', qty: null, notes: '', checked: false }));
  }

  removeItem(list: 'room' | 'backTable' | 'mayo' | 'equipment', index: number): void {
    this.getFA(list).removeAt(index);
  }

  clearChecks(): void {
    for (const fa of [this.roomFA, this.backTableFA, this.mayoFA, this.equipmentFA]) {
      fa.controls.forEach(ctrl => ctrl.controls.checked.setValue(false));
    }
    this.snack.open('All checkmarks cleared.', 'OK', { duration: 1800 });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Fix required fields (Title + Procedure).', 'OK', { duration: 2800 });
      return;
    }

    const raw = this.form.getRawValue();
    const existing = this.setups().find(s => s.id === raw.id);

    const plan: SetupPlan = {
      id: raw.id || safeUuid(),
      title: raw.title,
      procedure: raw.procedure,
      specialty: raw.specialty || '',
      surgeon: raw.surgeon || '',
      facility: raw.facility || '',
      room: this.readItems(this.roomFA),
      backTable: this.readItems(this.backTableFA),
      mayo: this.readItems(this.mayoFA),
      equipment: this.readItems(this.equipmentFA),
      notes: raw.notes || '',
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    this.upsertPlan(plan, true);
    this.selectedId.set(plan.id);

    this.snack.open('Setup saved.', 'OK', { duration: 2200 });
  }

  print(): void {
    window.print();
  }

  // ---------- helpers ----------
  private createBlank(): SetupPlan {
    const t = nowIso();
    return {
      id: safeUuid(),
      title: '',
      procedure: '',
      specialty: '',
      surgeon: '',
      facility: '',
      room: [],
      backTable: [],
      mayo: [],
      equipment: [],
      notes: '',
      createdAt: t,
      updatedAt: t,
    };
  }

  private makeItemFG(item: SetupItem): ItemFG {
    return this.fb.nonNullable.group({
      name: this.fb.nonNullable.control(item.name ?? '', [Validators.required]),
      qty: this.fb.control<number | null>(toNumOrNull(item.qty)),
      notes: this.fb.nonNullable.control(item.notes ?? ''),
      checked: this.fb.nonNullable.control(Boolean(item.checked)),
    });
  }

  private replaceItems(fa: FormArray<ItemFG>, items: SetupItem[]): void {
    while (fa.length) fa.removeAt(0);
    items.forEach(i => fa.push(this.makeItemFG(i)));
  }

  private readItems(fa: FormArray<ItemFG>): SetupItem[] {
    return fa.controls
      .map(ctrl => ctrl.getRawValue())
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: toNumOrNull(v.qty),
        notes: (v.notes ?? '').trim(),
        checked: Boolean(v.checked),
      }))
      .filter(i => i.name.length > 0);
  }

  private getFA(list: 'room' | 'backTable' | 'mayo' | 'equipment'): FormArray<ItemFG> {
    return this.form.controls[list] as unknown as FormArray<ItemFG>;
  }

  private patchFromPlan(p: SetupPlan): void {
    this.form.controls.id.setValue(p.id);
    this.form.controls.title.setValue(p.title ?? '');
    this.form.controls.procedure.setValue(p.procedure ?? '');
    this.form.controls.specialty.setValue(p.specialty ?? '');
    this.form.controls.surgeon.setValue(p.surgeon ?? '');
    this.form.controls.facility.setValue(p.facility ?? '');
    this.form.controls.notes.setValue(p.notes ?? '');

    this.replaceItems(this.roomFA, p.room ?? []);
    this.replaceItems(this.backTableFA, p.backTable ?? []);
    this.replaceItems(this.mayoFA, p.mayo ?? []);
    this.replaceItems(this.equipmentFA, p.equipment ?? []);
  }

  private upsertPlan(plan: SetupPlan, persist: boolean): void {
    const all = this.setups();
    const idx = all.findIndex(s => s.id === plan.id);
    const next = [...all];

    if (idx >= 0) next[idx] = plan;
    else next.unshift(plan);

    this.setups.set(next);
    if (persist) this.saveAll(next);
  }

  private loadAll(): SetupPlan[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SetupPlan[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAll(plans: SetupPlan[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }
}
*/

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

type SetupItem = { name: string; qty?: number | null; notes?: string; checked?: boolean };

type SetupPlan = {
  id: string;
  title: string;
  specialty?: string;
  procedure: string;
  surgeon?: string;
  facility?: string;
  room: SetupItem[];
  backTable: SetupItem[];
  mayo: SetupItem[];
  equipment: SetupItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'scrubcompanion_setups_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'su_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function safeLoadAll(): SetupPlan[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SetupPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(setups: SetupPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
}

@Component({
  selector: 'app-setup-builder',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './setup-builder.component.html',
  styleUrl: './setup-builder.component.scss',
})
export class SetupBuilderComponent {
  readonly query = signal('');
  readonly selectedId = signal<string | null>(null);

  private readonly fb = new FormBuilder();

  readonly setups = signal<SetupPlan[]>(safeLoadAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.setups();

    return this.setups().filter(s => {
      const hay = [s.title, s.procedure, s.specialty ?? '', s.surgeon ?? '', s.facility ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });

  readonly form = this.fb.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    facility: this.fb.nonNullable.control(''),

    room: this.fb.array([] as FormGroup[]),
    backTable: this.fb.array([] as FormGroup[]),
    mayo: this.fb.array([] as FormGroup[]),
    equipment: this.fb.array([] as FormGroup[]),

    notes: this.fb.nonNullable.control(''),
  });

  get roomFA(): FormArray<FormGroup> {
    return this.form.controls['room'] as unknown as FormArray<FormGroup>;
  }
  get backTableFA(): FormArray<FormGroup> {
    return this.form.controls['backTable'] as unknown as FormArray<FormGroup>;
  }
  get mayoFA(): FormArray<FormGroup> {
    return this.form.controls['mayo'] as unknown as FormArray<FormGroup>;
  }
  get equipmentFA(): FormArray<FormGroup> {
    return this.form.controls['equipment'] as unknown as FormArray<FormGroup>;
  }

  constructor(
    private readonly snack: MatSnackBar,
    private readonly route: ActivatedRoute,
  ) {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) {
      const found = this.setups().find(s => s.id === id);
      if (found) {
        this.selectedId.set(found.id);
        this.patchFrom(found);
        return;
      }
    }

    if (this.setups().length) {
      const first = this.setups()[0];
      this.selectedId.set(first.id);
      this.patchFrom(first);
    } else {
      const blank = this.makeBlank();
      this.upsert(blank, true);
      this.selectedId.set(blank.id);
      this.patchFrom(blank);
    }
  }

  newSetup(): void {
    const blank = this.makeBlank();
    this.upsert(blank, true);
    this.selectedId.set(blank.id);
    this.patchFrom(blank);
    this.snack.open('New setup created.', 'OK', { duration: 2000 });
  }

  select(id: string): void {
    const found = this.setups().find(s => s.id === id);
    if (!found) return;
    this.selectedId.set(id);
    this.patchFrom(found);
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (!id) return;

    const next = this.setups().filter(s => s.id !== id);
    this.setups.set(next);
    saveAll(next);

    if (next.length) {
      this.selectedId.set(next[0].id);
      this.patchFrom(next[0]);
    } else {
      const blank = this.makeBlank();
      this.upsert(blank, true);
      this.selectedId.set(blank.id);
      this.patchFrom(blank);
    }

    this.snack.open('Setup deleted.', 'OK', { duration: 2200 });
  }

  // add/remove item rows
  addRoom(): void { this.roomFA.push(this.makeItemFG()); }
  removeRoom(i: number): void { this.roomFA.removeAt(i); }

  addBackTable(): void { this.backTableFA.push(this.makeItemFG()); }
  removeBackTable(i: number): void { this.backTableFA.removeAt(i); }

  addMayo(): void { this.mayoFA.push(this.makeItemFG()); }
  removeMayo(i: number): void { this.mayoFA.removeAt(i); }

  addEquipment(): void { this.equipmentFA.push(this.makeItemFG()); }
  removeEquipment(i: number): void { this.equipmentFA.removeAt(i); }

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
      notes: string;
    };

    const all = safeLoadAll();
    const existing = all.find(s => s.id === raw.id);

    const plan: SetupPlan = {
      id: raw.id || existing?.id || safeUuid(),
      title: (raw.title ?? '').trim(),
      specialty: (raw.specialty ?? '').trim(),
      procedure: (raw.procedure ?? '').trim(),
      surgeon: (raw.surgeon ?? '').trim(),
      facility: (raw.facility ?? '').trim(),
      room: this.readItems(this.roomFA),
      backTable: this.readItems(this.backTableFA),
      mayo: this.readItems(this.mayoFA),
      equipment: this.readItems(this.equipmentFA),
      notes: (raw.notes ?? '').trim(),
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    const next = existing ? all.map(s => (s.id === plan.id ? plan : s)) : [plan, ...all];
    saveAll(next);
    this.setups.set(next);
    this.selectedId.set(plan.id);

    this.snack.open('Setup saved.', 'OK', { duration: 2200 });
  }

  // ---------- helpers ----------
  private makeBlank(): SetupPlan {
    const t = nowIso();
    return {
      id: safeUuid(),
      title: '',
      specialty: '',
      procedure: '',
      surgeon: '',
      facility: '',
      room: [{ name: '', qty: null, notes: '', checked: false }],
      backTable: [{ name: '', qty: null, notes: '', checked: false }],
      mayo: [{ name: '', qty: null, notes: '', checked: false }],
      equipment: [{ name: '', qty: null, notes: '', checked: false }],
      notes: '',
      createdAt: t,
      updatedAt: t,
    };
  }

  private makeItemFG(v?: SetupItem): FormGroup {
    return this.fb.group({
      name: this.fb.nonNullable.control(v?.name ?? '', [Validators.required]),
      qty: this.fb.control<number | null>(v?.qty ?? null),
      notes: this.fb.nonNullable.control(v?.notes ?? ''),
      checked: this.fb.nonNullable.control(!!v?.checked),
    });
  }

  private readItems(arr: FormArray<FormGroup>): SetupItem[] {
    return arr.controls
      .map(ctrl => ctrl.getRawValue() as unknown as { name: string; qty: number | null; notes: string; checked: boolean })
      .map(v => ({
        name: (v.name ?? '').trim(),
        qty: v.qty ?? null,
        notes: (v.notes ?? '').trim(),
        checked: !!v.checked,
      }))
      .filter(x => x.name.length > 0);
  }

  private patchFrom(s: SetupPlan): void {
    this.form.controls.id.setValue(s.id);
    this.form.controls.title.setValue(s.title ?? '');
    this.form.controls.specialty.setValue(s.specialty ?? '');
    this.form.controls.procedure.setValue(s.procedure ?? '');
    this.form.controls.surgeon.setValue(s.surgeon ?? '');
    this.form.controls.facility.setValue(s.facility ?? '');
    this.form.controls.notes.setValue(s.notes ?? '');

    this.replaceItems(this.roomFA, s.room ?? []);
    this.replaceItems(this.backTableFA, s.backTable ?? []);
    this.replaceItems(this.mayoFA, s.mayo ?? []);
    this.replaceItems(this.equipmentFA, s.equipment ?? []);
  }

  private replaceItems(arr: FormArray<FormGroup>, items: SetupItem[]): void {
    while (arr.length) arr.removeAt(0);
    (items.length ? items : [{ name: '', qty: null, notes: '', checked: false }]).forEach(i => arr.push(this.makeItemFG(i)));
  }

  private upsert(s: SetupPlan, persist: boolean): void {
    const all = this.setups();
    const idx = all.findIndex(x => x.id === s.id);
    const next = [...all];

    if (idx >= 0) next[idx] = s;
    else next.unshift(s);

    this.setups.set(next);
    if (persist) saveAll(next);
  }
}
