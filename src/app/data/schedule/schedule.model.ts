export type ScheduleEventType = 'shift' | 'call' | 'payday' | 'note' | 'off';

export type ScheduleEvent = {
    id: string;
    type: ScheduleEventType;

    // ISO strings for easy storage + sorting //
    startIso: string;
    endIso?: string; //payday can be single instant

    title: string;
    notes?: string;

    // used for overrides, like "sent home early" etc.
    source?: 'generated' | 'manual' | 'override';

};

export type ShiftTemplate = {
    daysOfWeek: number[]; // 0=Sun .. 6=Sat
    startTime: string; // "07:00"
    endTime: string; // "15:30"
    unpaidBreakMin: number;
};

export type PaydayRule = {
    anchorDateIso: string;
    cadenceDays: number; // biweekly = 14
    title?: string; // Payday
};

export type ScheduleSettings = {
    shiftTemplate: ShiftTemplate;
    callDaysOfWeek: number[];
    paydayRule: PaydayRule;

    // how far ahead we generate
    generateDaysAhead: number; // e.g. 90
};