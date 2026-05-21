import type { DailyHealthSummary } from './appleHealth';

export const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
].join(' ');

export async function fetchGoogleFitSummary(accessToken: string): Promise<DailyHealthSummary | null> {
  try {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    console.log('[GoogleFit] Fetching with token:', accessToken?.substring(0, 20) + '...');

    const res = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [
            { dataTypeName: 'com.google.step_count.delta' },
            { dataTypeName: 'com.google.calories.expended' },
            { dataTypeName: 'com.google.heart_rate.bpm' },
            { dataTypeName: 'com.google.distance.delta' },
          ],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: now,
        }),
      },
    );

    console.log('[GoogleFit] Response status:', res.status);
    if (!res.ok) {
      const errorText = await res.text();
      console.warn('[GoogleFit] API error:', res.status, errorText);
      return null;
    }

    const data = await res.json();
    console.log('[GoogleFit] Response data:', data);
    return parseAggregate(data);
  } catch (e) {
    console.warn('[GoogleFit] Fetch error:', e);
    return null;
  }
}

function parseAggregate(json: any): DailyHealthSummary {
  let steps = 0, calories = 0, hrSum = 0, hrCount = 0;
  let hrMin = Infinity, hrMax = 0, distanceMeters = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const bucket of json.bucket ?? []) {
    for (const dataset of bucket.dataset ?? []) {
      const sid: string = dataset.dataSourceId ?? '';
      for (const point of dataset.point ?? []) {
        const v0 = point.value?.[0];
        if (!v0) continue;
        if (sid.includes('step_count')) {
          steps += v0.intVal ?? 0;
        } else if (sid.includes('calories')) {
          calories += v0.fpVal ?? 0;
        } else if (sid.includes('heart_rate')) {
          const avg = v0.fpVal ?? 0;
          hrSum += avg;
          hrCount++;
          hrMin = Math.min(hrMin, point.value?.[1]?.fpVal ?? avg);
          hrMax = Math.max(hrMax, point.value?.[2]?.fpVal ?? avg);
        } else if (sid.includes('distance')) {
          distanceMeters += v0.fpVal ?? 0;
        }
      }
    }
  }

  const hrAvg = hrCount > 0 ? hrSum / hrCount : 72;

  return {
    date: today,
    steps: Math.round(steps),
    heartRateAvg: Math.round(hrAvg),
    heartRateMin: hrMin === Infinity ? Math.round(hrAvg - 10) : Math.round(hrMin),
    heartRateMax: hrMax === 0 ? Math.round(hrAvg + 20) : Math.round(hrMax),
    sleepHours: 0,
    activeCalories: Math.round(calories),
    restingCalories: 1700,
    distanceKm: Math.round(distanceMeters / 100) / 10,
    flightsClimbed: 0,
    bloodOxygen: null,
    respiratoryRate: null,
  };
}
