// ============================================================
// Project LEO — Wellness Wheel: Pure Geometry & Scoring Utilities
// No React dependencies — safe to import in any context.
// ============================================================

import type { WheelSegment } from '@/config/onboardingConfig';

export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  min: number;
  max: number;
}

export interface ColorThresholds {
  low: number;
  mid: number;
}

export interface ColorSet {
  low: string;
  mid: string;
  high: string;
}

export const DEFAULT_COLOR_THRESHOLDS: ColorThresholds = { low: 3, mid: 5 };
export const DEFAULT_COLORS: ColorSet = {
  low: '#D85A30',
  mid: '#BA7517',
  high: '#1D9E75',
};

const MIN_RADIUS = 6; // inner dead-zone radius (px) at score = scale.min

/**
 * Convert polar coordinates to Cartesian.
 * Angle 0 = 12 o'clock (top), increases clockwise.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number,
): Point {
  return {
    x: cx + radius * Math.sin(angleRad),
    y: cy - radius * Math.cos(angleRad),
  };
}

/** Starting angle (radians) for segment at index i across n segments. */
export function segmentStartAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n;
}

/** Mid-angle (radians) of segment i. */
export function segmentMidAngle(i: number, n: number): number {
  return (2 * Math.PI * (i + 0.5)) / n;
}

/**
 * Map a 0–9 score to a pixel radius within [minRadius, maxRadius].
 */
export function scoreToRadius(
  score: number,
  scale: Scale,
  maxRadius: number,
  minRadius: number = MIN_RADIUS,
): number {
  const range = scale.max - scale.min;
  if (range === 0) return minRadius;
  const ratio = (score - scale.min) / range;
  return minRadius + ratio * (maxRadius - minRadius);
}

/**
 * Build one polygon vertex per segment at the score-mapped radius.
 */
export function buildPolygonPoints(
  segments: WheelSegment[],
  scores: Record<string, number>,
  scale: Scale,
  cx: number,
  cy: number,
  maxRadius: number,
): Point[] {
  const n = segments.length;
  return segments.map((seg, i) => {
    const score = scores[seg.id] ?? scale.min;
    const r = scoreToRadius(score, scale, maxRadius);
    const angle = segmentMidAngle(i, n);
    return polarToCartesian(cx, cy, r, angle);
  });
}

/**
 * Given a click (x, y) relative to SVG root, return the segment index.
 */
export function getSegmentIndexFromClick(
  x: number,
  y: number,
  cx: number,
  cy: number,
  n: number,
): number {
  const dx = x - cx;
  const dy = y - cy;
  // atan2 with y-up → y-down correction; angle 0 = top, clockwise
  let angle = Math.atan2(dx, -dy);
  if (angle < 0) angle += 2 * Math.PI;
  const segAngle = (2 * Math.PI) / n;
  return Math.floor(angle / segAngle) % n;
}

/**
 * Given distance from centre, derive a rounded score within scale.
 */
export function getScoreFromDistance(
  distance: number,
  maxRadius: number,
  scale: Scale,
  minRadius: number = MIN_RADIUS,
): number {
  if (distance <= minRadius) return scale.min;
  if (distance >= maxRadius) return scale.max;
  const ratio = (distance - minRadius) / (maxRadius - minRadius);
  return Math.round(ratio * (scale.max - scale.min) + scale.min);
}

/** Euclidean distance from (x, y) to (cx, cy). */
export function distanceFromCenter(
  x: number,
  y: number,
  cx: number,
  cy: number,
): number {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
}

/**
 * Map a score to a traffic-light colour.
 */
export function scoreToColor(
  score: number,
  thresholds: ColorThresholds = DEFAULT_COLOR_THRESHOLDS,
  colors: ColorSet = DEFAULT_COLORS,
): string {
  if (score <= thresholds.low) return colors.low;
  if (score <= thresholds.mid) return colors.mid;
  return colors.high;
}

/**
 * Return the n segments with the lowest scores, ordered ascending.
 * Ties resolved by segment order (lower index first).
 */
export function getTopFocusAreas(
  segments: WheelSegment[],
  scores: Record<string, number>,
  n: number,
): WheelSegment[] {
  return [...segments]
    .sort((a, b) => {
      const scoreA = scores[a.id] ?? 0;
      const scoreB = scores[b.id] ?? 0;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return segments.indexOf(a) - segments.indexOf(b);
    })
    .slice(0, n);
}

/**
 * Fill {area1} and {area2} placeholders in an MI prompt template.
 * Returns the original template if fewer than 2 focus areas are provided.
 */
export function buildMIPrompt(
  template: string,
  focusAreas: Array<{ label: string }> | null | undefined,
): string {
  if (!focusAreas || focusAreas.length < 2) return template;
  return template
    .replace('{area1}', focusAreas[0].label)
    .replace('{area2}', focusAreas[1].label);
}

/**
 * Average score across the given segments, rounded to 1 decimal.
 * Missing scores default to 0.
 */
export function averageScore(
  scores: Record<string, number>,
  segments: WheelSegment[],
): number {
  if (segments.length === 0) return 0;
  const sum = segments.reduce((acc, seg) => acc + (scores[seg.id] ?? 0), 0);
  return Math.round((sum / segments.length) * 10) / 10;
}
