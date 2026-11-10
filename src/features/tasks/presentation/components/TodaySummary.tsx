import { StyleSheet, View } from 'react-native';

import { colors, elevation, radii, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';

import type { TaskOverview } from '../../domain/taskQueries';

/**
 * A single, honest progress measure for the day: tasks completed today against those still due
 * today or overdue. No charts or vanity metrics.
 */
export function TodaySummary({ overview }: { readonly overview: TaskOverview }) {
  const { completedToday, overdue, dueToday } = overview.counts;
  const remaining = overview.focus.length;
  const total = completedToday + remaining;
  const progress = total === 0 ? 0 : completedToday / total;

  const details = [
    overdue > 0 ? `${overdue} overdue` : null,
    dueToday > 0 ? `${dueToday} due today` : null,
    overview.upcoming.length > 0 ? `${overview.upcoming.length} upcoming` : null,
  ].filter((part) => part !== null);

  return (
    <View style={styles.card}>
      <AppText variant="caption" tone="tertiary">
        TODAY’S PROGRESS
      </AppText>
      {total === 0 ? (
        <AppText variant="title">Nothing due today</AppText>
      ) : (
        <AppText variant="title">
          {completedToday} of {total} done
        </AppText>
      )}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Today’s progress"
        accessibilityValue={{ min: 0, max: Math.max(total, 1), now: completedToday }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <AppText variant="footnote" tone={overdue > 0 ? 'danger' : 'secondary'}>
        {details.length > 0 ? details.join(' · ') : 'Enjoy the calm, or plan something ahead.'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
