import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../src/components/Card';
import { ErrorState } from '../src/components/ErrorState';
import { LoadingState } from '../src/components/LoadingState';
import { PostsMap } from '../src/components/PostsMap';
import { RatingStars } from '../src/components/RatingStars';
import { Screen } from '../src/components/Screen';
import { getRecentPosts } from '../src/services/social/posts';
import { ratePost } from '../src/services/social/ratings';
import type { MapRegion, Post } from '../src/services/types';
import { useAuth } from '../src/store/auth';
import { colors, font, radius, spacing } from '../src/theme';

const DEFAULT_REGION: MapRegion = { latitude: 20, longitude: 0, latitudeDelta: 90, longitudeDelta: 90 };

export default function MapScreen() {
  const router = useRouter();
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.userId);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selected, setSelected] = useState<Post | null>(null);
  const [region, setRegion] = useState<MapRegion>(DEFAULT_REGION);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg('');

    getRecentPosts()
      .then((list) => {
        if (cancelled) return;
        setPosts(list);
        if (list.length > 0) {
          setRegion({
            latitude: list[0].latitude,
            longitude: list[0].longitude,
            latitudeDelta: 40,
            longitudeDelta: 40,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setErrorMsg('Could not load the map. Try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Best-effort: centre on the user if they've already granted location,
    // without prompting them just for viewing the map.
    Location.getForegroundPermissionsAsync()
      .then(async (perm) => {
        if (!perm.granted) return;
        const loc = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setRegion((r) => ({
          ...r,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }));
      })
      .catch(() => {
        // keep whatever region we already have
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const rate = async (n: number) => {
    if (!selected) return;
    if (status !== 'signedIn' || !userId) {
      router.push('/login');
      return;
    }
    // Optimistic nudge to the average — an approximation (doesn't distinguish
    // a new rating from changing an existing one), reconciled on next load.
    const prevAvg = selected.avgRating ?? 0;
    const nextCount = selected.ratingCount + 1;
    const nextAvg = (prevAvg * selected.ratingCount + n) / nextCount;
    const updated: Post = { ...selected, avgRating: nextAvg, ratingCount: nextCount };
    setSelected(updated);
    setPosts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
    try {
      await ratePost(selected.id, userId, n);
    } catch {
      // best-effort; the optimistic update still shows locally
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Finding what people are cooking…" />
      </Screen>
    );
  }

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState
          message={errorMsg}
          actions={[{ label: 'Try again', onPress: () => setReloadKey((k) => k + 1) }]}
        />
      </Screen>
    );
  }

  return (
    <Screen bleed>
      <PostsMap
        region={region}
        onRegionChange={setRegion}
        posts={posts}
        onSelect={setSelected}
      />

      {selected && (
        <View style={styles.overlay}>
          <Card style={styles.card}>
            <Pressable
              onPress={() => setSelected(null)}
              style={styles.close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <View style={styles.cardRow}>
              <Image source={{ uri: selected.photoUrl }} style={styles.thumb} />
              <View style={styles.cardInfo}>
                <Text style={styles.recipeName} numberOfLines={1}>
                  {selected.recipeName ?? 'A home-cooked meal'}
                </Text>
                <Text style={styles.author} numberOfLines={1}>
                  {selected.authorName}
                  {selected.isSeed ? ' · Demo chef' : ''}
                </Text>
                <RatingStars value={selected.avgRating} count={selected.ratingCount} onRate={rate} size={18} />
              </View>
            </View>
            {!!selected.caption && <Text style={styles.caption}>{selected.caption}</Text>}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
  card: { gap: spacing.sm },
  close: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 1, padding: spacing.xs },
  closeText: { fontSize: font.label, color: colors.textMuted, fontWeight: '800' },
  cardRow: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  cardInfo: { flex: 1, gap: spacing.xs, paddingRight: spacing.lg },
  recipeName: { fontSize: font.label, fontWeight: '800', color: colors.text },
  author: { fontSize: font.small, color: colors.textMuted },
  caption: { fontSize: font.small, color: colors.text },
});
