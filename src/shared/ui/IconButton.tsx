import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, sizes } from '@/shared/theme/tokens';

import { Icon, type IconName } from './Icon';

interface IconButtonProps {
  readonly icon: IconName;
  /** Required: an icon alone has no accessible name. */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly color?: string;
}

export function IconButton({ icon, accessibilityLabel, onPress, color = colors.textSecondary }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Icon name={icon} size={sizes.iconLg} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
