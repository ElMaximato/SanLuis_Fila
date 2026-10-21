import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = { good: '#30d158', warn: '#ff9f0a', bad: '#ff453a', idle: '#8e8e93' };
const OFF_TEXT = { closed: 'Cerrado', pending: 'Pendiente', na: '—' };

// Si la fila sube es malo (rojo); si baja es bueno (verde).
const TREND = {
  up: { glyph: '↑', color: COLORS.bad },
  down: { glyph: '↓', color: COLORS.good },
  flat: { glyph: '→', color: COLORS.idle },
};

function toneFor(min) {
  if (min <= 20) return 'good';
  if (min <= 45) return 'warn';
  return 'bad';
}

export default function LaneRow({ label, lane, size }) {
  const isOpen = lane?.state === 'open';
  const tone = isOpen ? toneFor(lane.delayMin) : 'idle';
  const trend = isOpen ? TREND[lane.trend] : null;

  return (
    <View style={styles.row}>
      <View style={styles.value}>
        {isOpen ? (
          <>
            <Text style={[styles.num, { fontSize: size }]}>{lane.delayMin}</Text>
            <Text style={[styles.unit, { fontSize: size * 0.32 }]}> min</Text>
            {trend && (
              <Text style={[styles.trend, { fontSize: size * 0.34, color: trend.color }]}>
                {trend.glyph}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.off, { fontSize: size * 0.4 }]}>
            {OFF_TEXT[lane?.state] ?? '—'}
          </Text>
        )}
      </View>
      <View style={styles.labelBox}>
        <View style={[styles.dot, { backgroundColor: COLORS[tone] }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flexDirection: 'row', alignItems: 'baseline' },
  num: { color: '#fff', fontWeight: '700' },
  unit: { color: '#fff', fontWeight: '500' },
  trend: { fontWeight: '700', marginLeft: 3 },
  off: { color: '#8e8e93', fontWeight: '600' },
  labelBox: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  label: { color: '#d1d1d6', fontSize: 12 },
});
