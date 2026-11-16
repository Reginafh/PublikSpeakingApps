import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '../constants/designSystem';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showSubtext?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  showSubtext = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (circumference * clampedScore) / 100;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.secondaryContainer} />
            <Stop offset="50%" stopColor={Colors.secondary} />
            <Stop offset="100%" stopColor={Colors.primary} />
          </LinearGradient>
        </Defs>

        {/* Background Track Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.surfaceContainer}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Progress Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Label */}
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.scoreText,
            { fontSize: size >= 130 ? 36 : 22, color: Colors.onSurface },
          ]}
        >
          {clampedScore}
        </Text>
        {showSubtext && (
          <Text style={[styles.subText, { fontSize: size >= 130 ? 11 : 9 }]}>
            / 100
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: undefined,
  },
  subText: {
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
