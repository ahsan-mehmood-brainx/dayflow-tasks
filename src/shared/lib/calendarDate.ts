/** A calendar day in ISO 8601 format (`YYYY-MM-DD`), independent of time zone. Sorts lexicographically. */
export type CalendarDate = string;

/** An instant in ISO 8601 format with an explicit offset, e.g. `2026-11-02T09:30:00.000Z`. */
export type IsoTimestamp = string;

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parseCalendarDate(value: string): DateParts | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Round-trip through Date to reject impossible days such as 2026-02-30.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function formatParts(year: number, month: number, day: number): CalendarDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

export function isIsoTimestamp(value: string): boolean {
  return ISO_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/** The calendar day of `date` in the device's local time zone. */
export function toCalendarDate(date: Date): CalendarDate {
  return formatParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Local midnight on the given day, for pickers and display formatting. */
export function calendarDateToLocalDate(value: CalendarDate): Date | null {
  const parts = parseCalendarDate(value);
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : null;
}

export function addDays(value: CalendarDate, days: number): CalendarDate {
  const parts = parseCalendarDate(value);
  if (!parts) throw new RangeError(`Invalid calendar date: "${value}"`);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}
