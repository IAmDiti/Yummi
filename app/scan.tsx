import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Body } from '../src/components/Heading';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { detectIngredients } from '../src/services/ai/vision';
import { AiError } from '../src/services/types';
import { useSession } from '../src/store/session';
import { colors, radius, spacing } from '../src/theme';

type Phase = 'camera' | 'preview' | 'analyzing' | 'error';

export default function Scan() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const setIngredients = useSession((s) => s.setIngredients);

  const goManual = useCallback(() => router.replace('/ingredients'), [router]);

  // --- permission gates -------------------------------------------------
  if (!permission) {
    return (
      <Screen>
        <LoadingState message="Getting the camera ready…" />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <ErrorState
          title="Camera access needed"
          message={
            permission.canAskAgain
              ? 'Yummi needs the camera to look inside your fridge.'
              : 'Camera access is off. Turn it on for Yummi in your phone settings, or add ingredients by hand.'
          }
          actions={[
            permission.canAskAgain
              ? { label: 'Allow camera', onPress: requestPermission }
              : { label: 'Open settings', onPress: () => Linking.openSettings() },
            { label: 'Add ingredients manually', onPress: goManual, variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  // --- capture --------------------------------------------------------
  const takePhoto = async () => {
    try {
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!shot?.uri) throw new Error('no shot');
      setPhotoUri(shot.uri);
      setPhase('preview');

      // Resize + compress for a smaller upload.
      const ctx = ImageManipulator.manipulate(shot.uri);
      ctx.resize({ width: 1024 });
      const rendered = await ctx.renderAsync();
      const out = await rendered.saveAsync({
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });
      setPhotoB64(out.base64 ?? null);
    } catch {
      setErrorMsg("Couldn't take the photo. Try again.");
      setPhase('error');
    }
  };

  const analyze = async () => {
    if (!photoB64) {
      setErrorMsg('Still preparing the photo — try again in a second.');
      setPhase('error');
      return;
    }
    setPhase('analyzing');
    try {
      const { ingredients, warning } = await detectIngredients(photoB64);
      if (ingredients.length === 0) {
        setErrorMsg(
          warning ??
            "I couldn't identify enough ingredients. Try taking a photo with the fridge more open and the food visible.",
        );
        setPhase('error');
        return;
      }
      setIngredients(ingredients);
      router.replace('/ingredients');
    } catch (err) {
      setErrorMsg(
        err instanceof AiError
          ? err.message
          : 'Something went wrong reading your fridge. Try again.',
      );
      setPhase('error');
    }
  };

  const retake = () => {
    setPhotoUri(null);
    setPhotoB64(null);
    setErrorMsg('');
    setPhase('camera');
  };

  // --- render --------------------------------------------------------
  if (phase === 'analyzing') {
    return (
      <Screen>
        <LoadingState message="Looking in your fridge…" />
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[
            { label: 'Retake photo', onPress: retake },
            { label: 'Add ingredients manually', onPress: goManual, variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  if (phase === 'preview' && photoUri) {
    return (
      <Screen>
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        </View>
        <Body muted style={styles.hint}>
          Can you see most of the food? If not, retake with the door wide open.
        </Body>
        <View style={styles.previewActions}>
          <Button label="Use this photo" onPress={analyze} />
          <Button label="Retake" variant="secondary" onPress={retake} />
        </View>
      </Screen>
    );
  }

  // phase === 'camera'
  return (
    <Screen bleed>
      <View style={styles.cameraWrap}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.cameraOverlay}>
          <Body style={styles.overlayText}>Open the fridge door and fit the shelves in frame</Body>
        </View>
      </View>
      <View style={styles.shutterBar}>
        <Pressable
          onPress={takePhoto}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { flex: 1, overflow: 'hidden' },
  cameraOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayText: { color: '#fff', textAlign: 'center', fontSize: 15 },
  shutterBar: {
    height: 130,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterPressed: { opacity: 0.6 },
  shutterInner: { width: 58, height: 58, borderRadius: radius.pill, backgroundColor: '#fff' },
  previewWrap: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  preview: { flex: 1 },
  hint: { fontSize: 15, textAlign: 'center', marginBottom: spacing.md },
  previewActions: { gap: spacing.sm },
  previewText: {},
});
