import { useRouter } from 'expo-router';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '../src/components/Button';
import { ErrorState } from '../src/components/ErrorState';
import { Body } from '../src/components/Heading';
import { LoadingState } from '../src/components/LoadingState';
import { RecommendationCard } from '../src/components/RecommendationCard';
import { Screen } from '../src/components/Screen';
import { getRecommendationBatch } from '../src/services/ai/recommendations';
import { AiError } from '../src/services/types';
import type { Difficulty, Recommendation } from '../src/services/types';
import { useAuth } from '../src/store/auth';
import { useSession } from '../src/store/session';
import { colors, font, radius, spacing } from '../src/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_OUT_DISTANCE = SCREEN_WIDTH * 1.5;

// Stable reference so the zustand selector below never returns a fresh array
// on every read — a new [] on each call breaks useSyncExternalStore's
// Object.is check and causes an infinite render loop.
const EMPTY_DIETARY_TAGS: never[] = [];

const DIFFICULTY_FILTERS: { label: string; value: Difficulty | null }[] = [
  { label: 'All', value: null },
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
  { label: 'Extra hard', value: 'extra_hard' },
];

export default function Recommend() {
  const router = useRouter();
  const ingredients = useSession((s) => s.ingredients);
  const queue = useSession((s) => s.recommendationQueue);
  const difficultyFilter = useSession((s) => s.difficultyFilter);
  const setQueue = useSession((s) => s.setQueue);
  const appendToQueue = useSession((s) => s.appendToQueue);
  const setDifficultyFilter = useSession((s) => s.setDifficultyFilter);
  const swipeReject = useSession((s) => s.swipeReject);
  const swipeAccept = useSession((s) => s.swipeAccept);
  const startCooking = useSession((s) => s.startCooking);
  const dietaryTags = useAuth((s) => s.profile?.dietaryTags ?? EMPTY_DIETARY_TAGS);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const prefetching = useRef(false);
  const topCardRef = useRef<SwipeCardHandle>(null);

  const fetchBatch = useCallback(
    async (replace: boolean) => {
      if (replace) {
        setErrorMsg('');
        setLoading(true);
      } else {
        if (prefetching.current) return;
        prefetching.current = true;
      }
      try {
        const batch = await getRecommendationBatch(
          ingredients,
          useSession.getState().rejected,
          dietaryTags,
          useSession.getState().difficultyFilter ?? undefined,
        );
        if (replace) setQueue(batch);
        else appendToQueue(batch);
      } catch (err) {
        if (replace) {
          setErrorMsg(
            err instanceof AiError ? err.message : 'Could not get suggestions. Try again.',
          );
        }
      } finally {
        if (replace) setLoading(false);
        else prefetching.current = false;
      }
    },
    [ingredients, dietaryTags, setQueue, appendToQueue],
  );

  // Fetch on first mount if the deck is empty.
  useEffect(() => {
    if (queue.length === 0 && !loading && !errorMsg) fetchBatch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Top up the deck in the background once it's running low. Deliberately
  // excludes an empty queue — that's either the initial mount (already
  // handled by the effect above) or fully exhausted (handled by the "no
  // more ideas" screen below) — to avoid firing alongside the first fetch.
  useEffect(() => {
    if (!loading && !errorMsg && queue.length > 0 && queue.length <= 2) fetchBatch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  const selectDifficulty = (d: Difficulty | null) => {
    if (d === difficultyFilter) return;
    setDifficultyFilter(d);
    fetchBatch(true);
  };

  const onSwipeLeft = useCallback(() => {
    swipeReject();
  }, [swipeReject]);

  const onSwipeRight = useCallback(() => {
    const rec = swipeAccept();
    if (rec) {
      startCooking(rec);
      router.push('/cook');
    }
  }, [swipeAccept, startCooking, router]);

  const visible = queue.slice(0, 3);

  if (loading) {
    return (
      <Screen>
        <LoadingState
          message={
            useSession.getState().rejected.length
              ? 'Finding a few more ideas…'
              : 'Thinking about what you’d like…'
          }
        />
      </Screen>
    );
  }

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[
            { label: 'Try again', onPress: () => fetchBatch(true) },
            { label: 'Edit ingredients', onPress: () => router.back(), variant: 'secondary' },
          ]}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {DIFFICULTY_FILTERS.map((f) => {
          const selected = f.value === difficultyFilter;
          return (
            <Pressable
              key={f.label}
              onPress={() => selectDifficulty(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Filter by ${f.label} difficulty`}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
            >
              <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Body muted style={styles.emptyText}>
            No more ideas at this difficulty right now.
          </Body>
          <Button
            label="Try another difficulty"
            variant="secondary"
            onPress={() => selectDifficulty(null)}
          />
        </View>
      ) : (
        <View style={styles.deck}>
          {visible
            .slice(1)
            .map((r, i) => ({ r, position: i + 1 }))
            .reverse()
            .map(({ r, position }) => (
              <StackedCard key={r.id} recommendation={r} position={position} />
            ))}
          <SwipeCard
            key={visible[0].id}
            ref={topCardRef}
            recommendation={visible[0]}
            onSwipeLeft={onSwipeLeft}
            onSwipeRight={onSwipeRight}
          />
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => topCardRef.current?.triggerSwipe('left')}
          disabled={visible.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Not for me"
          accessibilityHint="Skips this suggestion"
          style={[styles.roundBtn, styles.rejectBtn, visible.length === 0 && styles.roundBtnOff]}
        >
          <Text style={styles.rejectIcon}>✕</Text>
        </Pressable>
        <Pressable
          onPress={() => topCardRef.current?.triggerSwipe('right')}
          disabled={visible.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Let’s cook this"
          accessibilityHint="Starts cooking this recipe"
          style={[styles.roundBtn, styles.acceptBtn, visible.length === 0 && styles.roundBtnOff]}
        >
          <Text style={styles.acceptIcon}>♥</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type SwipeCardHandle = { triggerSwipe: (dir: 'left' | 'right') => void };

type SwipeCardProps = {
  recommendation: Recommendation;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { recommendation, onSwipeLeft, onSwipeRight },
  ref,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    triggerSwipe: (dir) => {
      if (dir === 'right') {
        translateX.value = withTiming(SWIPE_OUT_DISTANCE, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
      } else {
        translateX.value = withTiming(-SWIPE_OUT_DISTANCE, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeLeft)();
        });
      }
    },
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SWIPE_OUT_DISTANCE, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SWIPE_OUT_DISTANCE, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-10, 0, 10],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <RecommendationCard recommendation={recommendation} />
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.likeStamp, likeStyle]}>
          <Text style={styles.likeStampText}>YES</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.nopeStamp, nopeStyle]}>
          <Text style={styles.nopeStampText}>SKIP</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

function StackedCard({
  recommendation,
  position,
}: {
  recommendation: Recommendation;
  position: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.cardWrap,
        {
          transform: [{ translateY: position * 10 }, { scale: 1 - position * 0.04 }],
          opacity: 1 - position * 0.25,
        },
      ]}
    >
      <RecommendationCard recommendation={recommendation} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterScroll: { flexGrow: 0, marginBottom: spacing.sm },
  filterRow: { gap: spacing.sm, paddingRight: spacing.md },
  filterChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipSelected: { backgroundColor: colors.accent },
  filterChipText: { fontSize: font.small, color: colors.text, fontWeight: '600' },
  filterChipTextSelected: { color: colors.onAccent, fontWeight: '800' },

  deck: { flex: 1, position: 'relative' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  stamp: {
    position: 'absolute',
    top: spacing.lg,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  likeStamp: { left: spacing.md, borderColor: colors.success, transform: [{ rotate: '-12deg' }] },
  likeStampText: { color: colors.success, fontWeight: '900', fontSize: font.heading },
  nopeStamp: { right: spacing.md, borderColor: colors.danger, transform: [{ rotate: '12deg' }] },
  nopeStampText: { color: colors.danger, fontWeight: '900', fontSize: font.heading },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { textAlign: 'center' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  roundBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  roundBtnOff: { opacity: 0.4 },
  rejectBtn: { backgroundColor: colors.surface, borderColor: colors.border },
  acceptBtn: { backgroundColor: colors.accent, borderColor: colors.accent },
  rejectIcon: { fontSize: 26, color: colors.textMuted, fontWeight: '800' },
  acceptIcon: { fontSize: 26, color: colors.onAccent },
});
