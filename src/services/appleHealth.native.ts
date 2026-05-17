// ============================================================
// Apple Health Integration — Native iOS (HealthKit)
// Requires: bare Expo workflow + react-native-health
//
// Installation (run after ejecting from Expo managed workflow):
//   npm install react-native-health
//   cd ios && pod install
//
// Info.plist keys required:
//   NSHealthShareUsageDescription
//   NSHealthUpdateUsageDescription
//
// Also add the HealthKit capability in Xcode:
//   Target → Signing & Capabilities → + Capability → HealthKit
// ============================================================

import { Platform } from 'react-native';
import { supabase } from './supabase';

// ── Types (re-exported so consumers use a single import path) ──────────────
export interface HealthDataPoint {
  type: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  source: string;
}

export interface DailyHealthSummary {
  date: string;
  steps: number;
  heartRateAvg: number;
  heartRateMin: number;
  heartRateMax: number;
  sleepHours: number;
  activeCalories: number;
  restingCalories: number;
  distanceKm: number;
  flightsClimbed: number;
  bloodOxygen: number | null;
  respiratoryRate: number | null;
}

export interface WeeklyTrend {
  metric: string;
  values: { date: string; value: number }[];
  average: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface ConnectedService {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSync: string | null;
  dataTypes: string[];
}

// ── HealthKit permissions ──────────────────────────────────────────────────
// Keep the list minimal for MVP — only request what the dashboard displays.
const READ_PERMISSIONS = [
  'Steps',
  'HeartRate',
  'HeartRateVariability',
  'SleepAnalysis',
  'ActiveEnergyBurned',
  'BasalEnergyBurned',
  'DistanceWalkingRunning',
  'FlightsClimbed',
  'OxygenSaturation',
  'RespiratoryRate',
  'BloodGlucose',
] as const;

// ── Lazy HealthKit loader ──────────────────────────────────────────────────
// We require() at runtime so the module is never imported on web builds.
function getAppleHealthKit() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: AppleHealthKit } = require('react-native-health');
    return AppleHealthKit as typeof import('react-native-health').default;
  } catch {
    return null;
  }
}

let _initialized = false;
let _permissionsGranted = false;

// ── Public API ─────────────────────────────────────────────────────────────

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;

  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit) {
    console.warn('[HealthKit] react-native-health not installed — see installation steps at top of this file');
    return false;
  }

  return new Promise((resolve) => {
    const permissions = {
      permissions: {
        read: READ_PERMISSIONS as unknown as string[],
        write: [] as string[],
      },
    };

    AppleHealthKit.initHealthKit(permissions, (err: string) => {
      if (err) {
        console.warn('[HealthKit] Permission denied or init error:', err);
        _permissionsGranted = false;
        resolve(false);
      } else {
        _initialized = true;
        _permissionsGranted = true;
        resolve(true);
      }
    });
  });
}

// ── Helper: query with Promise wrapper ────────────────────────────────────

function queryHealthKit<T>(
  method: (options: Record<string, unknown>, callback: (err: string, results: T) => void) => void,
  options: Record<string, unknown>,
): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      method(options, (err, results) => {
        if (err) {
          console.warn('[HealthKit] Query error:', err);
          resolve(null);
        } else {
          resolve(results);
        }
      });
    } catch (e) {
      console.warn('[HealthKit] Exception during query:', e);
      resolve(null);
    }
  });
}

// ── Date helpers ───────────────────────────────────────────────────────────

function startOfDayISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayISO(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── Core queries ───────────────────────────────────────────────────────────

async function fetchSteps(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  const result = await queryHealthKit<{ value: number }>(
    AppleHealthKit.getStepCount.bind(AppleHealthKit),
    { startDate: start, endDate: end },
  );
  return result?.value ?? 0;
}

async function fetchHeartRate(start: string, end: string): Promise<{ avg: number; min: number; max: number }> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return { avg: 0, min: 0, max: 0 };

  const samples = await queryHealthKit<{ value: number }[]>(
    AppleHealthKit.getHeartRateSamples.bind(AppleHealthKit),
    { startDate: start, endDate: end, limit: 1000, ascending: false },
  );

  if (!samples || samples.length === 0) return { avg: 0, min: 0, max: 0 };
  const values = samples.map((s) => s.value);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return {
    avg,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

async function fetchSleepHours(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  type SleepSample = { startDate: string; endDate: string; value: 'ASLEEP' | 'INBED' | 'AWAKE' };
  const samples = await queryHealthKit<SleepSample[]>(
    AppleHealthKit.getSleepSamples.bind(AppleHealthKit),
    { startDate: start, endDate: end, limit: 100 },
  );

  if (!samples) return 0;
  // Sum all ASLEEP segments in hours
  const totalMs = samples
    .filter((s) => s.value === 'ASLEEP')
    .reduce((acc, s) => {
      const ms = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      return acc + ms;
    }, 0);
  return Math.round((totalMs / 3_600_000) * 10) / 10;
}

async function fetchActiveCalories(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  const result = await queryHealthKit<{ value: number }>(
    AppleHealthKit.getActiveEnergyBurned.bind(AppleHealthKit),
    { startDate: start, endDate: end },
  );
  return Math.round(result?.value ?? 0);
}

async function fetchRestingCalories(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  const result = await queryHealthKit<{ value: number }>(
    AppleHealthKit.getBasalEnergyBurned.bind(AppleHealthKit),
    { startDate: start, endDate: end },
  );
  return Math.round(result?.value ?? 0);
}

async function fetchDistanceKm(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  const result = await queryHealthKit<{ value: number }>(
    AppleHealthKit.getDistanceWalkingRunning.bind(AppleHealthKit),
    { startDate: start, endDate: end, unit: 'kilometer' },
  );
  return Math.round((result?.value ?? 0) * 10) / 10;
}

async function fetchFlightsClimbed(start: string, end: string): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return 0;

  const result = await queryHealthKit<{ value: number }>(
    AppleHealthKit.getFlightsClimbed.bind(AppleHealthKit),
    { startDate: start, endDate: end },
  );
  return Math.round(result?.value ?? 0);
}

async function fetchBloodOxygen(start: string, end: string): Promise<number | null> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return null;

  type OxSample = { value: number };
  const samples = await queryHealthKit<OxSample[]>(
    AppleHealthKit.getOxygenSaturationSamples.bind(AppleHealthKit),
    { startDate: start, endDate: end, limit: 10 },
  );
  if (!samples || samples.length === 0) return null;
  const avg = samples.reduce((a, b) => a + b.value, 0) / samples.length;
  return Math.round(avg * 10) / 10;
}

async function fetchRespiratoryRate(start: string, end: string): Promise<number | null> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit || !_initialized) return null;

  type RRSample = { value: number };
  const samples = await queryHealthKit<RRSample[]>(
    AppleHealthKit.getRespiratoryRateSamples.bind(AppleHealthKit),
    { startDate: start, endDate: end, limit: 10 },
  );
  if (!samples || samples.length === 0) return null;
  const avg = samples.reduce((a, b) => a + b.value, 0) / samples.length;
  return Math.round(avg * 10) / 10;
}

// ── Build DailyHealthSummary for any date ─────────────────────────────────

async function fetchDaySummary(date: Date): Promise<DailyHealthSummary> {
  const start = startOfDayISO(date);
  const end = endOfDayISO(date);
  const dateStr = date.toISOString().split('T')[0];

  // Sleep window: 20:00 previous day → 12:00 today to catch overnight sleep
  const sleepStart = (() => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    d.setHours(20, 0, 0, 0);
    return d.toISOString();
  })();
  const sleepEnd = (() => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  })();

  const [steps, hr, sleepHours, activeCalories, restingCalories, distanceKm, flightsClimbed, bloodOxygen, respiratoryRate] =
    await Promise.all([
      fetchSteps(start, end),
      fetchHeartRate(start, end),
      fetchSleepHours(sleepStart, sleepEnd),
      fetchActiveCalories(start, end),
      fetchRestingCalories(start, end),
      fetchDistanceKm(start, end),
      fetchFlightsClimbed(start, end),
      fetchBloodOxygen(start, end),
      fetchRespiratoryRate(start, end),
    ]);

  return {
    date: dateStr,
    steps,
    heartRateAvg: hr.avg,
    heartRateMin: hr.min,
    heartRateMax: hr.max,
    sleepHours,
    activeCalories,
    restingCalories,
    distanceKm,
    flightsClimbed,
    bloodOxygen,
    respiratoryRate,
  };
}

// ── Public data functions ─────────────────────────────────────────────────

export async function getTodaysSummary(): Promise<DailyHealthSummary> {
  if (!isHealthKitAvailable() || !_permissionsGranted) {
    return getDemoSummary();
  }
  try {
    return await fetchDaySummary(new Date());
  } catch (e) {
    console.warn('[HealthKit] getTodaysSummary failed, using demo:', e);
    return getDemoSummary();
  }
}

export async function getWeeklyData(): Promise<DailyHealthSummary[]> {
  if (!isHealthKitAvailable() || !_permissionsGranted) {
    return generateDemoData();
  }
  try {
    const promises = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return fetchDaySummary(d);
    });
    return await Promise.all(promises);
  } catch (e) {
    console.warn('[HealthKit] getWeeklyData failed, using demo:', e);
    return generateDemoData();
  }
}

export async function getWeeklyTrends(): Promise<WeeklyTrend[]> {
  const data = await getWeeklyData();

  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return { trend: 'stable' as const, changePercent: 0 };
    const mid = Math.floor(values.length / 2);
    const avgFirst = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const avgSecond = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
    const change = ((avgSecond - avgFirst) / avgFirst) * 100;
    return {
      trend: (Math.abs(change) < 3 ? 'stable' : change > 0 ? 'up' : 'down') as 'up' | 'down' | 'stable',
      changePercent: Math.round(change * 10) / 10,
    };
  };

  const keys: { key: keyof DailyHealthSummary; label: string }[] = [
    { key: 'steps', label: 'Steps' },
    { key: 'heartRateAvg', label: 'Heart Rate' },
    { key: 'sleepHours', label: 'Sleep' },
    { key: 'activeCalories', label: 'Active Calories' },
    { key: 'distanceKm', label: 'Distance' },
  ];

  return keys.map(({ key, label }) => {
    const values = data.map((d) => (d[key] as number) ?? 0);
    const { trend, changePercent } = calculateTrend(values);
    return {
      metric: label,
      values: data.map((d) => ({ date: d.date, value: (d[key] as number) ?? 0 })),
      average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      trend,
      changePercent,
    };
  });
}

// ── Supabase sync ─────────────────────────────────────────────────────────
// Call after requestHealthPermissions() succeeds to backfill 7 days.

export async function syncHealthDataToSupabase(userId: string): Promise<void> {
  try {
    const weeklyData = await getWeeklyData();
    const rows = weeklyData.map((d) => ({
      user_id: userId,
      date: d.date,
      steps: d.steps,
      heart_rate_avg: d.heartRateAvg,
      heart_rate_min: d.heartRateMin,
      heart_rate_max: d.heartRateMax,
      sleep_hours: d.sleepHours,
      active_calories: d.activeCalories,
      resting_calories: d.restingCalories,
      distance_km: d.distanceKm,
      flights_climbed: d.flightsClimbed,
      blood_oxygen: d.bloodOxygen,
      respiratory_rate: d.respiratoryRate,
      source: 'apple_health',
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('health_metrics')
      .upsert(rows, { onConflict: 'user_id,date,source' });

    if (error) {
      console.warn('[HealthKit] Supabase sync error:', error.message);
    } else {
      console.log(`[HealthKit] Synced ${rows.length} days to Supabase`);
    }
  } catch (e) {
    console.warn('[HealthKit] syncHealthDataToSupabase failed:', e);
  }
}

// ── Connected services ─────────────────────────────────────────────────────

export function getConnectedServices(): ConnectedService[] {
  return [
    {
      id: 'apple_health',
      name: 'Apple Health',
      icon: 'heart-circle-outline',
      connected: _permissionsGranted,
      lastSync: _permissionsGranted ? new Date().toISOString() : null,
      dataTypes: ['Steps', 'Heart Rate', 'Sleep', 'Blood Oxygen', 'Workouts'],
    },
    {
      id: 'strava',
      name: 'Strava',
      icon: 'bicycle-outline',
      connected: false,
      lastSync: null,
      dataTypes: ['Running', 'Cycling', 'Swimming', 'Workouts'],
    },
    {
      id: 'garmin',
      name: 'Garmin Connect',
      icon: 'watch-outline',
      connected: false,
      lastSync: null,
      dataTypes: ['Steps', 'Heart Rate', 'Sleep', 'Stress', 'Body Battery'],
    },
    {
      id: 'google_fit',
      name: 'Google Fit',
      icon: 'fitness-outline',
      connected: false,
      lastSync: null,
      dataTypes: ['Steps', 'Heart Rate', 'Sleep', 'Workouts'],
    },
  ];
}

// ── Demo data (fallback) ───────────────────────────────────────────────────

function generateDemoData(): DailyHealthSummary[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return getDemoSummaryForDate(date);
  });
}

function getDemoSummaryForDate(date: Date): DailyHealthSummary {
  // Seed random by date so values are stable on re-render
  const seed = date.getDate() + date.getMonth() * 31;
  const rnd = (base: number, variance: number) => base + ((seed * 7919) % variance);

  const baseSteps = rnd(7500, 4000);
  const baseHR = rnd(68, 12);
  const baseSleep = 6.5 + (seed % 20) / 10;

  return {
    date: date.toISOString().split('T')[0],
    steps: Math.round(baseSteps),
    heartRateAvg: Math.round(baseHR),
    heartRateMin: Math.round(baseHR - 14),
    heartRateMax: Math.round(baseHR + 32),
    sleepHours: Math.round(baseSleep * 10) / 10,
    activeCalories: Math.round(250 + (seed % 300)),
    restingCalories: Math.round(1600 + (seed % 200)),
    distanceKm: Math.round((baseSteps * 0.0007) * 10) / 10,
    flightsClimbed: 4 + (seed % 12),
    bloodOxygen: Math.round((96 + (seed % 30) / 10) * 10) / 10,
    respiratoryRate: Math.round((14 + (seed % 40) / 10) * 10) / 10,
  };
}

function getDemoSummary(): DailyHealthSummary {
  return getDemoSummaryForDate(new Date());
}
