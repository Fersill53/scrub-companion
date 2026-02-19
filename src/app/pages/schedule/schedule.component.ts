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
*/

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