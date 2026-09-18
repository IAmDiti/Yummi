import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * `KeyboardAvoidingView`'s `height`/`padding` behaviors don't reliably resize
 * for this app's layouts on Android — a fixed-height input row pinned below a
 * flex `ScrollView` can still end up covered by the keyboard. Tracking the
 * keyboard's own height and adding it as bottom padding sidesteps that
 * unreliability entirely. iOS's `padding` behavior already works correctly,
 * so this hook always returns 0 there and callers should keep using
 * `KeyboardAvoidingView` for iOS.
 */
export function useAndroidKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
