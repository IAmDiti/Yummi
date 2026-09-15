import { useRouter } from 'expo-router';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
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
  // Read live, not captured once at module load — a fixed value goes stale
  // the moment the window resizes (rotation, a tablet/foldable split-screen
  // change, or a Z Fold-style fold/unfold), throwing the swipe math off.
  const { width: screenWidth } = useWindowDimensions();
  const swipeThreshold = screenWidth * 0.28;
  const swipeOutDistance = screenWidth * 1.5;
  const ingredients = useSession((s) => s.ingredients);
  const pool = useSession((s) => s.pool);
  const difficultyFilter = useSession((s) => s.difficultyFilter);
  const appendToPool = useSession((s) => s.appendToPool);
  const setDifficultyFilter = useSession((s) => s.setDifficultyFilter);
  const swipeReject = useSession((s) => s.swipeReject);
  const swipeAccept = useSession((s) => s.swipeAccept);
  const startCooking = useSession((s) => s.startCooking);
  const dietaryTags = useAuth((s) => s.profile?.dietaryTags ?? EMPTY_DIETARY_TAGS);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const prefetching = useRef(false);
  const topCardRef = useRef<SwipeCardHandle>(null);
  // Shown once, on the very first card of the session, as a hint that the
  // deck is swipeable — never replayed on later cards.
  const hasPlayedSwipeHint = useRef(false);
  // Every card in the deck must render at this exact height, or recipes with
  // different amounts of text end up as different-sized boxes stacked on top
  // of each other — the shorter front card's content ends early and a longer
  // card behind it shows through below. `deck` is a plain flex:1 child in a
  // normal (non-absolute, non-animated) parent chain, so it's the one place
  // in this screen a measured height can be trusted; every card gets it
  // passed down explicitly rather than each trying to size itself via flex
  // through the swipe deck's absolutely-positioned, Reanimated-transformed
  // slots, which Android doesn't resolve the same way a browser does.
  const [deckHeight, setDeckHeight] = useState(0);

  // The pool holds every recommendation generated this session, across every
  // difficulty tier. The visible deck is just that pool filtered to the
  // active tab — computed locally, no AI call involved.
  const queue = useMemo(
    () => (difficultyFilter ? pool.filter((r) => r.difficulty === difficultyFilter) : pool),
    [pool, difficultyFilter],
  );

  const fetchBatch = useCallback(
    async (targetDifficulty: Difficulty | null, blocking: boolean) => {
      if (blocking) {
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
          targetDifficulty ?? undefined,
        );
        appendToPool(batch);
      } catch (err) {
        if (blocking) {
          setErrorMsg(
            err instanceof AiError ? err.message : 'Could not get suggestions. Try again.',
          );
        }
      } finally {
        if (blocking) setLoading(false);
        else prefetching.current = false;
      }
    },
    [ingredients, dietaryTags, appendToPool],
  );

  // Fetch on first mount if nothing has been generated yet at all.
  useEffect(() => {
    if (pool.length === 0 && !loading && !errorMsg) fetchBatch(difficultyFilter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quietly top up the ACTIVE tier once it's running low. Free whenever the
  // pool already has enough of this tier cached (the common case right after
  // switching tabs) — deliberately excludes an empty deck, which is either
  // the initial mount (handled above) or truly exhausted (the "no more
  // ideas" screen below), to avoid firing alongside a blocking fetch.
  useEffect(() => {
    if (!loading && !errorMsg && queue.length > 0 && queue.length <= 2) {
      fetchBatch(difficultyFilter, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, difficultyFilter]);

  const selectDifficulty = (d: Difficulty | null) => {
    if (d === difficultyFilter) return;
    setDifficultyFilter(d);
    const cached = d ? pool.filter((r) => r.difficulty === d).length : pool.length;
    // Nothing cached for this tier yet — this is the only case that actually
    // needs a fresh generation. Otherwise the switch above is instant and
    // the top-up effect quietly restocks it in the background.
    if (cached === 0) fetchBatch(d, true);
  };

  const onSwipeLeft = useCallback(() => {
    if (queue[0]) swipeReject(queue[0].id);
  }, [swipeReject, queue]);

  const onSwipeRight = useCallback(() => {
    if (!queue[0]) return;
    const rec = swipeAccept(queue[0].id);
    if (rec) {
      startCooking(rec);
      router.push('/cook');
    }
  }, [swipeAccept, startCooking, router, queue]);

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
            { label: 'Try again', onPress: () => fetchBatch(difficultyFilter, true) },
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
        <View
          style={styles.deck}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setDeckHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
          }}
        >
          {visible
            .slice(1)
            .map((r, i) => ({ r, position: i + 1 }))
            .reverse()
            .map(({ r, position }) => (
              <StackedCard key={r.id} position={position} cardHeight={deckHeight} />
            ))}
          <SwipeCard
            key={visible[0].id}
            ref={topCardRef}
            recommendation={visible[0]}
            screenWidth={screenWidth}
            swipeThreshold={swipeThreshold}
            swipeOutDistance={swipeOutDistance}
            cardHeight={deckHeight}
            playSwipeHint={!hasPlayedSwipeHint.current}
            onSwipeHintPlayed={() => {
              hasPlayedSwipeHint.current = true;
            }}
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
  screenWidth: number;
  swipeThreshold: number;
  swipeOutDistance: number;
  cardHeight: number;
  /** Play a one-off "you can swipe me" wiggle right after mounting. */
  playSwipeHint?: boolean;
  onSwipeHintPlayed?: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
};

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  {
    recommendation,
    screenWidth,
    swipeThreshold,
    swipeOutDistance,
    cardHeight,
    playSwipeHint,
    onSwipeHintPlayed,
    onSwipeLeft,
    onSwipeRight,
  },
  ref,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // A brief nudge left-right-and-back on the very first card, so a new user
  // realises the deck responds to a horizontal drag before ever touching it.
  useEffect(() => {
    if (!playSwipeHint) return;
    const hintDistance = Math.min(28, screenWidth * 0.08);
    translateX.value = withSequence(
      withTiming(-hintDistance, { duration: 220 }),
      withTiming(hintDistance * 0.7, { duration: 200 }),
      withTiming(0, { duration: 220 }),
    );
    onSwipeHintPlayed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    triggerSwipe: (dir) => {
      if (dir === 'right') {
        translateX.value = withTiming(swipeOutDistance, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
      } else {
        translateX.value = withTiming(-swipeOutDistance, { duration: 220 }, (finished) => {
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
      if (e.translationX > swipeThreshold) {
        translateX.value = withTiming(swipeOutDistance, { duration: 220 }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
      } else if (e.translationX < -swipeThreshold) {
        translateX.value = withTiming(-swipeOutDistance, { duration: 220 }, (finished) => {
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
          [-screenWidth, 0, screenWidth],
          [-10, 0, 10],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrap, cardStyle]}>
        <RecommendationCard recommendation={recommendation} height={cardHeight} />
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

// Deliberately blank: this is a decorative "there's more behind this one"
// hint, not a preview. It used to render the next recipe's full content
// underneath the top card, meant to be fully covered — but any mismatch
// between the two cards' heights (different recipes have different amounts
// of text) let that content show through below the front card's edge. An
// empty shell can never leak a stray ingredient list, regardless of sizing.
function StackedCard({ position, cardHeight }: { position: number; cardHeight: number }) {
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
      <View style={[styles.peekCard, cardHeight ? { height: cardHeight } : null]} />
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

  // overflow: 'hidden' is a defensive backstop, not the fix — every card is
  // already forced to deckHeight — so a stray future mis-measurement clips
  // instead of spilling onto the accept/reject buttons below.
  deck: { flex: 1, position: 'relative', overflow: 'hidden' },
  cardWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  peekCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

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
