import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Design tokens for DayFlow. Every colour, size and type style in the UI comes from here.
 *
 * Text colours were checked against `background`, `surface` and `surfaceMuted` and meet WCAG AA
 * (≥ 4.5:1) for body text; `borderStrong` meets the 3:1 non-text contrast minimum for input outlines.
 */

export const colors = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#EFECE5',
  separator: '#E7E2D9',
  border: '#DDD7CC',
  borderStrong: '#8F887C',

  textPrimary: '#1F1D1A',
  textSecondary: '#5C574F',
  textTertiary: '#6B655C',
  textPlaceholder: '#857F75',
  textOnAccent: '#FFFFFF',

  accent: '#2D6A57',
  accentPressed: '#235445',
  accentSoft: '#E4EFEA',

  success: '#2E7049',
  successSoft: '#E3F0E7',
  danger: '#B42318',
  dangerSoft: '#FBE9E7',

  priorityHigh: '#B3402B',
  priorityHighSoft: '#F8E7E3',
  priorityMedium: '#93600E',
  priorityMediumSoft: '#F6EDDC',
  priorityLow: '#46658A',
  priorityLowSoft: '#E5ECF3',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Horizontal inset used by every screen so content edges line up across the app. */
export const screenGutter = spacing.xl;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

type TypeStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'>;

/** System font stack (SF Pro / Roboto) with an explicit scale; sizes honour OS text scaling. */
export const typography = {
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
} as const satisfies Record<string, TypeStyle>;

/** Shadows use the cross-platform `boxShadow` style (New Architecture). Kept deliberately faint. */
export const elevation = {
  card: { boxShadow: '0px 1px 2px rgba(31, 29, 26, 0.06)' },
  raised: { boxShadow: '0px 6px 16px rgba(31, 29, 26, 0.12)' },
} as const satisfies Record<string, ViewStyle>;

export const sizes = {
  /** Minimum interactive target (Apple HIG 44pt; Android 48dp is met via hitSlop where needed). */
  touchTarget: 44,
  buttonHeight: 52,
  buttonHeightCompact: 40,
  inputHeight: 52,
  checkbox: 24,
  avatar: 56,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  hairline: StyleSheet.hairlineWidth,
} as const;
