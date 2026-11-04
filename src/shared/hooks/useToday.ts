import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toCalendarDate, type CalendarDate } from '@/shared/lib/calendarDate';

function msUntilNextMidnight(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/**
 * The current local calendar day. Updates at midnight and when the app returns to the foreground,
 * so "today" and "overdue" stay correct if the app is left open overnight.
 */
export function useToday(): CalendarDate {
  const [today, setToday] = useState(() => toCalendarDate(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Re-armed on every refresh: on Android, timers don't advance while the device sleeps, so a
    // midnight timer set before sleeping would fire late.
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextMidnight(new Date()) + 1000);
    };
    const refresh = () => {
      setToday(toCalendarDate(new Date()));
      schedule();
    };

    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return today;
}
