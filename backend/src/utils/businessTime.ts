import { DateTime } from 'luxon';

export interface BusinessCalendar {
  timezone: string;
  workDays: number[]; // 1=Mon ... 7=Sun (Luxon)
  start: string; // HH:mm
  end: string; // HH:mm
}

function parseHHmm(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':');
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Invalid time: ${value}`);
  }
  return { hour, minute };
}

function isWorkDay(dt: DateTime, cal: BusinessCalendar): boolean {
  return cal.workDays.includes(dt.weekday);
}

function dayStart(dt: DateTime, cal: BusinessCalendar): DateTime {
  const { hour, minute } = parseHHmm(cal.start);
  return dt.set({ hour, minute, second: 0, millisecond: 0 });
}

function dayEnd(dt: DateTime, cal: BusinessCalendar): DateTime {
  const { hour, minute } = parseHHmm(cal.end);
  return dt.set({ hour, minute, second: 0, millisecond: 0 });
}

function nextWorkingDayStart(dt: DateTime, cal: BusinessCalendar): DateTime {
  let cursor = dt.plus({ days: 1 }).startOf('day');
  while (!isWorkDay(cursor, cal)) {
    cursor = cursor.plus({ days: 1 });
  }
  return dayStart(cursor, cal);
}

function normalizeStart(dt: DateTime, cal: BusinessCalendar): DateTime {
  let cursor = dt;
  if (!isWorkDay(cursor, cal)) {
    // jump to next workday start
    cursor = cursor.startOf('day');
    while (!isWorkDay(cursor, cal)) cursor = cursor.plus({ days: 1 });
    return dayStart(cursor, cal);
  }

  const start = dayStart(cursor.startOf('day'), cal);
  const end = dayEnd(cursor.startOf('day'), cal);

  if (cursor < start) return start;
  if (cursor >= end) return nextWorkingDayStart(cursor, cal);
  return cursor;
}

// Adds business-time milliseconds to a UTC date and returns a UTC Date.
export function addBusinessMs(startUtc: Date, ms: number, cal: BusinessCalendar): Date {
  if (ms <= 0) return startUtc;

  let cursor = DateTime.fromJSDate(startUtc, { zone: 'utc' }).setZone(cal.timezone);
  cursor = normalizeStart(cursor, cal);

  let remaining = ms;
  while (remaining > 0) {
    const startOfDay = cursor.startOf('day');
    const end = dayEnd(startOfDay, cal);
    const available = Math.max(0, end.toMillis() - cursor.toMillis());

    if (remaining <= available) {
      cursor = cursor.plus({ milliseconds: remaining });
      remaining = 0;
      break;
    }

    remaining -= available;
    cursor = nextWorkingDayStart(cursor, cal);
  }

  return cursor.setZone('utc').toJSDate();
}

// Calculates how much business-time elapsed between two UTC instants.
export function businessMsBetween(startUtc: Date, endUtc: Date, cal: BusinessCalendar): number {
  const start = DateTime.fromJSDate(startUtc, { zone: 'utc' }).setZone(cal.timezone);
  const end = DateTime.fromJSDate(endUtc, { zone: 'utc' }).setZone(cal.timezone);
  if (end <= start) return 0;

  let cursorDay = start.startOf('day');
  const lastDay = end.startOf('day');

  let total = 0;
  while (cursorDay <= lastDay) {
    if (isWorkDay(cursorDay, cal)) {
      const s = dayStart(cursorDay, cal);
      const e = dayEnd(cursorDay, cal);

      const intervalStart = start > s ? start : s;
      const intervalEnd = end < e ? end : e;

      if (intervalEnd > intervalStart) {
        total += intervalEnd.toMillis() - intervalStart.toMillis();
      }
    }

    cursorDay = cursorDay.plus({ days: 1 });
  }

  return total;
}
