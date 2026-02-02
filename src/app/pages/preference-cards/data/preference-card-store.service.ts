import { Injectable } from '@angular/core';
import { PreferenceCard } from './preference-card.model';

const STORAGE_KEY = 'scrubcompanion_prefcards_v1';

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  // Modern browsers support crypto.randomUUID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'pc_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

@Injectable({ providedIn: 'root' })
export class PreferenceCardStore {
  getAll(): PreferenceCard[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as PreferenceCard[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  getById(id: string): PreferenceCard | undefined {
    return this.getAll().find(c => c.id === id);
  }

  createBlank(): PreferenceCard {
    const t = nowIso();
    return {
      id: safeUuid(),
      title: '',
      specialty: 'Other',
      procedure: '',
      surgeon: '',
      facility: '',
      tags: [],
      positioning: '',
      prepDrape: '',
      equipment: [],
      instruments: [],
      supplies: [],
      sutures: [],
      pearls: '',
      createdAt: t,
      updatedAt: t,
    };
  }

  upsert(input: Omit<PreferenceCard, 'createdAt' | 'updatedAt'> & Partial<Pick<PreferenceCard, 'createdAt'>>): PreferenceCard {
    const all = this.getAll();
    const idx = all.findIndex(c => c.id === input.id);

    const createdAt = input.createdAt ?? (idx >= 0 ? all[idx].createdAt : nowIso());
    const updatedAt = nowIso();

    const card: PreferenceCard = {
      ...input,
      id: input.id || safeUuid(),
      tags: input.tags ?? [],
      equipment: input.equipment ?? [],
      instruments: input.instruments ?? [],
      supplies: input.supplies ?? [],
      sutures: input.sutures ?? [],
      createdAt,
      updatedAt,
    } as PreferenceCard;

    if (idx >= 0) all[idx] = card;
    else all.unshift(card);

    this.saveAll(all);
    return card;
  }

  delete(id: string): void {
    const next = this.getAll().filter(c => c.id !== id);
    this.saveAll(next);
  }

  private saveAll(cards: PreferenceCard[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }
}
