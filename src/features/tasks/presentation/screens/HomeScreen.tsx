import { useCallback, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MainTabScreenProps } from '@/core/navigation/types';
import { useAppSelector } from '@/core/store/hooks';
import { selectCurrentUser } from '@/features/auth/state/authSelectors';
import { useToday } from '@/shared/hooks/useToday';
import { calendarDateToLocalDate } from '@/shared/lib/calendarDate';
import { colors, screenGutter, spacing } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { EmptyState, LoadingView } from '@/shared/ui/StateViews';
import { SectionHeader } from '@/shared/ui/SectionHeader';

import type { Task, TaskId } from '../../domain/task';
import { selectTaskOverview } from '../../state/tasksSelectors';
import { ConnectedTaskRow } from '../components/ConnectedTaskRow';
import { TodaySummary } from '../components/TodaySummary';
import { formatLongDate, greetingFor } from '../formatting';
import { useTaskActions } from '../hooks/useTaskActions';
import { useTaskLoader } from '../hooks/useTaskLoader';

const UPCOMING_LIMIT = 5;

export function HomeScreen({ navigation }: MainTabScreenProps<'Home'>) {
  const today = useToday();
  const user = useAppSelector(selectCurrentUser);
  const overview = useAppSelector((state) => selectTaskOverview(state, today));
  const { load, hasTasks, reload, isRefreshing, isInitialLoading } = useTaskLoader();
  const { toggleCompletion } = useTaskActions();

  const now = useMemo(() => calendarDateToLocalDate(today) ?? new Date(), [today]);
  const firstName = user?.displayName.split(' ')[0];

  const openTask = useCallback(
    (taskId: TaskId) => navigation.navigate('Tasks', { screen: 'TaskDetails', params: { taskId }, initial: false }),
    [navigation],
  );
  const createTask = useCallback(
    () => navigation.navigate('Tasks', { screen: 'TaskForm', params: { mode: 'create' }, initial: false }),
    [navigation],
  );
  // `pop` returns to the existing list instead of stacking another one on top of open details.
  const showAllTasks = useCallback(() => navigation.navigate('Tasks', { screen: 'TaskList', pop: true }), [navigation]);

  const renderContent = () => {
    if (isInitialLoading) return <LoadingView label="Loading your day…" />;
    if (load.status === 'failed' && !hasTasks) {
      return (
        <EmptyState tone="error" icon="cloud-offline-outline" title="Couldn’t load your tasks" message={load.error.message} actionLabel="Try again" onAction={reload} />
      );
    }
    if (!hasTasks) {
      return (
        <EmptyState
          icon="sunny-outline"
          title="A clear day ahead"
          message="Add your first task and DayFlow will keep track of what’s due."
          actionLabel="Add your first task"
          onAction={createTask}
        />
      );
    }

    const upcoming = overview.upcoming.slice(0, UPCOMING_LIMIT);
    return (
      <>
        {load.status === 'failed' ? <Banner tone="error" message={load.error.message} actionLabel="Retry" onAction={reload} /> : null}
        <TodaySummary overview={overview} />

        <View style={styles.section}>
          <SectionHeader title="Today" count={overview.focus.length} actionLabel="See all" onAction={showAllTasks} actionAccessibilityLabel="See all tasks" />
          {overview.focus.length > 0 ? (
            <TaskGroup tasks={overview.focus} today={today} onToggle={toggleCompletion} onOpen={openTask} />
          ) : (
            <AppText variant="callout" tone="secondary">
              You’re all caught up for today.
            </AppText>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Upcoming" count={overview.upcoming.length} />
          {upcoming.length > 0 ? (
            <TaskGroup tasks={upcoming} today={today} onToggle={toggleCompletion} onOpen={openTask} />
          ) : (
            <AppText variant="callout" tone="secondary">
              Nothing scheduled after today.
            </AppText>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={hasTasks ? <RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={colors.accent} /> : undefined}
      >
        <View style={styles.header}>
          <AppText variant="caption" tone="tertiary">
            {formatLongDate(now).toUpperCase()}
          </AppText>
          <AppText variant="largeTitle" accessibilityRole="header">
            {greetingFor(new Date())}
            {firstName ? `, ${firstName}` : ''}
          </AppText>
        </View>

        <Button label="New task" icon="add" onPress={createTask} accessibilityHint="Opens the new task form" />

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TaskGroupProps {
  readonly tasks: readonly Task[];
  readonly today: string;
  readonly onToggle: (task: Task) => void;
  readonly onOpen: (id: TaskId) => void;
}

/** A short, non-virtualised group of rows; the dashboard shows at most a handful per section. */
function TaskGroup({ tasks, today, onToggle, onOpen }: TaskGroupProps) {
  return (
    <View style={styles.group}>
      {tasks.map((task) => (
        <ConnectedTaskRow key={task.id} task={task} today={today} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.xxl,
    paddingHorizontal: screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  group: {
    marginHorizontal: -screenGutter,
  },
});
