import { PreferenceCard, Specialty } from './preference-card.model';

export type CardTemplateId =
  | 'ortho-basic'
  | 'gen-lap-basic'
  | 'csection-basic';

export type CardTemplate = {
  id: CardTemplateId;
  label: string;
  specialty: Specialty;
  defaults: Pick<
    PreferenceCard,
    | 'specialty'
    | 'equipment'
    | 'instruments'
    | 'supplies'
    | 'sutures'
    | 'positioning'
    | 'prepDrape'
    | 'pearls'
    | 'tags'
  >;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'ortho-basic',
    label: 'Ortho — Basic (starter)',
    specialty: 'Ortho',
    defaults: {
      specialty: 'Ortho',
      tags: ['ortho'],
      positioning: 'Confirm laterality. Pad bony prominences.',
      prepDrape: 'Standard ortho prep & drape (per surgeon).',
      equipment: [
        { name: 'Bovie + scratch pad' },
        { name: 'Suction x2', notes: 'Yankauer + Poole if needed' },
        { name: 'Tourniquet (if used)', notes: 'Confirm size/pressure' },
        { name: 'Power equipment', notes: 'Drill + batteries' },
      ],
      instruments: [
        { name: 'Basic ortho set' },
        { name: 'Major set (if needed)' },
        { name: 'Power drill attachments' },
      ],
      supplies: [
        { name: 'Laps', qty: 10 },
        { name: 'Raytecs', qty: 10 },
        { name: 'Ioban (if used)' },
        { name: 'Stockinette (if used)' },
      ],
      sutures: [
        { name: '0 Vicryl (deep)', qty: 1 },
        { name: '2-0 Vicryl (subQ)', qty: 1 },
        { name: '3-0 Monocryl (skin)', qty: 1 },
      ],
      pearls: 'Add implant system + sizing range once you know surgeon preference.',
    },
  },
  {
    id: 'gen-lap-basic',
    label: 'General — Basic Lap (starter)',
    specialty: 'General',
    defaults: {
      specialty: 'General',
      tags: ['general', 'lap'],
      positioning: 'Supine. Arms per surgeon. SCDs on.',
      prepDrape: 'Chloraprep abdomen. Lap drape (per facility).',
      equipment: [
        { name: 'Laparoscopy tower + camera head' },
        { name: 'Insufflator tubing + CO₂' },
        { name: 'Light cord + scope', notes: 'Confirm 0° vs 30°' },
        { name: 'Suction/irrigation setup' },
        { name: 'Bovie + scratch pad' },
      ],
      instruments: [
        { name: 'Lap basic set' },
        { name: 'Trocars (assorted)', notes: 'Confirm sizes' },
        { name: 'Clip applier (if needed)' },
      ],
      supplies: [
        { name: 'Laps', qty: 10 },
        { name: 'Raytecs', qty: 10 },
        { name: 'Endo bag (if needed)' },
      ],
      sutures: [
        { name: '0 Vicryl (fascia)', qty: 1 },
        { name: '4-0 Monocryl (skin)', qty: 1 },
      ],
      pearls: 'Add procedure-specific items (cholangiogram, etc.) as needed.',
    },
  },
  {
    id: 'csection-basic',
    label: 'OB — C-Section (starter)',
    specialty: 'GYN',
    defaults: {
      specialty: 'GYN',
      tags: ['ob', 'c-section'],
      positioning: 'Supine with left tilt. Confirm safety straps.',
      prepDrape: 'Per OB protocol. U-drape / clear drape if used.',
      equipment: [
        { name: 'Bovie + scratch pad' },
        { name: 'Suction x2' },
        { name: 'Warming unit (if used)' },
      ],
      instruments: [
        { name: 'C-section set' },
        { name: 'Bladder blade' },
        { name: 'Suture scissors (heavy + fine)' },
      ],
      supplies: [
        { name: 'Laps', qty: 20 },
        { name: 'Raytecs', qty: 10 },
        { name: 'Bulb syringe' },
      ],
      sutures: [
        { name: '0 Vicryl (uterus)', qty: 2 },
        { name: '2-0 Vicryl (fascia)', qty: 1 },
        { name: '3-0 Vicryl (subQ)', qty: 1 },
        { name: '4-0 Monocryl (skin)', qty: 1 },
      ],
      pearls: 'Confirm delayed cord clamp / skin closure preference.',
    },
  },
];

export function getTemplateById(id: CardTemplateId | null | undefined): CardTemplate | undefined {
  if (!id) return undefined;
  return CARD_TEMPLATES.find(t => t.id === id);
}
