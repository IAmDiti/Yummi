import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body } from '../src/components/Heading';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { RatingStars } from '../src/components/RatingStars';
import { Screen } from '../src/components/Screen';
import { useT } from '../src/i18n';
import { getTrendingPosts } from '../src/services/social/posts';
import { ratePost } from '../src/services/social/ratings';
import type { Post } from '../src/services/types';
import { useAuth } from '../src/store/auth';
import { colors, font, spacing } from '../src/theme';

export default function Discover() {
  const router = useRouter();
  const t = useT();
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.userId);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  // Measured, not assumed: the exact height of the space this screen actually
  // has to work with (window height minus safe-area insets), so each feed
  // page snaps edge-to-edge regardless of device notches/nav bars.
  const [pageHeight, setPageHeight] = useState(0);

  const load = useCallback(() => {
    setErrorMsg('');
    setPosts(null);
    getTrendingPosts()
      .then(setPosts)
      .catch(() => setErrorMsg(t('discover.loadFailed')));
  }, [t]);

  useEffect(load, [load]);

  const rate = useCallback(
    async (post: Post, n: number) => {
      if (status !== 'signedIn' || !userId) {
        router.push('/login');
        return;
      }
      // Optimistic nudge to the average — an approximation (doesn't
      // distinguish a new rating from changing an existing one), reconciled
      // on next load.
      const prevAvg = post.avgRating ?? 0;
      const nextCount = post.ratingCount + 1;
      const nextAvg = (prevAvg * post.ratingCount + n) / nextCount;
      setPosts((list) =>
        list
          ? list.map((p) => (p.id === post.id ? { ...p, avgRating: nextAvg, ratingCount: nextCount } : p))
          : list,
      );
      try {
        await ratePost(post.id, userId, n);
      } catch {
        // best-effort; the optimistic update still shows locally
      }
    },
    [status, userId, router],
  );

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState message={errorMsg} actions={[{ label: t('common.tryAgain'), onPress: load }]} />
      </Screen>
    );
  }

  if (!posts) {
    return (
      <Screen>
        <LoadingState message={t('discover.finding')} />
      </Screen>
    );
  }

  return (
    <Screen bleed backgroundColor="#000">
      <View style={styles.fill} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
        {posts.length === 0 ? (
          <View style={styles.empty}>
            <Body muted style={styles.emptyText}>
              {t('discover.empty')}
            </Body>
          </View>
        ) : (
          pageHeight > 0 && (
            <FlatList
              data={posts}
              keyExtractor={(p) => p.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              snapToInterval={pageHeight}
              decelerationRate="fast"
              disableIntervalMomentum
              getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
              renderItem={({ item }) => (
                <FeedPage post={item} height={pageHeight} onRate={(n) => rate(item, n)} />
              )}
            />
          )
        )}

        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('discover.backAria')}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function FeedPage({
  post,
  height,
  onRate,
}: {
  post: Post;
  height: number;
  onRate: (n: number) => void;
}) {
  const t = useT();
  return (
    <View style={{ height, width: '100%' }}>
      <Image source={{ uri: post.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.overlay}>
        <Text style={styles.recipeName} numberOfLines={2}>
          {post.recipeName ?? t('discover.homeCookedMeal')}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {post.authorName}
          {post.isSeed ? t('discover.demoChef') : ''}
        </Text>
        {!!post.caption && (
          <Text style={styles.caption} numberOfLines={3}>
            {post.caption}
          </Text>
        )}
        <RatingStars value={post.avgRating} count={post.ratingCount} onRate={onRate} size={26} onDark />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backIcon: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: -2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyText: { textAlign: 'center', color: '#fff' },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    gap: spacing.xs,
  },
  recipeName: { fontSize: font.heading, fontWeight: '800', color: '#fff' },
  author: { fontSize: font.label, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  caption: { fontSize: font.small, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
});
