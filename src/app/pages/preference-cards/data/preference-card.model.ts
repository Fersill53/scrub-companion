export type Specialty =
  | 'General'
  | 'Ortho'
  | 'Neuro'
  | 'CV'
  | 'GYN'
  | 'ENT'
  | 'Plastics'
  | 'Urology'
  | 'Ophthalmology'
  | 'Other';

export type CaseItem = {
  name: string;
  qty?: number | null;
  notes?: string;
};

export type PreferenceCard = {
  id: string;

  // Basics
  title: string;         // e.g., "TKA - Dr. Smith"
  specialty: Specialty;
  procedure: string;     // e.g., "Total Knee Arthroplasty"
  surgeon?: string;
  facility?: string;
  tags: string[];

  // Setup (tech-focused)
  positioning?: string;
  prepDrape?: string;
  equipment: CaseItem[];

  // Pick list
  instruments: CaseItem[];
  supplies: CaseItem[];
  sutures: CaseItem[];

  // Notes
  pearls?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};
