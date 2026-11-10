import { StyleSheet, View } from 'react-native';

import { colors } from '@/shared/theme/tokens';
import { EmptyState, LoadingView } from '@/shared/ui/StateViews';

import { useTaskLoader } from '../hooks/useTaskLoader';

interface MissingTaskStateProps {
  readonly actionLabel: string;
  readonly onAction: () => void;
}

/**
 * Shown when a screen's task isn't in the store. It distinguishes "still loading", "loading failed"
 * (with retry) and "really gone", so a network error is never reported as a deleted task.
 */
export function MissingTaskState({ actionLabel, onAction }: MissingTaskStateProps) {
  const { load, reload, isInitialLoading } = useTaskLoader();

  return (
    <View style={styles.screen}>
      {isInitialLoading ? (
        <LoadingView label="Loading task…" />
      ) : load.status === 'failed' ? (
        <EmptyState tone="error" icon="cloud-offline-outline" title="Couldn’t load this task" message={load.error.message} actionLabel="Try again" onAction={reload} />
      ) : (
        <EmptyState icon="search" title="Task not found" message="It may have been deleted. Head back to see your current tasks." actionLabel={actionLabel} onAction={onAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
