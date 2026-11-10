import { useEffect, useState, type RefObject } from 'react';
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent, type ViewInstance } from 'react-native';

/**
 * How far the keyboard overlaps the bottom of `ref`'s view, measured in window coordinates when the
 * keyboard appears.
 *
 * `KeyboardAvoidingView` needs a hand-tuned `keyboardVerticalOffset` that differs between a full
 * screen, a header and an iOS page-sheet modal. Measuring the real position avoids guessing. If the
 * OS has already resized the window (Android `adjustResize`), the overlap is simply 0.
 */
export function useKeyboardOverlap(ref: RefObject<ViewInstance | null>): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const animate = (event: KeyboardEvent | null) => {
      if (event && event.duration > 0) {
        LayoutAnimation.configureNext({ duration: event.duration, update: { duration: event.duration, type: LayoutAnimation.Types.keyboard } });
      }
    };
    const onShow = (event: KeyboardEvent) => {
      ref.current?.measureInWindow((_x, y, _width, height) => {
        animate(event);
        setOverlap(Math.max(0, y + height - event.endCoordinates.screenY));
      });
    };
    const onHide = (event: KeyboardEvent | null) => {
      animate(event);
      setOverlap(0);
    };

    const subscriptions = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', onShow),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [ref]);

  return overlap;
}
