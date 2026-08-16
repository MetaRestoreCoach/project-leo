// ============================================================
// Strava Integration Service (client-side)
// ============================================================
// OAuth URL construction and Edge Function calls only.
// The client_secret NEVER lives here — all sensitive operations
// go through the strava-token-exchange / fetch-strava-data
// Supabase Edge Functions.
// ============================================================

import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { DailyHealthSummary } from './appleHealth';

// Public Strava client ID — safe to expose in client code
const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '';

// Scopes we request from Strava
const STRAVA_SCOPE = 'read,activity:read_all';

// localStorage keys used to coordinate the OAuth redirect flow (web only)
export const STRAVA_PENDING_KEY = 'strava_pending';
export const STRAVA_CODE_KEY = 'strava_pending_code';

// ── OAuth helpers ─────────────────────────────────────────────

/**
 * Builds the Strava OAuth authorization URL.
 * Sets state='strava_oauth' so the auth store can identify
 * the callback and avoid passing the Strava code to Supabase.
 */
export function buildStravaOAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: STRAVA_SCOPE,
    state: 'strava_oauth',
    approval_prompt: 'auto', // 'force' to always show consent screen
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Returns the redirect URI for the current web environment.
 * Strava redirects back to this URL after the user approves.
 */
export function getWebRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const { hostname, port, protocol } = window.location;
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
  // Dev: use actual running port (Expo uses 8081 by default, not 8083)
  return isDev
    ? `${protocol}//${hostname}${port ? `:${port}` : ''}`
    : window.location.origin;
}

/**
 * Returns the deep-link redirect URI for native (iOS / Android).
 * Strava must have this scheme registered in the API app settings.
 * Uses lazy import to avoid importing expo-auth-session on web.
 */
export async function getNativeRedirectUri(): Promise<string> {
  const { makeRedirectUri } = await import('expo-auth-session');
  return makeRedirectUri({ scheme: 'projectleo', path: 'strava-callback' });
}

// ── Edge Function calls ───────────────────────────────────────

/**
 * Exchange a Strava authorization code for tokens.
 * Sends the code to the strava-token-exchange Edge Function,
 * which calls Strava's token endpoint using the server-side secret
 * and stores the tokens in user_integrations.
 */
export async function exchangeStravaCode(code: string): Promise<{
  athlete_id: number;
  athlete_name: string;
}> {
  const { data, error } = await supabase.functions.invoke('strava-token-exchange', {
    body: { code },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Token exchange failed');

  return { athlete_id: data.athlete_id, athlete_name: data.athlete_name };
}

/**
 * Fetch today's (or a given date's) Strava activity summary.
 * The Edge Function handles token refresh automatically.
 * Returns a DailyHealthSummary-compatible object or null on failure.
 */
export async function fetchStravaSummary(
  date?: string,
): Promise<(DailyHealthSummary & { workoutCount?: number; workoutDurationMin?: number; source?: string }) | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-strava-data', {
      body: { date },
    });
    if (error) {
      console.warn('[Strava] fetchStravaSummary edge error:', error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.warn('[Strava] fetchStravaSummary exception:', e);
    return null;
  }
}

// ── Connection status ─────────────────────────────────────────

/**
 * Check if the current user has Strava connected (token row exists in DB).
 * Uses RLS — only returns true if the authenticated user has an entry.
 */
export async function isStravaConnected(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('provider', 'strava')
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Disconnect Strava — deletes the token row from user_integrations.
 * After this call, isStravaConnected() returns false.
 */
export async function disconnectStrava(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', session.user.id)
    .eq('provider', 'strava');
}

// ── Native OAuth launcher ─────────────────────────────────────

/**
 * Full native Strava OAuth flow using expo-web-browser.
 * Opens Strava in an in-app browser, waits for the redirect,
 * extracts the code, and calls exchangeStravaCode.
 * Returns athlete info on success, null if user cancelled.
 */
export async function connectStravaNative(): Promise<{
  athlete_id: number;
  athlete_name: string;
} | null> {
  if (Platform.OS === 'web') {
    throw new Error('connectStravaNative is for iOS/Android only. Use the web flow instead.');
  }

  const { default: WebBrowser } = await import('expo-web-browser');
  const redirectUri = await getNativeRedirectUri();
  const oauthUrl = buildStravaOAuthUrl(redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    // User cancelled or browser closed without success
    return null;
  }

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    throw new Error(error === 'access_denied' ? 'Strava access was denied.' : `Strava error: ${error}`);
  }

  return exchangeStravaCode(code);
}
