import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors, sizes } from '@/shared/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
  readonly style?: StyleProp<TextStyle>;
}

/** Decorative icon (Ionicons). Meaning is always carried by an adjacent label, so it is hidden from screen readers. */
export function Icon({ name, size = sizes.iconMd, color = colors.textSecondary, style }: IconProps) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
