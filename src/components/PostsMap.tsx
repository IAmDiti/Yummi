import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { MapRegion, Post } from '../services/types';

type Props = {
  region: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  posts: Post[];
  onSelect: (post: Post) => void;
};

/**
 * Native map: real, pannable map with a pin per post. The web build gets
 * PostsMap.web.tsx instead, since react-native-maps has no web implementation.
 */
export function PostsMap({ region, onRegionChange, posts, onSelect }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={onRegionChange}
    >
      {posts.map((post) => (
        <Marker
          key={post.id}
          coordinate={{ latitude: post.latitude, longitude: post.longitude }}
          title={post.recipeName ?? undefined}
          onPress={() => onSelect(post)}
        />
      ))}
    </MapView>
  );
}
