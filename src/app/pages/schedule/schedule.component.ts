/*
import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCalendarCellCssClasses } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,

    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(null as unknown as ScheduleSettings);
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  // ✅ declare, initialize in constructor (no "used before init")
  overrideForm!: FormGroup;

  readonly rangeEvents = computed(() => {
    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s?.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  constructor(
    private readonly store: ScheduleStore,
    private readonly snack: MatSnackBar,
    private readonly fb: FormBuilder
  ) {
    // ✅ now DI is ready
    this.settings.set(this.store.getSettings());

    // ✅ now safe
    this.overrideForm = this.fb.nonNullable.group({
      type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
      title: this.fb.nonNullable.control('Override', [Validators.required]),
      startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
      endTime: this.fb.nonNullable.control('15:30'),
      notes: this.fb.nonNullable.control(''),
    });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  // (optional) calendar marker helper — if you use it in template
  eventsCountForDate = (d: Date): number => {
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);
    return this.store.getEventsInRange(dayStart, dayEnd).length;
  };

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(d: string): void {
    const cur = this.settings();
    if (!d) return;
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: new Date(d).toISOString() },
    });
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue() as {
      type: ScheduleEventType;
      title: string;
      startTime: string;
      endTime: string;
      notes: string;
    };

    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => Number(n));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => Number(n));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MatDatepickerModule,
  MatCalendarCellClassFunction,
  MatCalendarCellCssClasses,
} from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  // NOTE: fb is available because we used inject()
  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s?.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const items = this.dayEvents();
    const shift = items.filter(e => e.type === 'shift').length;
    const call = items.filter(e => e.type === 'call').length;
    const payday = items.filter(e => e.type === 'payday').length;
    const off = items.filter(e => e.type === 'off').length;
    return { shift, call, payday, off, total: items.length };
  });

  // ✅ correct signature + return type for mat-calendar dateClass
  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view: 'month' | 'year' | 'multi-year') => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const events = this.store.getEventsInRange(dayStart, dayEnd);
    if (!events.length) return '';

    const classes: string[] = ['has-events'];
    if (events.some(e => e.type === 'shift')) classes.push('has-shift');
    if (events.some(e => e.type === 'call')) classes.push('has-call');
    if (events.some(e => e.type === 'payday')) classes.push('has-payday');
    if (events.some(e => e.type === 'off')) classes.push('has-off');

    return classes as MatCalendarCellCssClasses;
  };

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has ? cur.callDaysOfWeek.filter(x => x !== dow) : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);
    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(d: string): void {
    const cur = this.settings();
    if (!d) return;
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: new Date(d).toISOString() },
    });
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => Number(n));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => Number(n));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    if (t === 'off') return 'Off';
    return t;
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';
    return '';
  };

  constructor(
    private readonly store: ScheduleStore,
    private readonly snack: MatSnackBar,
    private readonly fb: FormBuilder
  ) {}

  // ---- template helper setters (NO Number() in HTML) ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  // ✅ inject() is available immediately for field initializers
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';
    return '';
  };

  // ---- template helper setters (no Number() in HTML) ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  // Datepicker model for anchor date (Date object, not a string)
  readonly paydayAnchorDate = computed(() => {
    const iso = this.settings().paydayRule.anchorDateIso;
    return iso ? new Date(iso) : null;
  });

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    if (events.some(e => e.source === 'override' || e.source === 'manual')) return 'cal-override';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday'; // Green
    if (types.has('call')) return 'cal-call'; // Purple
    if (types.has('shift')) return 'cal-shift'; // Blue
    if (types.has('off')) return 'cal-off';
    return '';
  };

  // ---- setters (keep template clean) ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  // ✅ datepicker change handler (no pipes in template)
  setAnchorPaydayDate(d: Date | null): void {
    if (!d) return;
    const cur = this.settings();
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  // ✅ forces calendar + day list to refresh after add/delete override
  readonly eventsTick = signal(0);

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    this.eventsTick(); // ✅ dependency

    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    this.eventsTick(); // ✅ dependency

    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  // ✅ datepicker-friendly selected date for payday anchor
  readonly anchorDateValue = computed(() => {
    const iso = this.settings().paydayRule.anchorDateIso;
    return iso ? new Date(iso) : null;
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    // ✅ overrides/manual get red priority
    const hasOverride = events.some(e => e.source === 'manual' || e.source === 'override');
    if (hasOverride) return 'cal-override';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';

    return '';
  };

  // ---- template helper setters ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });

    // not required, but makes sure any future computed views refresh consistently
    this.eventsTick.update(x => x + 1);
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  // ✅ used by datepicker (MatDatepicker) change
  setAnchorPaydayDate(date: Date | null): void {
    if (!date) return;
    const cur = this.settings();
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(date).toISOString() },
    });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    // ✅ force calendar/day list to refresh
    this.eventsTick.update(x => x + 1);

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);

    // ✅ force calendar/day list to refresh
    this.eventsTick.update(x => x + 1);

    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
*

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  // 🔴 IMPORTANT: tick signal forces calendar/dateClass recompute after adding overrides
  private readonly eventsTick = signal(0);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    // 👇 this line makes it reactive when overrides change
    this.eventsTick();

    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    // 👇 also reactive for the day detail list
    this.eventsTick();

    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  // ✅ Any override/manual event makes the day RED (highest priority)
  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    // 🔴 Priority 1: any manual/override should be red
    const hasOverride = events.some(e => e.source === 'manual' || e.source === 'override');
    if (hasOverride) return 'cal-override';

    // Priority 2: payday/call/shift/off
    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';

    return '';
  };

  // ---- template helper setters ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    // 🔴 force UI refresh so dateClass runs again
    this.eventsTick.update(x => x + 1);

    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.eventsTick.update(x => x + 1);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
} THE ABOVE CODE WORKS BUT STILL NOT RED ON OVERRIDES IN CALENDAR
 *

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule, MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',

  // ✅ THIS is the key: allow styling of MatCalendar internals from this component’s SCSS
  encapsulation: ViewEncapsulation.None,
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  // forces calendar/dateClass recompute after adding/deleting overrides
  private readonly eventsTick = signal(0);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    this.eventsTick(); // make reactive

    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    this.eventsTick(); // make reactive

    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  // ✅ Any manual/override event makes the day RED (highest priority)
  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    // highest priority: any manual/override event
    if (events.some(e => e.source === 'manual' || e.source === 'override')) return 'cal-override';

    // then the normal types
    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';

    return '';
  };

  // ---- template helper setters ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'override',
    });

    this.eventsTick.update(x => x + 1);
    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.eventsTick.update(x => x + 1);
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
}
 !!!!!! ADDING LOGIC TO CODE ABOVE TO AUTO REFRESH THE PAGE WITH ANY CALENDAR CHANGE !!!!!!
 *

 import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule, MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  // ✅ grab the calendar instance so we can force redraw when data changes
  @ViewChild(MatCalendar) private calendar?: MatCalendar<Date>;

  // forces computeds to rerun (and helps keep day list in sync)
  private readonly eventsTick = signal(0);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  readonly overrideForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Override', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    this.eventsTick(); // reactive

    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    this.eventsTick(); // reactive

    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  // ✅ Any manual/override event makes the day RED (highest priority)
  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    const hasOverride = events.some(e => e.source === 'manual' || e.source === 'override');
    if (hasOverride) return 'cal-override';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';

    return '';
  };

  // ✅ single place to keep UI in sync (calendar + computed lists)
  private refreshCalendar(): void {
    this.eventsTick.update(x => x + 1);

    // MatCalendar doesn’t automatically re-run dateClass for all cells when data changes.
    // This forces a re-render safely.
    queueMicrotask(() => {
      this.calendar?.updateTodaysDate();
    });
  }

  // ---- template helper setters ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
    this.refreshCalendar();
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
    this.refreshCalendar();
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
    this.refreshCalendar();
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
    this.refreshCalendar();
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
    // day list should update immediately too
    this.refreshCalendar();
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
    this.refreshCalendar();
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
    this.refreshCalendar();
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
    this.refreshCalendar();
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
    this.refreshCalendar();
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  addOverride(): void {
    if (this.overrideForm.invalid) {
      this.overrideForm.markAllAsTouched();
      return;
    }

    const v = this.overrideForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'manual',
    });

    this.refreshCalendar();
    this.snack.open('Override saved.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.refreshCalendar();
    this.snack.open('Removed manual event.', 'OK', { duration: 1800 });
  }

  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual' || e.source === 'override';
  }
} 
!!!!!!! THE ABOVE CODE TREATS THE EVENTS SUCH AS BEING SENT HOME OR STAYING LATE AS OVERRIDES THAT MESSES WITH LOGIC TOO MUCH !!!!!!!!
*/

// THIS CODE BELOW REMOVES OVERRIDE LOGIC AND JUST MAKES THE "OVERRIDES" JUST BE CALENDAR EVENTS THAT ARE ADDED MANUALLY

import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule, MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';

import { ScheduleStore } from '../../data/schedule/schedule-store.service';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from '../../data/schedule/schedule.model';

type Dow = { id: number; label: string };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,

    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDatepickerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  private readonly store = inject(ScheduleStore);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  @ViewChild(MatCalendar) private calendar?: MatCalendar<Date>;

  private readonly eventsTick = signal(0);

  readonly dows: Dow[] = [
    { id: 0, label: 'Sun' },
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
  ];

  readonly settings = signal<ScheduleSettings>(this.store.getSettings());
  readonly selectedDate = signal<Date>(startOfDay(new Date()));

  // ✅ Renamed: manual event form
  readonly eventForm = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<ScheduleEventType>('shift', [Validators.required]),
    title: this.fb.nonNullable.control('Manual Event', [Validators.required]),
    startTime: this.fb.nonNullable.control('07:00', [Validators.required]),
    endTime: this.fb.nonNullable.control('15:30'),
    notes: this.fb.nonNullable.control(''),
  });

  readonly rangeEvents = computed(() => {
    this.eventsTick();

    const s = this.settings();
    const from = startOfDay(new Date());
    const to = new Date(from);
    to.setDate(to.getDate() + (s.generateDaysAhead ?? 90));
    return this.store.getEventsInRange(from, to);
  });

  readonly dayEvents = computed(() => {
    this.eventsTick();

    const dayStart = startOfDay(this.selectedDate());
    const dayEnd = endOfDay(this.selectedDate());
    return this.store.getEventsInRange(dayStart, dayEnd);
  });

  readonly daySummary = computed(() => {
    const events = this.dayEvents();
    return {
      total: events.length,
      shift: events.filter(e => e.type === 'shift').length,
      call: events.filter(e => e.type === 'call').length,
      payday: events.filter(e => e.type === 'payday').length,
      off: events.filter(e => e.type === 'off').length,
    };
  });

  // ✅ Manual events (user-entered) color = red (highest priority)
  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view) => {
    if (view !== 'month') return '';

    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const events = this.rangeEvents().filter(e => {
      const t = new Date(e.startIso).getTime();
      return t >= dayStart && t <= dayEnd;
    });

    if (!events.length) return '';

    const hasManual = events.some(e => e.source === 'manual');
    if (hasManual) return 'cal-manual';

    const types = new Set(events.map(e => e.type));
    if (types.has('payday')) return 'cal-payday';
    if (types.has('call')) return 'cal-call';
    if (types.has('shift')) return 'cal-shift';
    if (types.has('off')) return 'cal-off';

    return '';
  };

  private refreshCalendar(): void {
    this.eventsTick.update(x => x + 1);
    queueMicrotask(() => this.calendar?.updateTodaysDate());
  }

  // ---- template helper setters ----
  setShiftStart(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, startTime: value || '' } });
    this.refreshCalendar();
  }

  setShiftEnd(value: string): void {
    const cur = this.settings();
    this.settings.set({ ...cur, shiftTemplate: { ...cur.shiftTemplate, endTime: value || '' } });
    this.refreshCalendar();
  }

  setCadenceDays(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '14', 10);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, cadenceDays: Number.isFinite(n) && n > 0 ? n : 14 },
    });
    this.refreshCalendar();
  }

  setGenerateDaysAhead(raw: string): void {
    const cur = this.settings();
    const n = parseInt(raw || '90', 10);
    this.settings.set({ ...cur, generateDaysAhead: Number.isFinite(n) && n > 0 ? n : 90 });
    this.refreshCalendar();
  }

  selectDate(d: Date | null): void {
    if (!d) return;
    this.selectedDate.set(startOfDay(d));
    this.refreshCalendar();
  }

  saveSettings(): void {
    this.store.saveSettings(this.settings());
    this.snack.open('Schedule settings saved (local).', 'OK', { duration: 2000 });
    this.refreshCalendar();
  }

  toggleTemplateDay(dow: number): void {
    const cur = this.settings();
    const has = cur.shiftTemplate.daysOfWeek.includes(dow);
    const nextDays = has
      ? cur.shiftTemplate.daysOfWeek.filter(x => x !== dow)
      : [...cur.shiftTemplate.daysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({
      ...cur,
      shiftTemplate: { ...cur.shiftTemplate, daysOfWeek: nextDays },
    });
    this.refreshCalendar();
  }

  toggleCallDay(dow: number): void {
    const cur = this.settings();
    const has = cur.callDaysOfWeek.includes(dow);
    const nextDays = has
      ? cur.callDaysOfWeek.filter(x => x !== dow)
      : [...cur.callDaysOfWeek, dow].sort((a, b) => a - b);

    this.settings.set({ ...cur, callDaysOfWeek: nextDays });
    this.refreshCalendar();
  }

  setAnchorPayday(dateStr: string): void {
    if (!dateStr) return;
    const cur = this.settings();
    const d = new Date(dateStr);
    this.settings.set({
      ...cur,
      paydayRule: { ...cur.paydayRule, anchorDateIso: startOfDay(d).toISOString() },
    });
    this.refreshCalendar();
  }

  prettyType(t: ScheduleEventType): string {
    if (t === 'shift') return 'Shift';
    if (t === 'call') return 'Call';
    if (t === 'payday') return 'Payday';
    return 'Off';
  }

  // ✅ Renamed: add manual event
  addEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const v = this.eventForm.getRawValue();
    const base = startOfDay(this.selectedDate());

    const start = new Date(base);
    const [sh, sm] = v.startTime.split(':').map(n => parseInt(n, 10));
    start.setHours(sh || 0, sm || 0, 0, 0);

    let endIso: string | undefined;
    if (v.endTime?.trim()) {
      const end = new Date(base);
      const [eh, em] = v.endTime.split(':').map(n => parseInt(n, 10));
      end.setHours(eh || 0, em || 0, 0, 0);
      if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
      endIso = end.toISOString();
    }

    this.store.upsertManualEvent({
      type: v.type,
      title: v.title.trim(),
      startIso: start.toISOString(),
      endIso,
      notes: v.notes?.trim() || undefined,
      source: 'manual',
    });

    this.refreshCalendar();
    this.snack.open('Event added.', 'OK', { duration: 1800 });
  }

  deleteEvent(id: string): void {
    this.store.deleteManualEvent(id);
    this.refreshCalendar();
    this.snack.open('Event removed.', 'OK', { duration: 1800 });
  }

  // ✅ Manual means user-entered
  isManual(e: ScheduleEvent): boolean {
    return e.source === 'manual';
  }
}