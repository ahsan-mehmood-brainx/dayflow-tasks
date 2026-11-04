import { addDays, calendarDateToLocalDate, type CalendarDate, type IsoTimestamp } from '@/shared/lib/calendarDate';

import type { Task, TaskPriority } from '../domain/task';
import { getTaskTimeframe } from '../domain/taskRules';

// Formatters use the device locale and are created once; constructing Intl objects is relatively costly.
const shortDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const shortDateWithYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const dateTime = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** "Today", "Tomorrow", "Yesterday", or a short date (with the year when it differs from today's). */
export function formatDueDate(dueDate: CalendarDate, today: CalendarDate): string {
  if (dueDate === today) return 'Today';
  if (dueDate === addDays(today, 1)) return 'Tomorrow';
  if (dueDate === addDays(today, -1)) return 'Yesterday';

  const date = calendarDateToLocalDate(dueDate);
  if (date === null) return dueDate;
  return dueDate.slice(0, 4) === today.slice(0, 4) ? shortDate.format(date) : shortDateWithYear.format(date);
}

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

export function formatTimestamp(timestamp: IsoTimestamp): string {
  return dateTime.format(new Date(timestamp));
}

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** One spoken sentence for a task row, e.g. "Pay rent. Overdue, was due Yesterday. High priority." */
export function describeTaskForAccessibility(task: Task, today: CalendarDate): string {
  const parts = [task.title];
  if (task.status === 'completed') parts.push('Completed');
  else if (task.dueDate === null) parts.push('No due date');
  else if (getTaskTimeframe(task, today) === 'overdue') parts.push(`Overdue, was due ${formatDueDate(task.dueDate, today)}`);
  else parts.push(`Due ${formatDueDate(task.dueDate, today)}`);
  parts.push(`${PRIORITY_LABELS[task.priority]} priority`);
  return `${parts.join('. ')}.`;
}
