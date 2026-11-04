import { Pressable } from 'react-native';

import { spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';

/** Text action for native stack headers (e.g. "Cancel"). */
export function HeaderTextButton({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={spacing.md} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      <AppText variant="body" tone="accent">
        {label}
      </AppText>
    </Pressable>
  );
}
