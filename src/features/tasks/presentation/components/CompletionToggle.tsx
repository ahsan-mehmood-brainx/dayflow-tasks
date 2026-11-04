import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, sizes } from '@/shared/theme/tokens';
import { Icon } from '@/shared/ui/Icon';

interface CompletionToggleProps {
  readonly title: string;
  readonly completed: boolean;
  /** A completion change is in flight; the control is disabled until the repository confirms. */
  readonly pending: boolean;
  readonly onToggle: () => void;
}

export function CompletionToggle({ title, completed, pending, onToggle }: CompletionToggleProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityHint={completed ? 'Marks the task as not done' : 'Marks the task as done'}
      accessibilityState={{ checked: completed, disabled: pending, busy: pending }}
      disabled={pending}
      onPress={onToggle}
      style={styles.hitArea}
    >
      {pending ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <View style={[styles.circle, completed && styles.circleCompleted]}>
          {completed ? <Icon name="checkmark" size={16} color={colors.textOnAccent} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: sizes.checkbox,
    height: sizes.checkbox,
    borderRadius: sizes.checkbox / 2,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
