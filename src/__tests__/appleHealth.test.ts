// ============================================================
// appleHealth service — unit tests (web/demo path)
// ============================================================

// Force web platform for this suite (minimal mock avoids native module loading)
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (spec: Record<string, unknown>) => spec['web'] ?? spec['default'] },
}));

// Prevent supabase WebSocket init (appleHealth.native.ts imports supabase)
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) },
    from: jest.fn(() => ({ select: jest.fn(), insert: jest.fn(), upsert: jest.fn() })),
  },
}));

import {
  isHealthKitAvailable,
  requestHealthPermissions,
  getTodaysSummary,
  getWeeklyData,
  getWeeklyTrends,
  getConnectedServices,
  DailyHealthSummary,
} from '@/services/appleHealth';

describe('appleHealth (web/demo fallback)', () => {
  // ── Availability ─────────────────────────────────────
  it('isHealthKitAvailable returns false on web', () => {
    expect(isHealthKitAvailable()).toBe(false);
  });

  it('requestHealthPermissions returns false on non-iOS (HealthKit not available)', async () => {
    const result = await requestHealthPermissions();
    expect(result).toBe(false);
  });

  // ── getTodaysSummary ──────────────────────────────────
  describe('getTodaysSummary()', () => {
    it('returns a DailyHealthSummary with all required fields', async () => {
      const summary = await getTodaysSummary();
      const requiredKeys: (keyof DailyHealthSummary)[] = [
        'date', 'steps', 'heartRateAvg', 'heartRateMin', 'heartRateMax',
        'sleepHours', 'activeCalories', 'restingCalories', 'distanceKm',
        'flightsClimbed', 'bloodOxygen', 'respiratoryRate',
      ];
      for (const key of requiredKeys) {
        expect(summary).toHaveProperty(key);
      }
    });

    it('date matches today in YYYY-MM-DD format', async () => {
      const summary = await getTodaysSummary();
      const today = new Date().toISOString().split('T')[0];
      expect(summary.date).toBe(today);
    });

    it('steps are a positive number', async () => {
      const summary = await getTodaysSummary();
      expect(summary.steps).toBeGreaterThan(0);
    });

    it('heartRateMin <= heartRateAvg <= heartRateMax', async () => {
      const { heartRateMin, heartRateAvg, heartRateMax } = await getTodaysSummary();
      expect(heartRateMin).toBeLessThanOrEqual(heartRateAvg);
      expect(heartRateAvg).toBeLessThanOrEqual(heartRateMax);
    });

    it('returns stable (non-random) values on repeated calls', async () => {
      const a = await getTodaysSummary();
      const b = await getTodaysSummary();
      expect(a).toEqual(b);
    });
  });

  // ── getWeeklyData ─────────────────────────────────────
  describe('getWeeklyData()', () => {
    it('returns exactly 7 days', async () => {
      const data = await getWeeklyData();
      expect(data).toHaveLength(7);
    });

    it('dates are in ascending order', async () => {
      const data = await getWeeklyData();
      for (let i = 1; i < data.length; i++) {
        expect(data[i].date > data[i - 1].date).toBe(true);
      }
    });

    it('last entry matches today', async () => {
      const data = await getWeeklyData();
      const today = new Date().toISOString().split('T')[0];
      expect(data[data.length - 1].date).toBe(today);
    });

    it('all entries have positive steps', async () => {
      const data = await getWeeklyData();
      data.forEach((d) => expect(d.steps).toBeGreaterThan(0));
    });
  });

  // ── getWeeklyTrends ───────────────────────────────────
  describe('getWeeklyTrends()', () => {
    it('returns trends for Steps, Heart Rate, Sleep, Active Calories, Distance', async () => {
      const trends = await getWeeklyTrends();
      const labels = trends.map((t) => t.metric);
      expect(labels).toContain('Steps');
      expect(labels).toContain('Heart Rate');
      expect(labels).toContain('Sleep');
      expect(labels).toContain('Active Calories');
      expect(labels).toContain('Distance');
    });

    it('each trend has a valid trend value', async () => {
      const trends = await getWeeklyTrends();
      for (const t of trends) {
        expect(['up', 'down', 'stable']).toContain(t.trend);
      }
    });

    it('each trend values array has 7 entries', async () => {
      const trends = await getWeeklyTrends();
      for (const t of trends) {
        expect(t.values).toHaveLength(7);
      }
    });
  });

  // ── getConnectedServices ──────────────────────────────
  describe('getConnectedServices()', () => {
    it('includes apple_health, strava, garmin, google_fit', () => {
      const services = getConnectedServices();
      const ids = services.map((s) => s.id);
      expect(ids).toContain('apple_health');
      expect(ids).toContain('strava');
      expect(ids).toContain('garmin');
      expect(ids).toContain('google_fit');
    });

    it('apple_health is not connected on web', () => {
      const services = getConnectedServices();
      const appleHealth = services.find((s) => s.id === 'apple_health')!;
      expect(appleHealth.connected).toBe(false);
    });

    it('strava and garmin are not connected (OAuth not set up)', () => {
      const services = getConnectedServices();
      const strava = services.find((s) => s.id === 'strava')!;
      const garmin = services.find((s) => s.id === 'garmin')!;
      expect(strava.connected).toBe(false);
      expect(garmin.connected).toBe(false);
    });
  });
});
