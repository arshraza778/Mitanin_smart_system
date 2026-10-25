/**
 * Domain Date & Time utilities.
 * Handles demo clock offsets, locale formatting (en-IN / hi-IN),
 * and graceful fallback to '--' for missing or invalid dates.
 */

export function parseDateSafe(val?: string | number | Date | null): Date | null {
  if (val == null || val === '') return null;
  const d = typeof val === 'number' ? new Date(val) : val instanceof Date ? val : new Date(String(val));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function getDemoDate(offsetMinutes: number = 0, baseNow: number = Date.now()): Date {
  return new Date(baseNow + offsetMinutes * 60 * 1000);
}

/**
 * Format a time as '10:42' in 24-hour HH:mm.
 * Returns '--' for missing or invalid date, never 'Invalid Date'.
 */
export function formatTime(
  val?: string | number | Date | null,
  _lang: 'en' | 'hi' = 'en'
): string {
  const d = parseDateSafe(val);
  if (!d) return '--';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format a date as '24 Oct' (or '24 अक्टू॰' in Hindi) via Intl.DateTimeFormat.
 * Returns '--' for missing or invalid date, never 'Invalid Date'.
 */
export function formatDate(
  val?: string | number | Date | null,
  lang: 'en' | 'hi' = 'en'
): string {
  const d = parseDateSafe(val);
  if (!d) return '--';
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
  } catch {
    return '--';
  }
}

/**
 * Format date and time, e.g. '24 Oct, 10:42'.
 * Returns '--' for missing or invalid date.
 */
export function formatDateTime(
  val?: string | number | Date | null,
  lang: 'en' | 'hi' = 'en'
): string {
  const d = parseDateSafe(val);
  if (!d) return '--';
  const dateStr = formatDate(d, lang);
  const timeStr = formatTime(d, lang);
  if (dateStr === '--' || timeStr === '--') return '--';
  return `${dateStr}, ${timeStr}`;
}

export interface WeekDayItem {
  offset: number;
  date: Date;
  dayNumber: number;
  weekdayNarrow: string;
  weekdayShort: string;
  weekdayLong: string;
  isToday: boolean;
}

/**
 * Generates a 7-day week strip centred on the given date (offsets -3 to +3).
 */
export function getCenteredWeekDays(centerDate: Date, lang: 'en' | 'hi' = 'en'): WeekDayItem[] {
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const items: WeekDayItem[] = [];

  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate() + offset, 12, 0, 0);
    const dayNumber = d.getDate();
    let weekdayNarrow = '';
    let weekdayShort = '';
    let weekdayLong = '';
    try {
      weekdayNarrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(d);
      weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
      weekdayLong = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
    } catch {
      weekdayNarrow = String(d.getDay());
      weekdayShort = String(d.getDay());
      weekdayLong = String(d.getDay());
    }

    items.push({
      offset,
      date: d,
      dayNumber,
      weekdayNarrow,
      weekdayShort,
      weekdayLong,
      isToday: offset === 0,
    });
  }

  return items;
}
