import { addDays, toCalendarDate } from '@/shared/lib/calendarDate';

import type { ActiveTask, CompletedTask, Task, TaskPriority } from '../domain/task';

const HOUR_MS = 60 * 60 * 1000;

interface SeedFields {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  /** Days from today; null for an unscheduled task. */
  readonly dueInDays: number | null;
  readonly createdHoursAgo: number;
}

/**
 * Demo tasks positioned relative to `now`, so the app always opens with a realistic mix of overdue,
 * due-today, upcoming, unscheduled and completed work.
 */
export function createSeedTasks(now: Date): Task[] {
  const today = toCalendarDate(now);
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

  const active = ({ id, title, description = '', priority, dueInDays, createdHoursAgo }: SeedFields): ActiveTask => ({
    id,
    title,
    description,
    priority,
    dueDate: dueInDays === null ? null : addDays(today, dueInDays),
    status: 'active',
    completedAt: null,
    createdAt: hoursAgo(createdHoursAgo),
    updatedAt: hoursAgo(createdHoursAgo),
  });

  const completed = (fields: SeedFields, completedHoursAgo: number): CompletedTask => ({
    ...active(fields),
    status: 'completed',
    completedAt: hoursAgo(completedHoursAgo),
    updatedAt: hoursAgo(completedHoursAgo),
  });

  return [
    active({
      id: 'task-1',
      title: 'Send invoice to Northwind',
      description: 'Include the October hours breakdown and the revised day rate.',
      priority: 'high',
      dueInDays: -2,
      createdHoursAgo: 120,
    }),
    active({
      id: 'task-2',
      title: 'Review Q4 roadmap draft',
      description: 'Leave comments on scope and sequencing before the planning sync.',
      priority: 'high',
      dueInDays: 0,
      createdHoursAgo: 72,
    }),
    active({
      id: 'task-3',
      title: 'Book dentist appointment',
      description: 'Ask for an early-morning slot.',
      priority: 'medium',
      dueInDays: 0,
      createdHoursAgo: 30,
    }),
    active({ id: 'task-4', title: 'Call the landlord about the heating', priority: 'medium', dueInDays: 1, createdHoursAgo: 20 }),
    active({
      id: 'task-5',
      title: 'Prepare slides for design critique',
      description: 'Cover the onboarding flow and the new empty states.',
      priority: 'medium',
      dueInDays: 2,
      createdHoursAgo: 50,
    }),
    active({
      id: 'task-6',
      title: 'Renew car insurance',
      description: 'Compare at least two quotes before renewing.',
      priority: 'high',
      dueInDays: 4,
      createdHoursAgo: 96,
    }),
    active({
      id: 'task-7',
      title: 'Plan weekend hike route',
      description: 'Check the forecast and trail conditions.',
      priority: 'low',
      dueInDays: 6,
      createdHoursAgo: 10,
    }),
    active({
      id: 'task-8',
      title: 'Read chapter 4 of Designing Data-Intensive Applications',
      priority: 'low',
      dueInDays: null,
      createdHoursAgo: 200,
    }),
    completed({ id: 'task-9', title: 'Update project README', priority: 'medium', dueInDays: 0, createdHoursAgo: 48 }, 3),
    completed({ id: 'task-10', title: 'Water the plants', priority: 'low', dueInDays: -1, createdHoursAgo: 80 }, 26),
    completed(
      {
        id: 'task-11',
        title: 'Submit expense report',
        description: 'Receipts are in the shared drive.',
        priority: 'high',
        dueInDays: -3,
        createdHoursAgo: 150,
      },
      70,
    ),
  ];
}
