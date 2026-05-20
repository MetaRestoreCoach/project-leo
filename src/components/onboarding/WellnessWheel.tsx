// ============================================================
// Project LEO — WellnessWheel
// Interactive SVG wheel built with react-native-svg.
// Displays 11 life-area segments; user taps or uses sliders
// to set a satisfaction score (0–9) for each area.
// ============================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';

import type { WheelSegment } from '@/config/onboardingConfig';
import type { Scale } from '@/utils/wheelCalculations';
import {
  polarToCartesian,
  segmentMidAngle,
  segmentStartAngle,
  scoreToRadius,
  buildPolygonPoints,
  getTopFocusAreas,
  buildMIPrompt,
  scoreToColor,
} from '@/utils/wheelCalculations';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WellnessWheelProps {
  segments: WheelSegment[];
  scores: Record<string, number>;
  scale: Scale;
  onScoreChange?: (id: string, score: number) => void;
  readonly?: boolean;
  /** SVG pixel size (default 320). */
  size?: number;
  miPromptTemplate?: string;
  focusAreaCount?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MIN_RADIUS = 6;

export function WellnessWheel({
  segments,
  scores,
  scale,
  onScoreChange,
  readonly = false,
  size = 320,
  miPromptTemplate,
  focusAreaCount = 3,
}: WellnessWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.42;
  const n = segments.length;

  // Polygon vertices for score outline
  const polyPoints = useMemo(
    () => buildPolygonPoints(segments, scores, scale, cx, cy, maxRadius),
    [segments, scores, scale, cx, cy, maxRadius],
  );
  const polyPointsStr = polyPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Grid rings (faint circles at each integer score)
  const gridRings = useMemo(() => {
    const rings: number[] = [];
    for (let s = scale.min + 1; s <= scale.max; s++) {
      rings.push(scoreToRadius(s, scale, maxRadius, MIN_RADIUS));
    }
    return rings;
  }, [scale, maxRadius]);

  // Spoke tips (label positions)
  const spokes = useMemo(
    () =>
      segments.map((seg, i) => {
        const angle = segmentMidAngle(i, n);
        const tipR = maxRadius + 16;
        const tip = polarToCartesian(cx, cy, tipR, angle);
        return { seg, tip, angle };
      }),
    [segments, n, cx, cy, maxRadius],
  );

  // MI focus areas
  const focusAreas = useMemo(
    () => getTopFocusAreas(segments, scores, focusAreaCount),
    [segments, scores, focusAreaCount],
  );
  const miPrompt =
    miPromptTemplate ? buildMIPrompt(miPromptTemplate, focusAreas) : null;

  return (
    <View style={styles.container} testID="wellness-wheel">
      {/* SVG Wheel */}
      <Svg
        width={size}
        height={size}
        accessibilityRole="image"
        accessibilityLabel="Wellness wheel"
      >
        {/* Grid rings */}
        {gridRings.map((r, idx) => (
          <Circle key={idx} cx={cx} cy={cy} r={r} stroke={Colors.border} strokeWidth={0.5} fill="none" />
        ))}

        {/* Spoke lines */}
        {segments.map((_, i) => {
          const angle = segmentStartAngle(i, n);
          const tip = polarToCartesian(cx, cy, maxRadius, angle);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke={Colors.border}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Outer ring */}
        <Circle cx={cx} cy={cy} r={maxRadius} stroke={Colors.border} strokeWidth={1} fill="none" />

        {/* Score polygon */}
        <Polygon
          points={polyPointsStr}
          fill="rgba(11,82,148,0.15)"
          stroke={Colors.primary}
          strokeWidth={2}
        />

        {/* Score dots */}
        {polyPoints.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={scoreToColor(scores[segments[i].id] ?? scale.min)}
            stroke={Colors.surface}
            strokeWidth={1.5}
          />
        ))}

        {/* Segment labels */}
        {spokes.map(({ seg, tip }) => (
          <SvgText
            key={seg.id}
            x={tip.x}
            y={tip.y}
            fontSize={9}
            fill={Colors.textSecondary}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {seg.shortLabel}
          </SvgText>
        ))}

        {/* Centre dot */}
        <Circle cx={cx} cy={cy} r={3} fill={Colors.textTertiary} />
      </Svg>

      {/* Sliders — hidden in readonly mode */}
      {!readonly && onScoreChange && (
        <ScrollView style={styles.slidersContainer} nestedScrollEnabled>
          {segments.map((seg) => {
            const score = scores[seg.id] ?? scale.min;
            return (
              <View key={seg.id} style={styles.sliderRow}>
                <View style={styles.sliderLabelRow}>
                  <Text style={styles.sliderLabel}>{seg.label}</Text>
                  <Text style={[styles.sliderScore, { color: scoreToColor(score) }]}>
                    {score}
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={scale.min}
                  maximumValue={scale.max}
                  step={1}
                  value={score}
                  onValueChange={(v) => onScoreChange(seg.id, v)}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.border}
                  thumbTintColor={Colors.primary}
                  accessibilityLabel={`${seg.label} score`}
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* MI prompt */}
      {miPrompt && (
        <View style={styles.miPromptBox} accessibilityRole="text">
          <Text style={styles.miPromptText}>{miPrompt}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  slidersContainer: {
    width: '100%',
    marginTop: Spacing.md,
    maxHeight: 320,
  },
  sliderRow: {
    marginBottom: Spacing.sm,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderLabel: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  sliderScore: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  miPromptBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: Spacing.md,
    width: '100%',
  },
  miPromptText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export default WellnessWheel;
