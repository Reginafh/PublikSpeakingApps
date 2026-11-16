import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/designSystem';

interface AudioVisualizerProps {
  isRecording: boolean;
  barCount?: number;
  height?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  barCount = 28,
  height = 96,
}) => {
  // Store animated values in state so it doesn't violate ref render rules
  const [bars] = useState<Animated.Value[]>(() =>
    Array.from({ length: barCount }, () => new Animated.Value(8))
  );

  useEffect(() => {
    let timer: any;

    if (isRecording) {
      const animateWave = () => {
        const animations = bars.map((anim, idx) => {
          const distanceFromCenter = Math.abs(idx - barCount / 2);
          const maxFactor = Math.max(0.35, 1 - distanceFromCenter / (barCount * 0.7));
          const randomHeight = Math.max(
            10,
            Math.floor(Math.random() * (height - 12) * maxFactor) + 8
          );

          return Animated.timing(anim, {
            toValue: randomHeight,
            duration: 100 + Math.floor(Math.random() * 80),
            useNativeDriver: false,
          });
        });

        Animated.parallel(animations).start(() => {
          if (isRecording) {
            timer = setTimeout(animateWave, 40);
          }
        });
      };

      animateWave();
    } else {
      bars.forEach((anim, i) => {
        const restingHeight = 8 + (i % 3) * 6;
        Animated.timing(anim, {
          toValue: restingHeight,
          duration: 250,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isRecording, barCount, height, bars]);

  const getBarColor = (index: number) => {
    const mod = index % 4;
    if (mod === 0) return Colors.primary;
    if (mod === 1) return Colors.secondary;
    if (mod === 2) return Colors.secondaryContainer;
    return Colors.primaryContainer;
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.gridOverlay} />
      <View style={styles.barsRow}>
        {bars.map((animHeight, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: animHeight,
                backgroundColor: getBarColor(index),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.1,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
  },
  bar: {
    width: 4,
    borderRadius: 9999,
    marginHorizontal: 1,
  },
});
