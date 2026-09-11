import { useEffect, useMemo } from 'react';

import type { MapRegion, Post } from '../services/types';

type Props = {
  region: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  posts: Post[];
  onSelect: (post: Post) => void;
};

const MESSAGE_TYPE = 'yummi:marker';

/**
 * Web map. react-native-maps has no web build, so the browser gets a real
 * interactive map anyway — Leaflet + OpenStreetMap tiles rendered inside an
 * iframe, which needs no API key. Tapping a marker posts a message up to this
 * component, which resolves it back to the Post and calls `onSelect`.
 */
export function PostsMap({ region, posts, onSelect }: Props) {
  const points = useMemo(
    () =>
      posts.filter(
        (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
      ),
    [posts],
  );

  useEffect(() => {
    const byId = new Map(points.map((p) => [p.id, p]));
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== MESSAGE_TYPE) return;
      const post = byId.get(String(data.id));
      if (post) onSelect(post);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [points, onSelect]);

  const srcDoc = useMemo(() => buildHtml(points, region), [points, region]);

  return (
    <iframe
      title="Map of what people are cooking"
      srcDoc={srcDoc}
      style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

function buildHtml(posts: Post[], region: MapRegion): string {
  const markers = posts.map((p) => ({
    id: p.id,
    lat: p.latitude,
    lng: p.longitude,
    name: p.recipeName ?? p.authorName ?? 'A home-cooked meal',
  }));
  // Inline the data; escape `<` so a stray `</script>` in a name can't break out.
  const json = JSON.stringify({
    markers,
    fallback: { lat: region.latitude, lng: region.longitude },
    type: MESSAGE_TYPE,
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; }
  body { background: #F5F3EF; font-family: system-ui, sans-serif; }
  #fallback { padding: 16px; color: #6B6862; font-size: 14px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="fallback" hidden>Map couldn't load. Check your connection.</div>
<script>
  (function () {
    var DATA = ${json};
    if (typeof L === 'undefined') {
      document.getElementById('map').style.display = 'none';
      document.getElementById('fallback').hidden = false;
      return;
    }
    var map = L.map('map', { attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var pts = DATA.markers;
    if (pts.length) {
      var latlngs = [];
      pts.forEach(function (m) {
        var marker = L.marker([m.lat, m.lng]).addTo(map);
        if (m.name) marker.bindTooltip(m.name);
        marker.on('click', function () {
          parent.postMessage({ type: DATA.type, id: m.id }, '*');
        });
        latlngs.push([m.lat, m.lng]);
      });
      map.fitBounds(latlngs, { padding: [48, 48], maxZoom: 12 });
    } else {
      map.setView([DATA.fallback.lat, DATA.fallback.lng], 2);
    }
  })();
</script>
</body>
</html>`;
}
