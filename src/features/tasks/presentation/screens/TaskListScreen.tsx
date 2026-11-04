import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useCallback } from 'react';
import { RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TaskStackScreenProps } from '@/core/navigation/types';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { useToday } from '@/shared/hooks/useToday';
import { colors, radii, screenGutter, sizes, spacing, typography } from '@/shared/theme/tokens';
import { AppText } from '@/shared/ui/AppText';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { IconButton } from '@/shared/ui/IconButton';
import { SegmentedControl, type SegmentOption } from '@/shared/ui/SegmentedControl';
import { EmptyState, LoadingView } from '@/shared/ui/StateViews';

import type { Task, TaskId } from '../../domain/task';
import type { TaskStatusFilter } from '../../domain/taskQueries';
import { selectTaskQuery, selectVisibleTasks } from '../../state/tasksSelectors';
import { taskSearchChanged, taskStatusFilterChanged } from '../../state/tasksSlice';
import { ConnectedTaskRow } from '../components/ConnectedTaskRow';
import { useTaskActions } from '../hooks/useTaskActions';
import { useTaskLoader } from '../hooks/useTaskLoader';

const FILTER_OPTIONS: readonly SegmentOption<TaskStatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function TaskListScreen({ navigation }: TaskStackScreenProps<'TaskList'>) {
  const dispatch = useAppDispatch();
  const today = useToday();
  const tasks = useAppSelector(selectVisibleTasks);
  const query = useAppSelector(selectTaskQuery);
  const { load, hasTasks, reload, isRefreshing, isInitialLoading } = useTaskLoader();
  const { toggleCompletion } = useTaskActions();

  const openTask = useCallback((taskId: TaskId) => navigation.navigate('TaskDetails', { taskId }), [navigation]);
  const createTask = useCallback(() => navigation.navigate('TaskForm', { mode: 'create' }), [navigation]);
  const clearQuery = useCallback(() => {
    dispatch(taskSearchChanged(''));
    dispatch(taskStatusFilterChanged('all'));
  }, [dispatch]);

  const renderItem = useCallback<ListRenderItem<Task>>(
    ({ item }) => <ConnectedTaskRow task={item} today={today} onToggle={toggleCompletion} onOpen={openTask} />,
    [today, toggleCompletion, openTask],
  );

  const renderEmpty = () => {
    if (!hasTasks) {
      return (
        <EmptyState
          icon="checkmark-circle-outline"
          title="No tasks yet"
          message="Capture what’s on your mind. You can add details and a due date later."
          actionLabel="Add a task"
          onAction={createTask}
        />
      );
    }
    if (query.search.trim() !== '') {
      return <EmptyState icon="search" title="No matching tasks" message={`Nothing matches “${query.search.trim()}”.`} actionLabel="Clear filters" onAction={clearQuery} />;
    }
    return query.status === 'completed' ? (
      <EmptyState icon="checkmark-circle-outline" title="Nothing completed yet" message="Tasks you finish will appear here." />
    ) : (
      <EmptyState icon="sunny-outline" title="All done" message="You have no active tasks. Enjoy the breathing room." />
    );
  };

  const renderBody = () => {
    if (isInitialLoading) return <LoadingView label="Loading tasks…" />;
    if (load.status === 'failed' && !hasTasks) {
      return <EmptyState tone="error" icon="cloud-offline-outline" title="Couldn’t load tasks" message={load.error.message} actionLabel="Try again" onAction={reload} />;
    }
    return (
      <FlashList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={renderEmpty()}
        ListHeaderComponent={load.status === 'failed' ? <View style={styles.banner}><Banner tone="error" message={load.error.message} actionLabel="Retry" onAction={reload} /></View> : null}
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={colors.accent} />}
      />
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="largeTitle" accessibilityRole="header">
            Tasks
          </AppText>
          <Button label="Add task" icon="add" size="compact" onPress={createTask} />
        </View>
        <SearchField value={query.search} onChange={(text) => dispatch(taskSearchChanged(text))} />
        <SegmentedControl
          accessibilityLabel="Filter tasks"
          options={FILTER_OPTIONS}
          value={query.status}
          onChange={(status) => dispatch(taskStatusFilterChanged(status))}
        />
      </View>
      <View style={styles.list}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const keyExtractor = (task: Task) => task.id;


function SearchField({ value, onChange }: { readonly value: string; readonly onChange: (text: string) => void }) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={sizes.iconMd} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search tasks"
        placeholderTextColor={colors.textPlaceholder}
        accessibilityLabel="Search tasks"
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        selectionColor={colors.accent}
        style={styles.searchInput}
      />
      {value !== '' ? <IconButton icon="close-circle" accessibilityLabel="Clear search" onPress={() => onChange('')} color={colors.textTertiary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    gap: spacing.md,
    paddingHorizontal: screenGutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.buttonHeightCompact + 4,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  list: {
    flex: 1,
    borderTopWidth: sizes.hairline,
    borderTopColor: colors.separator,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  banner: {
    paddingHorizontal: screenGutter,
    paddingTop: spacing.md,
  },
});
