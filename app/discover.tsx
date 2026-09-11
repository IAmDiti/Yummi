import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorState } from '../src/components/ErrorState';
import { Body } from '../src/components/Heading';
import { LoadingState } from '../src/components/LoadingState';
import { RatingStars } from '../src/components/RatingStars';
import { Screen } from '../src/components/Screen';
import { getTrendingPosts } from '../src/services/social/posts';
import type { Post } from '../src/services/types';
import { colors, font, radius, spacing } from '../src/theme';

export default function Discover() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(() => {
    setErrorMsg('');
    setPosts(null);
    getTrendingPosts()
      .then(setPosts)
      .catch(() => setErrorMsg('Could not load what people are cooking. Try again.'));
  }, []);

  useEffect(load, [load]);

  if (errorMsg) {
    return (
      <Screen>
        <ErrorState message={errorMsg} actions={[{ label: 'Try again', onPress: load }]} />
      </Screen>
    );
  }

  if (!posts) {
    return (
      <Screen>
        <LoadingState message="Finding what’s mostly cooked…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Body muted style={styles.intro}>
              What everyone’s making right now.
            </Body>
            <Button label="Open map" variant="secondary" onPress={() => router.push('/map')} />
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            <View style={styles.info}>
              <Text style={styles.recipeName} numberOfLines={1}>
                {item.recipeName ?? 'A home-cooked meal'}
              </Text>
              <Text style={styles.author} numberOfLines={1}>
                {item.authorName}
                {item.isSeed ? ' · Demo chef' : ''}
              </Text>
              <RatingStars value={item.avgRating} count={item.ratingCount} size={16} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, paddingBottom: spacing.lg },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  intro: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  info: { flex: 1, gap: spacing.xs },
  recipeName: { fontSize: font.label, fontWeight: '800', color: colors.text },
  author: { fontSize: font.small, color: colors.textMuted },
});
