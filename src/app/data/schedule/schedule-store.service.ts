import { Injectable } from '@angular/core';
import { ScheduleEvent, ScheduleEventType, ScheduleSettings } from './schedule.model';

const SETTINGS_KEY = 'scrubcompanion_schedule_settings_v1';
const EVENTS_KEY = 'scrubcompanion_schedule_events_v1';

function safeUuid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'evt_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '00:00').split(':').map(x => Number(x));
  return (h || 0) * 60 + (m || 0);
}

function setTimeOnDate(d: Date, hhmm: string): Date {
  const mins = parseTimeToMinutes(hhmm);
  const copy = new Date(d);
  copy.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return copy;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function defaultSettings(): ScheduleSettings {
  const today = new Date();
  return {
    shiftTemplate: {
      daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
      startTime: '06:30',
      endTime: '19:00',
      unpaidBreakMin: 30,
    },
    callDaysOfWeek: [],
    paydayRule: {
      anchorDateIso: startOfDay(today).toISOString(),
      cadenceDays: 14,
      title: 'Payday',
    },
    generateDaysAhead: 90,
  };
}

function loadSettings(): ScheduleSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();

  try {
    const parsed = JSON.parse(raw) as ScheduleSettings;

    // quick sanity check
    if (
      parsed &&
      parsed.shiftTemplate &&
      typeof parsed.shiftTemplate.startTime === 'string' &&
      typeof parsed.shiftTemplate.endTime === 'string' &&
      parsed.paydayRule &&
      typeof parsed.paydayRule.anchorDateIso === 'string'
    ) {
      return {
        ...defaultSettings(),
        ...parsed,
        shiftTemplate: { ...defaultSettings().shiftTemplate, ...parsed.shiftTemplate },
        paydayRule: { ...defaultSettings().paydayRule, ...parsed.paydayRule },
      };
    }
  } catch {
    // ignore
  }

  return defaultSettings();
}

function saveSettings(s: ScheduleSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadManualEvents(): ScheduleEvent[] {
  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScheduleEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManualEvents(events: ScheduleEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

@Injectable({ providedIn: 'root' })
export class ScheduleStore {
  getSettings(): ScheduleSettings {
    return loadSettings();
  }

  saveSettings(next: ScheduleSettings): void {
    saveSettings(next);
  }

  getManualEvents(): ScheduleEvent[] {
    return loadManualEvents();
  }

  upsertManualEvent(e: Omit<ScheduleEvent, 'id'> & { id?: string }): ScheduleEvent {
    const all = loadManualEvents();

    const saved: ScheduleEvent = {
      ...e,
      id: e.id || safeUuid(),
      source: e.source ?? 'manual',
    };

    const next = all.some(x => x.id === saved.id)
      ? all.map(x => (x.id === saved.id ? saved : x))
      : [saved, ...all];

    saveManualEvents(next);
    return saved;
  }

  deleteManualEvent(id: string): void {
    const all = loadManualEvents().filter(x => x.id !== id);
    saveManualEvents(all);
  }

  //// Combined View: Generated shifts/call/paydays + manual overrides ////
  getEventsInRange(from: Date, to: Date): ScheduleEvent[] {
    const settings = loadSettings();
    const manual = loadManualEvents();

    const generated: ScheduleEvent[] = [
      ...this.generateShifts(settings, from, to),
      ...this.generateCalls(settings, from, to),
      ...this.generatePaydays(settings, from, to),
    ];

    const combined = [...generated, ...manual];

    const min = from.getTime();
    const max = to.getTime();

    return combined
      .filter(e => {
        const s = new Date(e.startIso).getTime();
        return s >= min && s <= max;
      })
      .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());
  }

  getNext(type: ScheduleEventType): ScheduleEvent | null {
    const settings = loadSettings();
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + (settings.generateDaysAhead ?? 90));

    const events = this.getEventsInRange(now, to).filter(e => e.type === type);
    return events.length ? events[0] : null;
  }

  //// --------- GENERATION --------- ////

  private generateShifts(settings: ScheduleSettings, from: Date, to: Date): ScheduleEvent[] {
    const out: ScheduleEvent[] = [];
    const start = startOfDay(from);
    const end = startOfDay(to);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (!settings.shiftTemplate.daysOfWeek.includes(dow)) continue;

      const startDt = setTimeOnDate(d, settings.shiftTemplate.startTime);
      const endDt = setTimeOnDate(d, settings.shiftTemplate.endTime);

      out.push({
        id: `gen_shift_${startDt.toISOString()}`,
        type: 'shift',
        startIso: startDt.toISOString(),
        endIso: endDt.toISOString(),
        title: 'Shift',
        notes: `Template shift • Break: ${settings.shiftTemplate.unpaidBreakMin} min`,
        source: 'generated',
      });
    }

    return out;
  }

  private generateCalls(settings: ScheduleSettings, from: Date, to: Date): ScheduleEvent[] {
    const out: ScheduleEvent[] = [];
    const start = startOfDay(from);
    const end = startOfDay(to);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (!settings.callDaysOfWeek.includes(dow)) continue;

      const startDt = setTimeOnDate(d, '07:00');
      const endDt = new Date(startDt);
      endDt.setDate(endDt.getDate() + 1); // 24h call by default

      out.push({
        id: `gen_call_${startDt.toISOString()}`,
        type: 'call',
        startIso: startDt.toISOString(),
        endIso: endDt.toISOString(),
        title: 'Call',
        notes: 'Generated from call day rule',
        source: 'generated',
      });
    }

    return out;
  }

  private generatePaydays(settings: ScheduleSettings, from: Date, to: Date): ScheduleEvent[] {
    const out: ScheduleEvent[] = [];

    const anchor = startOfDay(new Date(settings.paydayRule.anchorDateIso));
    const start = startOfDay(from);
    const end = startOfDay(to);

    const cadence = Math.max(1, Number(settings.paydayRule.cadenceDays || 14));

    // First payday on/after start
    const diff = daysBetween(anchor, start);
    const steps = diff <= 0 ? 0 : Math.ceil(diff / cadence);

    const first = new Date(anchor);
    first.setDate(first.getDate() + steps * cadence);

    for (let d = new Date(first); d <= end; d.setDate(d.getDate() + cadence)) {
      const paydayAt = setTimeOnDate(d, '08:00');
      out.push({
        id: `gen_payday_${paydayAt.toISOString()}`,
        type: 'payday',
        startIso: paydayAt.toISOString(),
        title: settings.paydayRule.title || 'Payday',
        notes: `Every ${cadence} days`,
        source: 'generated',
      });
    }

    return out;
  }
}
