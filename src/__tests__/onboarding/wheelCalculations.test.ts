// ============================================================
// wheelCalculations — geometry + scoring unit tests (25)
// ============================================================

import {
  polarToCartesian,
  segmentStartAngle,
  segmentMidAngle,
  scoreToRadius,
  buildPolygonPoints,
  getSegmentIndexFromClick,
  getScoreFromDistance,
  distanceFromCenter,
  scoreToColor,
  getTopFocusAreas,
  buildMIPrompt,
  averageScore,
} from '@/utils/wheelCalculations';
import type { WheelSegment, Scale } from '@/config/onboardingConfig';

const SCALE: Scale = { min: 0, max: 9 };

const SEGMENTS: WheelSegment[] = [
  { id: 'nutrition',     label: 'Food & Nutrition',       shortLabel: 'Nutrition',     color: '#4CAF50' },
  { id: 'sleep',         label: 'Sleep & Rest',           shortLabel: 'Sleep',         color: '#3F51B5' },
  { id: 'physical',      label: 'Physical Fitness',       shortLabel: 'Fitness',       color: '#FF5722' },
  { id: 'emotional',     label: 'Psych & Emotional',      shortLabel: 'Emotional',     color: '#9C27B0' },
  { id: 'career',        label: 'Career & Professional',  shortLabel: 'Career',        color: '#FF9800' },
  { id: 'spirituality',  label: 'Spirituality',           shortLabel: 'Spiritual',     color: '#00BCD4' },
  { id: 'environment',   label: 'Environmental',          shortLabel: 'Environment',   color: '#8BC34A' },
  { id: 'social',        label: 'Social & Cultural',      shortLabel: 'Social',        color: '#E91E63' },
  { id: 'intellectual',  label: 'Intellectual',           shortLabel: 'Intellect',     color: '#009688' },
  { id: 'relationships', label: 'Relationships & Family', shortLabel: 'Relationships', color: '#F44336' },
  { id: 'leisure',       label: 'Leisure',                shortLabel: 'Leisure',       color: '#795548' },
];

// ---------------------------------------------------------------------------
describe('polarToCartesian', () => {
  test('angle 0 (12 o clock) returns point directly above centre', () => {
    const { x, y } = polarToCartesian(100, 100, 50, 0);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(50, 5);
  });

  test('angle π (6 o clock) returns point directly below centre', () => {
    const { x, y } = polarToCartesian(100, 100, 50, Math.PI);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(150, 5);
  });
});

// ---------------------------------------------------------------------------
describe('scoreToRadius', () => {
  test('score at scale.min returns minRadius', () => {
    expect(scoreToRadius(0, SCALE, 180, 6)).toBe(6);
  });

  test('score at scale.max returns maxRadius', () => {
    expect(scoreToRadius(9, SCALE, 180, 6)).toBe(180);
  });

  test('score at midpoint returns midpoint radius', () => {
    const r = scoreToRadius(4.5, SCALE, 180, 6);
    expect(r).toBeCloseTo(93, 0);
  });

  test('returns minRadius when scale range is 0', () => {
    expect(scoreToRadius(5, { min: 5, max: 5 }, 180, 6)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
describe('buildPolygonPoints', () => {
  test('returns one point per segment', () => {
    const scores = Object.fromEntries(SEGMENTS.map((s) => [s.id, 5]));
    const pts = buildPolygonPoints(SEGMENTS, scores, SCALE, 250, 250, 180);
    expect(pts).toHaveLength(SEGMENTS.length);
  });

  test('all points are within the wheel bounds for score 0', () => {
    const scores = Object.fromEntries(SEGMENTS.map((s) => [s.id, 0]));
    const pts = buildPolygonPoints(SEGMENTS, scores, SCALE, 250, 250, 180);
    pts.forEach(({ x, y }) => {
      const dist = Math.sqrt((x - 250) ** 2 + (y - 250) ** 2);
      expect(dist).toBeLessThanOrEqual(180 + 1);
    });
  });

  test('missing score falls back to scale.min', () => {
    const pts = buildPolygonPoints(SEGMENTS, {}, SCALE, 250, 250, 180);
    pts.forEach(({ x, y }) => {
      const dist = Math.sqrt((x - 250) ** 2 + (y - 250) ** 2);
      expect(dist).toBeCloseTo(6, 0);
    });
  });
});

// ---------------------------------------------------------------------------
describe('getSegmentIndexFromClick', () => {
  const cx = 250, cy = 250, n = 11;

  test('click directly above centre returns segment 0', () => {
    const idx = getSegmentIndexFromClick(250, 200, cx, cy, n);
    expect(idx).toBe(0);
  });

  test('returns valid segment index (0 to n-1) for any click', () => {
    const points: [number, number][] = [
      [300, 200], [350, 250], [300, 300],
      [250, 350], [200, 300], [150, 250],
    ];
    points.forEach(([x, y]) => {
      const idx = getSegmentIndexFromClick(x, y, cx, cy, n);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    });
  });
});

// ---------------------------------------------------------------------------
describe('getScoreFromDistance', () => {
  test('distance <= minRadius returns scale.min', () => {
    expect(getScoreFromDistance(4, 180, SCALE, 6)).toBe(0);
  });

  test('distance >= maxRadius returns scale.max', () => {
    expect(getScoreFromDistance(200, 180, SCALE, 6)).toBe(9);
  });

  test('distance at midpoint returns rounded mid score', () => {
    // ratio = (93 - 6) / (180 - 6) = 87/174 = 0.5 → raw = 0.5 * 9 + 0 = 4.5
    // Math.round(4.5) === 5 in JavaScript (rounds half up)
    const midDist = 6 + (180 - 6) / 2; // 93
    const score = getScoreFromDistance(midDist, 180, SCALE, 6);
    expect(score).toBe(5);
  });
});

// ---------------------------------------------------------------------------
describe('distanceFromCenter', () => {
  test('same point returns 0', () => {
    expect(distanceFromCenter(5, 5, 5, 5)).toBe(0);
  });

  test('3-4-5 right triangle returns 5', () => {
    expect(distanceFromCenter(3, 4, 0, 0)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
describe('scoreToColor', () => {
  test('score <= 3 returns low color', () => {
    expect(scoreToColor(0)).toBe('#D85A30');
    expect(scoreToColor(3)).toBe('#D85A30');
  });

  test('score 4-5 returns mid color', () => {
    expect(scoreToColor(4)).toBe('#BA7517');
    expect(scoreToColor(5)).toBe('#BA7517');
  });

  test('score >= 6 returns high color', () => {
    expect(scoreToColor(6)).toBe('#1D9E75');
    expect(scoreToColor(9)).toBe('#1D9E75');
  });

  test('respects custom thresholds', () => {
    const color = scoreToColor(5, { low: 5, mid: 7 }, { low: 'red', mid: 'orange', high: 'green' });
    expect(color).toBe('red');
  });
});

// ---------------------------------------------------------------------------
describe('getTopFocusAreas', () => {
  test('returns n items', () => {
    const scores = Object.fromEntries(SEGMENTS.map((s, i) => [s.id, i]));
    const result = getTopFocusAreas(SEGMENTS, scores, 3);
    expect(result).toHaveLength(3);
  });

  test('lowest scores appear first', () => {
    const segs = SEGMENTS.slice(0, 3);
    const scores = { nutrition: 1, sleep: 7, physical: 3 };
    const result = getTopFocusAreas(segs, scores, 3);
    expect(result[0].id).toBe('nutrition');
    expect(result[1].id).toBe('physical');
    expect(result[2].id).toBe('sleep');
  });

  test('ties broken by segment order (lower index first)', () => {
    const segs: WheelSegment[] = [
      { id: 'a', label: 'A', shortLabel: 'A', color: '#000' },
      { id: 'b', label: 'B', shortLabel: 'B', color: '#000' },
    ];
    const scores = { a: 5, b: 5 };
    const result = getTopFocusAreas(segs, scores, 2);
    expect(result[0].id).toBe('a');
  });

  test('missing scores treated as 0', () => {
    const segs: WheelSegment[] = [
      { id: 'x', label: 'X', shortLabel: 'X', color: '#000' },
      { id: 'y', label: 'Y', shortLabel: 'Y', color: '#000' },
    ];
    const scores = { y: 8 };
    const result = getTopFocusAreas(segs, scores, 2);
    expect(result[0].id).toBe('x');
  });
});

// ---------------------------------------------------------------------------
describe('buildMIPrompt', () => {
  const template = "It looks like {area1} and {area2} are areas you'd like to grow.";

  test('replaces {area1} and {area2} with focus area labels', () => {
    const areas = [{ label: 'Sleep & Rest', id: 'sleep', shortLabel: 'Sleep', color: '#000' },
                   { label: 'Emotional', id: 'emotional', shortLabel: 'Emo', color: '#000' }];
    const result = buildMIPrompt(template, areas);
    expect(result).toBe("It looks like Sleep & Rest and Emotional are areas you'd like to grow.");
  });

  test('returns template unchanged if fewer than 2 focus areas', () => {
    const one = [{ label: 'Sleep', id: 'sleep', shortLabel: 'Sleep', color: '#000' }];
    expect(buildMIPrompt(template, one)).toBe(template);
    expect(buildMIPrompt(template, [])).toBe(template);
  });

  test('returns template unchanged if focusAreas is null', () => {
    expect(buildMIPrompt(template, null)).toBe(template);
  });
});

// ---------------------------------------------------------------------------
describe('averageScore', () => {
  test('returns average rounded to 1 decimal', () => {
    const segs: WheelSegment[] = [
      { id: 'a', label: 'A', shortLabel: 'A', color: '#000' },
      { id: 'b', label: 'B', shortLabel: 'B', color: '#000' },
      { id: 'c', label: 'C', shortLabel: 'C', color: '#000' },
    ];
    const scores = { a: 3, b: 6, c: 9 };
    expect(averageScore(scores, segs)).toBe(6.0);
  });

  test('returns 0 for empty segments array', () => {
    expect(averageScore({}, [])).toBe(0);
  });

  test('missing segment scores treated as 0', () => {
    const segs: WheelSegment[] = [
      { id: 'a', label: 'A', shortLabel: 'A', color: '#000' },
      { id: 'b', label: 'B', shortLabel: 'B', color: '#000' },
    ];
    const scores = { a: 8 };
    expect(averageScore(scores, segs)).toBe(4.0);
  });
});
