// ============================================================
// googleFit service — unit tests
// ============================================================

// ── Mock global fetch ─────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { fetchGoogleFitSummary, GOOGLE_FIT_SCOPES } from '@/services/googleFit';

const TODAY = new Date().toISOString().split('T')[0];

function makeBucket(steps: number, calories: number, hrAvg: number, distanceM: number) {
  return {
    bucket: [
      {
        dataset: [
          {
            dataSourceId: 'derived:com.google.step_count.delta:...',
            point: [{ value: [{ intVal: steps }] }],
          },
          {
            dataSourceId: 'derived:com.google.calories.expended:...',
            point: [{ value: [{ fpVal: calories }] }],
          },
          {
            dataSourceId: 'derived:com.google.heart_rate.bpm:...',
            point: [{ value: [{ fpVal: hrAvg }, { fpVal: hrAvg - 10 }, { fpVal: hrAvg + 20 }] }],
          },
          {
            dataSourceId: 'derived:com.google.distance.delta:...',
            point: [{ value: [{ fpVal: distanceM }] }],
          },
        ],
      },
    ],
  };
}

describe('googleFit service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── GOOGLE_FIT_SCOPES ─────────────────────────────────
  it('exports fitness scopes string covering activity, body, heart_rate, sleep', () => {
    expect(GOOGLE_FIT_SCOPES).toContain('fitness.activity.read');
    expect(GOOGLE_FIT_SCOPES).toContain('fitness.body.read');
    expect(GOOGLE_FIT_SCOPES).toContain('fitness.heart_rate.read');
    expect(GOOGLE_FIT_SCOPES).toContain('fitness.sleep.read');
  });

  // ── fetchGoogleFitSummary — success path ──────────────
  describe('fetchGoogleFitSummary()', () => {
    it("returns a DailyHealthSummary with today's date on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => makeBucket(8000, 350, 72, 6000),
      });

      const result = await fetchGoogleFitSummary('fake-token');
      expect(result).not.toBeNull();
      expect(result!.date).toBe(TODAY);
    });

    it('parses steps correctly', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(9500, 300, 70, 5000) });
      const result = await fetchGoogleFitSummary('tok');
      expect(result!.steps).toBe(9500);
    });

    it('parses active calories correctly', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(7000, 420, 68, 4000) });
      const result = await fetchGoogleFitSummary('tok');
      expect(result!.activeCalories).toBe(420);
    });

    it('parses heart rate avg, min, max', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(6000, 300, 75, 3000) });
      const result = await fetchGoogleFitSummary('tok');
      expect(result!.heartRateAvg).toBe(75);
      expect(result!.heartRateMin).toBe(65); // avg - 10
      expect(result!.heartRateMax).toBe(95); // avg + 20
    });

    it('converts distance from meters to km', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(5000, 200, 65, 4500) });
      const result = await fetchGoogleFitSummary('tok');
      expect(result!.distanceKm).toBe(4.5);
    });

    it('sends Authorization header with bearer token', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(0, 0, 0, 0) });
      await fetchGoogleFitSummary('my-access-token');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer my-access-token');
    });

    it('POSTs to the Google Fitness aggregate endpoint', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => makeBucket(0, 0, 0, 0) });
      await fetchGoogleFitSummary('tok');
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('googleapis.com/fitness/v1/users/me/dataset:aggregate');
      expect(options.method).toBe('POST');
    });
  });

  // ── fetchGoogleFitSummary — error paths ──────────────
  describe('fetchGoogleFitSummary() error handling', () => {
    it('returns null on HTTP 401 (expired/invalid token)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
      const result = await fetchGoogleFitSummary('bad-token');
      expect(result).toBeNull();
    });

    it('returns null on HTTP 403 (Fitness API not enabled)', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });
      const result = await fetchGoogleFitSummary('tok');
      expect(result).toBeNull();
    });

    it('returns null when fetch throws a network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      const result = await fetchGoogleFitSummary('tok');
      expect(result).toBeNull();
    });

    it('returns summary with zeros when API returns empty buckets', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ bucket: [] }) });
      const result = await fetchGoogleFitSummary('tok');
      expect(result).not.toBeNull();
      expect(result!.steps).toBe(0);
      expect(result!.activeCalories).toBe(0);
    });
  });
});
