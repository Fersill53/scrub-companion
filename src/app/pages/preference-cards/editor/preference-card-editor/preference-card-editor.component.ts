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
