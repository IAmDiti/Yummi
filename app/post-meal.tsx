import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../src/components/Button';
import { Body, Heading } from '../src/components/Heading';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { createPost } from '../src/services/social/posts';
import { useAuth } from '../src/store/auth';
import { useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

type Phase = 'camera' | 'preview' | 'locating' | 'compose' | 'posting' | 'error';

export default function PostMeal() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const cooking = useSession((s) => s.cooking);
  const endCooking = useSession((s) => s.endCooking);
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.userId);
  const profile = useAuth((s) => s.profile);

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryLabel, setRetryLabel] = useState('Try again');
  const [retry, setRetry] = useState<() => void>(() => () => {});

  const goHomeWithoutPosting = () => {
    endCooking();
    router.replace('/');
  };

  const fail = (message: string, retryFn: () => void, label = 'Try again') => {
    setErrorMsg(message);
    setRetry(() => retryFn);
    setRetryLabel(label);
    setPhase('error');
  };

  // Acquire location once the user has confirmed a photo.
  useEffect(() => {
    if (phase !== 'locating') return;
    let cancelled = false;
    (async () => {
      try {
        let perm = locationPermission;
        if (!perm?.granted) perm = await requestLocationPermission();
        if (cancelled) return;
        if (!perm.granted) {
          if (perm.canAskAgain) {
            fail(
              'Yummi needs your location to post where you cooked.',
              () => setPhase('locating'),
              'Allow location',
            );
          } else {
            fail(
              'Location access is off. Turn it on for Yummi in your phone settings.',
              () => Linking.openSettings(),
              'Open settings',
            );
          }
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setPhase('compose');
      } catch {
        if (!cancelled) {
          fail("Couldn't get your location. Try again, or skip posting.", () => setPhase('locating'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Guard: nothing to post -> go home. (Mirrors app/cook.tsx's own guard.)
  useEffect(() => {
    if (!cooking) router.replace('/');
  }, [cooking, router]);
  if (!cooking) return <Screen />;

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message="One moment…" />
      </Screen>
    );
  }

  if (status !== 'signedIn') {
    return (
      <Screen>
        <ErrorState
          title="Sign in to share your dish"
          message="Create a free account to post your photo and see it on the map."
          actions={[
            { label: 'Sign in', onPress: () => router.push('/login') },
            { label: 'Skip, don’t post publicly', onPress: goHomeWithoutPosting, variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  const takePhoto = async () => {
    try {
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!shot?.uri) throw new Error('no shot');

      const ctx = ImageManipulator.manipulate(shot.uri);
      ctx.resize({ width: 1024 });
      const rendered = await ctx.renderAsync();
      const out = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG });

      setPhotoUri(out.uri);
      setPhase('preview');
    } catch {
      fail("Couldn't take the photo. Try again.", () => setPhase('camera'));
    }
  };

  const submitPost = async () => {
    if (!photoUri || !coords || !userId) return;
    setPhase('posting');
    try {
      await createPost({
        userId,
        authorName: profile?.displayName?.trim() || 'A Yummi cook',
        authorAvatarUrl: profile?.avatarUrl ?? null,
        recipeName: cooking.recommendation.name,
        difficulty: cooking.recommendation.difficulty,
        caption: caption.trim() || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        photoUri,
      });
      endCooking();
      router.replace('/map');
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Could not post your photo. Try again.', submitPost);
    }
  };

  // --- camera permission gate ------------------------------------------
  if (phase === 'camera') {
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
                ? 'Yummi needs the camera to photograph your dish.'
                : 'Camera access is off. Turn it on for Yummi in your phone settings.'
            }
            actions={[
              permission.canAskAgain
                ? { label: 'Allow camera', onPress: requestPermission }
                : { label: 'Open settings', onPress: () => Linking.openSettings() },
              { label: 'Skip, don’t post publicly', onPress: goHomeWithoutPosting, variant: 'secondary' },
            ]}
          />
        </Screen>
      );
    }

    return (
      <Screen bleed>
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={styles.cameraOverlay}>
            <Body style={styles.overlayText}>Show off your {cooking.recommendation.name}</Body>
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

  if (phase === 'preview' && photoUri) {
    return (
      <Screen>
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        </View>
        <View style={styles.previewActions}>
          <Button label="Use this photo" onPress={() => setPhase('locating')} />
          <Button label="Retake" variant="secondary" onPress={() => setPhase('camera')} />
        </View>
      </Screen>
    );
  }

  if (phase === 'locating') {
    return (
      <Screen>
        <LoadingState message="Finding your location…" />
      </Screen>
    );
  }

  if (phase === 'posting') {
    return (
      <Screen>
        <LoadingState message="Posting your photo…" />
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[
            { label: retryLabel, onPress: retry },
            { label: 'Skip, don’t post publicly', onPress: goHomeWithoutPosting, variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  // phase === 'compose'
  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.composeScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {photoUri && (
            <View style={styles.previewWrapSmall}>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            </View>
          )}

          <View style={styles.recipeChip}>
            <Text style={styles.recipeChipText}>{cooking.recommendation.name}</Text>
          </View>

          <Heading level="heading" style={styles.captionLabel}>
            Add a caption
          </Heading>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="How did it turn out?"
            placeholderTextColor={colors.textMuted}
            style={styles.captionInput}
            multiline
          />

          <Button label="Post" onPress={submitPost} />
          <Button label="Skip, don’t post publicly" variant="ghost" onPress={goHomeWithoutPosting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  composeScroll: { flexGrow: 1, gap: spacing.md, paddingBottom: spacing.lg },
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
  shutterBar: { height: 130, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
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
  previewWrapSmall: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  preview: { flex: 1, width: '100%', height: '100%' },
  previewActions: { gap: spacing.sm },
  recipeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recipeChipText: { fontSize: font.small, fontWeight: '700', color: colors.text },
  captionLabel: { marginTop: spacing.sm },
  captionInput: {
    minHeight: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    fontSize: font.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
