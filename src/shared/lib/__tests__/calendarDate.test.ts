import { addDays, calendarDateToLocalDate, isCalendarDate, isIsoTimestamp, toCalendarDate } from '../calendarDate';

describe('calendar dates', () => {
  it.each([
    ['2026-11-02', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-11-2', false],
    ['11/02/2026', false],
    ['2026-11-02T00:00:00Z', false],
  ])('isCalendarDate(%s) is %s', (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('converts between local dates and calendar days without time-zone drift', () => {
    expect(toCalendarDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(calendarDateToLocalDate('2026-01-05')).toEqual(new Date(2026, 0, 5));
    expect(calendarDateToLocalDate('not-a-date')).toBeNull();
  });

  it.each([
    ['2026-11-02T09:30:00.000Z', true],
    ['2026-11-02T09:30:00+05:00', true],
    ['2026-11-02T09:30:00', false],
    ['2026-11-02', false],
    ['yesterday', false],
  ])('isIsoTimestamp(%s) is %s', (value, expected) => {
    expect(isIsoTimestamp(value)).toBe(expected);
  });
});
