import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, radii, screenGutter, sizes, spacing } from '@/shared/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

export type ToastTone = 'success' | 'error';

interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);
const VISIBLE_MS = 3200;
const FADE_MS = 180;

/**
 * Transient feedback for completed mutations ("Task added", "Couldn't save"). Messages are also
 * announced to screen readers, since a toast may appear away from the user's focus.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message, tone = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (toast === null) return undefined;
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setToast((current) => (current?.id === toast.id ? null : current));
      });
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.overlay, { top: insets.top + spacing.sm }]}>
          <Animated.View accessibilityRole="alert" style={[styles.toast, { opacity }]}>
            <Icon
              name={toast.tone === 'error' ? 'alert-circle' : 'checkmark-circle'}
              size={sizes.iconMd}
              color={toast.tone === 'error' ? colors.dangerSoft : colors.successSoft}
            />
            <AppText variant="callout" tone="onAccent" style={styles.text}>
              {toast.message}
            </AppText>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (show === null) throw new Error('useToast must be used within a ToastProvider.');
  return show;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: screenGutter,
    right: screenGutter,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.textPrimary,
    ...elevation.raised,
  },
  text: {
    flexShrink: 1,
  },
});
