import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import LaneRow from './src/components/LaneRow';
import { useWaitTimes } from './src/hooks/useWaitTimes';
import { useShake } from './src/hooks/useShake';
import { useAlerts } from './src/hooks/useAlerts';

function ago(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const { data, error, loading, refreshing, refresh } = useWaitTimes();
  const doRefresh = useCallback(() => refresh({ force: true, feedback: true }), [refresh]);
  useShake(doRefresh);
  const alert = useAlerts(data);
  const fade = useRef(new Animated.Value(1)).current;
  const wasRefreshing = useRef(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Al refrescar a mano: los números se atenúan y luego vuelven.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: refreshing ? 0.35 : 1,
      duration: refreshing ? 150 : 300,
      useNativeDriver: true,
    }).start();
  }, [refreshing, fade]);

  // Al terminar un refresco sin error: "Actualizado ✓" por 1.5 s.
  useEffect(() => {
    let timer;
    if (wasRefreshing.current && !refreshing && !error) {
      setJustUpdated(true);
      timer = setTimeout(() => setJustUpdated(false), 1500);
    }
    wasRefreshing.current = refreshing;
    return () => clearTimeout(timer);
  }, [refreshing, error]);

  const size = Math.round(width * 0.18);
  const warn = data && (data.stale || error);

  const pages = data
    ? [
        {
          key: 'autos',
          title: 'Autos',
          lanes: [
            ['sentri', data.lanes.sentri],
            ['normal', data.lanes.normal],
            ['ready', data.lanes.ready],
          ],
        },
        {
          key: 'peatones',
          title: 'Peatones',
          lanes: [
            ['normal', data.pedestrians?.normal],
            ['ready', data.pedestrians?.ready],
          ],
        },
      ]
    : [];

  if (!data) {
    return (
      <Pressable style={[styles.page, { height }]} onPress={doRefresh}>
        <StatusBar hidden />
        <Text style={styles.header}>San Luis I</Text>
        <Text style={styles.hint}>
          {loading ? 'Cargando…' : 'Sin conexión. Toca para reintentar'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <FlatList
        data={pages}
        keyExtractor={(p) => p.key}
        pagingEnabled
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.y / height))}
        renderItem={({ item }) => (
          <Pressable style={[styles.page, { height }]} onPress={doRefresh}>
            <Animated.View style={{ opacity: fade, gap: 4 }}>
              <Text style={[styles.header, alert && { color: alert.color, fontWeight: '700' }]}>
                {alert ? alert.text : `${data.crossing || 'San Luis I'} · ${item.title}`}
              </Text>
              {item.lanes.map(([label, lane]) => (
                <LaneRow key={label} label={label} lane={lane} size={size} />
              ))}
            </Animated.View>
            <Text
              style={[
                styles.footer,
                warn && !refreshing && !justUpdated && styles.footerWarn,
                justUpdated && styles.footerOk,
              ]}
            >
              {refreshing
                ? 'Actualizando…'
                : justUpdated
                ? 'Actualizado ✓'
                : `${ago(now - new Date(data.fetchedAt).getTime())}${warn ? ' · sin CBP' : ''}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Puntitos de página, como en TikTok pero en pequeño */}
      <View style={styles.dots} pointerEvents="none">
        {pages.map((p, i) => (
          <View key={p.key} style={[styles.pageDot, i === page && styles.pageDotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  page: {
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: '17%', // la pantalla redonda recorta las esquinas
    gap: 4,
  },
  header: { color: '#8e8e93', fontSize: 12, textAlign: 'center', marginBottom: 2 },
  hint: { color: '#8e8e93', fontSize: 14, textAlign: 'center' },
  footer: { color: '#8e8e93', fontSize: 11, textAlign: 'center', marginTop: 2 },
  footerWarn: { color: '#ff9f0a' },
  footerOk: { color: '#30d158' },
  dots: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 5,
  },
  pageDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3a3a3c' },
  pageDotOn: { backgroundColor: '#fff' },
});
