import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

type StepRole = 'Scrub' | 'Circulator' | 'Surgeon' | 'Anesthesia' | 'Team';
type StepPriority = 'Normal' | 'Critical';

type PlaybookStep = {
  text: string;
  cue?: string;       // what triggers the step (e.g., "after scope in")
  role: StepRole;
  priority: StepPriority;
};

type PlaybookPhase = {
  name: string;       // e.g., "Setup", "Intra-op", "Closing"
  goal?: string;
  steps: PlaybookStep[];
};

type ProcedurePlaybook = {
  id: string;
  title: string;      // e.g., "Lap Chole - Flow"
  specialty: string;  // e.g., "General"
  procedure: string;  // e.g., "Laparoscopic Cholecystectomy"
  surgeon?: string;
  tags: string[];

  phases: PlaybookPhase[];
  pearls?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

type StepFG = FormGroup<{
  text: ReturnType<FormBuilder['nonNullable']['control']>;
  cue: ReturnType<FormBuilder['nonNullable']['control']>;
  role: ReturnType<FormBuilder['nonNullable']['control']>;
  priority: ReturnType<FormBuilder['nonNullable']['control']>;
}>;

type PhaseFG = FormGroup<{
  name: ReturnType<FormBuilder['nonNullable']['control']>;
  goal: ReturnType<FormBuilder['nonNullable']['control']>;
  steps: FormArray<StepFG>;
}>;

type TemplateId = 'gen-lap-chole' | 'ortho-tka' | 'ob-csection';

type PlaybookTemplate = {
  id: TemplateId;
  label: string;
  specialty: string;
  procedure: string;
  phases: PlaybookPhase[];
  tags?: string[];
  pearls?: string;
};

const STORAGE_KEY = 'scrubcompanion_playbooks_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'pb_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

const ROLES: StepRole[] = ['Scrub', 'Circulator', 'Surgeon', 'Anesthesia', 'Team'];
const PRIORITIES: StepPriority[] = ['Normal', 'Critical'];

const DEFAULT_PHASES: PlaybookPhase[] = [
  { name: 'Pre-op / Brief', goal: 'Confirm plan + gear + patient details.', steps: [] },
  { name: 'Setup', goal: 'Room/back table/mayo ready before patient in.', steps: [] },
  { name: 'Time Out / Start', goal: 'Safe start + anticipate first moves.', steps: [] },
  { name: 'Intra-op Flow', goal: 'Key steps + “be ready for…” moments.', steps: [] },
  { name: 'Closing', goal: 'Count, closure, dressings, specimens.', steps: [] },
  { name: 'Turnover / Wrap', goal: 'Specimens, clean-up, reset, notes.', steps: [] },
];

const TEMPLATES: PlaybookTemplate[] = [
  {
    id: 'gen-lap-chole',
    label: 'General — Lap Chole (starter)',
    specialty: 'General',
    procedure: 'Laparoscopic Cholecystectomy',
    tags: ['general', 'lap'],
    phases: [
      {
        name: 'Pre-op / Brief',
        goal: 'Confirm criticals: imaging, antibiotics, positioning, equipment.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Confirm laterality/site + allergies + antibiotics given.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Confirm scope preference (0° vs 30°) + trocar sizes.', cue: '' },
          { role: 'Circulator', priority: 'Normal', text: 'Tower, insufflator tubing + CO₂ ready.', cue: '' },
        ],
      },
      {
        name: 'Setup',
        goal: 'Have lap basics + bailout options ready.',
        steps: [
          { role: 'Scrub', priority: 'Normal', text: 'Lap instruments + trocars + graspers/scissors/energy ready.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Clip applier and endo bag available (as needed).', cue: '' },
          { role: 'Team', priority: 'Normal', text: 'Suction/irrigation set up if surgeon uses it.', cue: '' },
        ],
      },
      {
        name: 'Time Out / Start',
        goal: 'Be ready for access + first dissection.',
        steps: [
          { role: 'Surgeon', priority: 'Normal', text: 'Ports placed; camera in; establish pneumoperitoneum.', cue: 'after skin prep/drape' },
          { role: 'Scrub', priority: 'Normal', text: 'Anticipate first instrument pass: grasper + dissector + scissors.', cue: 'after ports' },
        ],
      },
      {
        name: 'Intra-op Flow',
        goal: 'Be ahead of the dissection/clip/cut sequence.',
        steps: [
          { role: 'Scrub', priority: 'Critical', text: 'Be ready for critical view + clipping (clip applier loaded/checked).', cue: 'cystic duct/artery exposed' },
          { role: 'Team', priority: 'Normal', text: 'Prepare specimen retrieval (endo bag) when gallbladder free.', cue: 'GB separated' },
          { role: 'Scrub', priority: 'Normal', text: 'Have irrigation + suction ready for hemostasis as needed.', cue: '' },
        ],
      },
      {
        name: 'Closing',
        goal: 'Counts + fascia closure (if needed) + dressings.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Counts per policy (initial/closing).', cue: 'before closure' },
          { role: 'Surgeon', priority: 'Normal', text: 'Port site closure; fascia at larger port if surgeon does.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Dressing supplies ready (steri-strips/4x4/tegaderm).', cue: '' },
        ],
      },
      {
        name: 'Turnover / Wrap',
        goal: 'Specimen handling + reset notes.',
        steps: [
          { role: 'Circulator', priority: 'Critical', text: 'Specimen labeled/handled per policy.', cue: 'specimen off field' },
          { role: 'Scrub', priority: 'Normal', text: 'Note any changes for your future preference card/playbook.', cue: 'end of case' },
        ],
      },
    ],
    pearls: 'Keep it tech-focused: scope angle, clip applier availability, endo bag, irrigation, dressings.',
  },
  {
    id: 'ortho-tka',
    label: 'Ortho — Total Knee (starter)',
    specialty: 'Ortho',
    procedure: 'Total Knee Arthroplasty (TKA)',
    tags: ['ortho', 'knee'],
    phases: [
      {
        name: 'Pre-op / Brief',
        goal: 'Confirm implants/trays + laterality + tourniquet plan.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Confirm laterality + implant system + sizing range.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Confirm cement vs cementless + mixing needs.', cue: '' },
          { role: 'Circulator', priority: 'Normal', text: 'Tourniquet settings ready if used.', cue: '' },
        ],
      },
      {
        name: 'Setup',
        goal: 'Trays, power, suction, cement workflow ready.',
        steps: [
          { role: 'Scrub', priority: 'Normal', text: 'Power attachments + batteries checked.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Have retractors and pulse lavage (if used) available.', cue: '' },
          { role: 'Team', priority: 'Normal', text: 'Extra suction ready if cement/heavy lavage.', cue: '' },
        ],
      },
      {
        name: 'Intra-op Flow',
        goal: 'Stay ahead of cuts → trialing → cementing → closure.',
        steps: [
          { role: 'Scrub', priority: 'Normal', text: 'Anticipate trials sequence + sizing tools staged.', cue: 'after cuts' },
          { role: 'Team', priority: 'Critical', text: 'Counts and implant tracking per policy.', cue: 'implant open/used' },
          { role: 'Scrub', priority: 'Normal', text: 'Have closure sutures + dressings staged early.', cue: 'before closure' },
        ],
      },
      {
        name: 'Closing',
        goal: 'Counts + dressing + immobilizer as needed.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Final count complete before dressings.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Dressing/ACE/immobilizer ready if used.', cue: '' },
        ],
      },
      {
        name: 'Turnover / Wrap',
        goal: 'Document “what worked” for next time.',
        steps: [
          { role: 'Scrub', priority: 'Normal', text: 'Note implant sizes used + any surgeon quirks.', cue: '' },
        ],
      },
    ],
    pearls: 'Keep a “bailout” mindset: extra suction, cement timing, closure materials staged early.',
  },
  {
    id: 'ob-csection',
    label: 'OB — C-Section (starter)',
    specialty: 'OB',
    procedure: 'Cesarean Section (C-Section)',
    tags: ['ob', 'c-section'],
    phases: [
      {
        name: 'Setup',
        goal: 'C-section set + suction x2 + neonatal items ready per policy.',
        steps: [
          { role: 'Scrub', priority: 'Normal', text: 'C-section instruments staged; bladder blade ready.', cue: '' },
          { role: 'Team', priority: 'Critical', text: 'Suction x2 ready; bulb syringe/cord clamps available.', cue: '' },
        ],
      },
      {
        name: 'Intra-op Flow',
        goal: 'Delivery moment + uterine closure needs.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Counts and sharps awareness during delivery moment.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Stage uterine closure sutures early.', cue: 'after delivery' },
        ],
      },
      {
        name: 'Closing',
        goal: 'Counts + dressings.',
        steps: [
          { role: 'Team', priority: 'Critical', text: 'Final count complete.', cue: '' },
          { role: 'Scrub', priority: 'Normal', text: 'Dressing supplies ready.', cue: '' },
        ],
      },
    ],
    pearls: 'Confirm delayed cord clamping and skin closure preference.',
  },
];

@Component({
  selector: 'app-playbooks',
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
    MatListModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './playbooks.component.html',
  styleUrl: './playbooks.component.scss',
})
export class PlaybooksComponent {
  readonly query = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly tagDraft = signal('');

  readonly templates = TEMPLATES;
  readonly roles = ROLES;
  readonly priorities = PRIORITIES;

  readonly playbooks = signal<ProcedurePlaybook[]>(this.loadAll());

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.playbooks();
    if (!q) return all;

    return all.filter(p => {
      const hay = [p.title, p.procedure, p.specialty, p.surgeon ?? '', ...(p.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });

  readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.playbooks().find(p => p.id === id) ?? null;
  });

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    id: this.fb.nonNullable.control(''),

    title: this.fb.nonNullable.control('', [Validators.required]),
    specialty: this.fb.nonNullable.control(''),
    procedure: this.fb.nonNullable.control('', [Validators.required]),
    surgeon: this.fb.nonNullable.control(''),
    tags: this.fb.nonNullable.control<string[]>([]),

    phases: this.fb.array<PhaseFG>([]),

    pearls: this.fb.nonNullable.control(''),
  });

  get phasesFA() { return this.form.controls.phases; }

  constructor(private readonly snack: MatSnackBar) {
    if (this.playbooks().length === 0) {
      const blank = this.createBlank();
      this.upsert(blank, true);
      this.selectedId.set(blank.id);
      this.patchFromPlaybook(blank);
    } else {
      const first = this.playbooks()[0];
      this.selectedId.set(first.id);
      this.patchFromPlaybook(first);
    }
  }

  newPlaybook(): void {
    const blank = this.createBlank();
    this.upsert(blank, true);
    this.selectedId.set(blank.id);
    this.patchFromPlaybook(blank);
    this.snack.open('New playbook created.', 'OK', { duration: 2000 });
  }

  select(id: string): void {
    const found = this.playbooks().find(p => p.id === id);
    if (!found) return;
    this.selectedId.set(id);
    this.patchFromPlaybook(found);
  }

  duplicateSelected(): void {
    const cur = this.selected();
    if (!cur) return;

    const copy: ProcedurePlaybook = {
      ...structuredClone(cur),
      id: safeUuid(),
      title: cur.title ? `${cur.title} (copy)` : 'Untitled (copy)',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.upsert(copy, true);
    this.selectedId.set(copy.id);
    this.patchFromPlaybook(copy);
    this.snack.open('Playbook duplicated.', 'OK', { duration: 2200 });
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (!id) return;

    const next = this.playbooks().filter(p => p.id !== id);
    this.playbooks.set(next);
    this.saveAll(next);

    if (next.length) {
      this.selectedId.set(next[0].id);
      this.patchFromPlaybook(next[0]);
    } else {
      const blank = this.createBlank();
      this.upsert(blank, true);
      this.selectedId.set(blank.id);
      this.patchFromPlaybook(blank);
    }

    this.snack.open('Playbook deleted.', 'OK', { duration: 2200 });
  }

  onTemplateChange(ev: MatSelectChange): void {
    const id = ev.value as TemplateId;
    const t = this.templates.find(x => x.id === id);
    if (!t) return;

    // Apply template to phases + suggested tags/pearls; do NOT overwrite title/surgeon unless empty
    if (!this.form.controls.specialty.value) this.form.controls.specialty.setValue(t.specialty);
    if (!this.form.controls.procedure.value) this.form.controls.procedure.setValue(t.procedure);

    // Merge tags unique
    const existing = new Set(this.form.controls.tags.value ?? []);
    (t.tags ?? []).forEach(tag => existing.add(tag));
    this.form.controls.tags.setValue([...existing]);

    if (!this.form.controls.pearls.value) this.form.controls.pearls.setValue(t.pearls ?? '');

    this.replacePhases(t.phases);
    this.snack.open(`Applied template: ${t.label}`, 'OK', { duration: 2400 });
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

  addStep(phaseIndex: number): void {
    this.stepsFA(phaseIndex).push(this.makeStepFG({ text: '', cue: '', role: 'Scrub', priority: 'Normal' }));
  }

  removeStep(phaseIndex: number, stepIndex: number): void {
    this.stepsFA(phaseIndex).removeAt(stepIndex);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Fix required fields (Title + Procedure).', 'OK', { duration: 2800 });
      return;
    }

    const raw = this.form.getRawValue();
    const existing = this.playbooks().find(p => p.id === raw.id);

    const pb: ProcedurePlaybook = {
      id: raw.id || safeUuid(),
      title: raw.title,
      specialty: raw.specialty || '',
      procedure: raw.procedure,
      surgeon: raw.surgeon || '',
      tags: raw.tags ?? [],
      phases: this.readPhases(),
      pearls: raw.pearls || '',
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };

    this.upsert(pb, true);
    this.selectedId.set(pb.id);
    this.snack.open('Playbook saved.', 'OK', { duration: 2200 });
  }

  print(): void {
    window.print();
  }

  // ---------- form helpers ----------
  private createBlank(): ProcedurePlaybook {
    const t = nowIso();
    return {
      id: safeUuid(),
      title: '',
      specialty: '',
      procedure: '',
      surgeon: '',
      tags: [],
      phases: structuredClone(DEFAULT_PHASES),
      pearls: '',
      createdAt: t,
      updatedAt: t,
    };
  }

  private makeStepFG(s: PlaybookStep): StepFG {
    return this.fb.nonNullable.group({
      text: this.fb.nonNullable.control(s.text ?? '', [Validators.required]),
      cue: this.fb.nonNullable.control(s.cue ?? ''),
      role: this.fb.nonNullable.control<StepRole>(s.role ?? 'Scrub'),
      priority: this.fb.nonNullable.control<StepPriority>(s.priority ?? 'Normal'),
    });
  }

  private makePhaseFG(p: PlaybookPhase): PhaseFG {
    return this.fb.nonNullable.group({
      name: this.fb.nonNullable.control(p.name ?? '', [Validators.required]),
      goal: this.fb.nonNullable.control(p.goal ?? ''),
      steps: this.fb.array<StepFG>((p.steps ?? []).map(s => this.makeStepFG(s))),
    });
  }

  stepsFA(phaseIndex: number): FormArray<StepFG> {
    return this.phasesFA.at(phaseIndex).controls.steps as unknown as FormArray<StepFG>;
  }

  private replacePhases(phases: PlaybookPhase[]): void {
    while (this.phasesFA.length) this.phasesFA.removeAt(0);
    phases.forEach(p => this.phasesFA.push(this.makePhaseFG(p)));
  }

  private readPhases(): PlaybookPhase[] {
    return this.phasesFA.controls.map(phaseCtrl => {
      const p = phaseCtrl.getRawValue();
      const steps = p.steps
        .map(s => ({
          text: (s.text ?? '').trim(),
          cue: (s.cue ?? '').trim(),
          role: s.role as StepRole,
          priority: s.priority as StepPriority,
        }))
        .filter(s => s.text.length > 0);

      return {
        name: (p.name ?? '').trim(),
        goal: (p.goal ?? '').trim(),
        steps,
      };
    });
  }

  private patchFromPlaybook(p: ProcedurePlaybook): void {
    this.form.controls.id.setValue(p.id);
    this.form.controls.title.setValue(p.title ?? '');
    this.form.controls.specialty.setValue(p.specialty ?? '');
    this.form.controls.procedure.setValue(p.procedure ?? '');
    this.form.controls.surgeon.setValue(p.surgeon ?? '');
    this.form.controls.tags.setValue(p.tags ?? []);
    this.form.controls.pearls.setValue(p.pearls ?? '');

    this.replacePhases(p.phases?.length ? p.phases : structuredClone(DEFAULT_PHASES));
  }

  // ---------- storage ----------
  private upsert(p: ProcedurePlaybook, persist: boolean): void {
    const all = this.playbooks();
    const idx = all.findIndex(x => x.id === p.id);
    const next = [...all];

    if (idx >= 0) next[idx] = p;
    else next.unshift(p);

    this.playbooks.set(next);
    if (persist) this.saveAll(next);
  }

  private loadAll(): ProcedurePlaybook[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ProcedurePlaybook[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAll(pbs: ProcedurePlaybook[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pbs));
  }
}
