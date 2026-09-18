import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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
import { useAndroidKeyboardHeight } from '../src/hooks/useAndroidKeyboardHeight';
import { useT } from '../src/i18n';
import { createPost } from '../src/services/social/posts';
import { useAuth } from '../src/store/auth';
import { useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

type Phase = 'camera' | 'preview' | 'compose' | 'posting' | 'error';

export default function PostMeal() {
  const router = useRouter();
  const t = useT();
  const androidKbHeight = useAndroidKeyboardHeight();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const cooking = useSession((s) => s.cooking);
  const endCooking = useSession((s) => s.endCooking);
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.userId);
  const profile = useAuth((s) => s.profile);

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [retryLabel, setRetryLabel] = useState('');
  const [retry, setRetry] = useState<() => void>(() => () => {});

  const goHomeWithoutPosting = () => {
    endCooking();
    router.replace('/');
  };

  const fail = (message: string, retryFn: () => void, label?: string) => {
    setErrorMsg(message);
    setRetry(() => retryFn);
    setRetryLabel(label ?? t('common.tryAgain'));
    setPhase('error');
  };

  // Guard: nothing to post -> go home. (Mirrors app/cook.tsx's own guard.)
  useEffect(() => {
    if (!cooking) router.replace('/');
  }, [cooking, router]);
  if (!cooking) return <Screen />;

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message={t('postMeal.oneMoment')} />
      </Screen>
    );
  }

  if (status !== 'signedIn') {
    return (
      <Screen>
        <ErrorState
          title={t('postMeal.signInTitle')}
          message={t('postMeal.signInBody')}
          actions={[
            { label: t('postMeal.signIn'), onPress: () => router.push('/login') },
            { label: t('common.skipDontPost'), onPress: goHomeWithoutPosting, variant: 'secondary' },
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
      fail(t('postMeal.photoFailed'), () => setPhase('camera'));
    }
  };

  const submitPost = async () => {
    if (!photoUri || !userId) return;
    setPhase('posting');
    try {
      await createPost({
        userId,
        authorName: profile?.hideUsername
          ? '***'
          : profile?.displayName?.trim() || t('postMeal.anonymousAuthor'),
        authorAvatarUrl: profile?.avatarUrl ?? null,
        recipeName: cooking.recommendation.name,
        difficulty: cooking.recommendation.difficulty,
        caption: caption.trim() || null,
        photoUri,
      });
      endCooking();
      router.replace('/discover');
    } catch (err) {
      fail(err instanceof Error ? err.message : t('postMeal.postFailed'), submitPost);
    }
  };

  // --- camera permission gate ------------------------------------------
  if (phase === 'camera') {
    if (!permission) {
      return (
        <Screen>
          <LoadingState message={t('common.gettingCameraReady')} />
        </Screen>
      );
    }
    if (!permission.granted) {
      return (
        <Screen>
          <ErrorState
            title={t('postMeal.cameraAccessTitle')}
            message={permission.canAskAgain ? t('postMeal.cameraAccessBody') : t('postMeal.cameraAccessOff')}
            actions={[
              permission.canAskAgain
                ? { label: t('common.allowCamera'), onPress: requestPermission }
                : { label: t('common.openSettings'), onPress: () => Linking.openSettings() },
              { label: t('common.skipDontPost'), onPress: goHomeWithoutPosting, variant: 'secondary' },
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
            <Body style={styles.overlayText}>
              {t('postMeal.showOff', { name: cooking.recommendation.name })}
            </Body>
          </View>
        </View>
        <View style={styles.shutterBar}>
          <Pressable
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel={t('common.takePhoto')}
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
          <Button label={t('common.usePhoto')} onPress={() => setPhase('compose')} />
          <Button label={t('common.retake')} variant="secondary" onPress={() => setPhase('camera')} />
        </View>
      </Screen>
    );
  }

  if (phase === 'posting') {
    return (
      <Screen>
        <LoadingState message={t('postMeal.posting')} />
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
            { label: t('common.skipDontPost'), onPress: goHomeWithoutPosting, variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  // phase === 'compose'
  return (
    <Screen>
      <KeyboardAvoidingView
        style={[styles.flex, androidKbHeight ? { paddingBottom: androidKbHeight } : null]}
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
            {t('postMeal.addCaption')}
          </Heading>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={t('postMeal.captionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.captionInput}
            multiline
          />

          <Button label={t('postMeal.post')} onPress={submitPost} />
          <Button label={t('common.skipDontPost')} variant="ghost" onPress={goHomeWithoutPosting} />
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
