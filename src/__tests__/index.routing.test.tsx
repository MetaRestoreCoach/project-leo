// ============================================================
// app/index.tsx — routing logic tests
//
// index.tsx reads auth store state and routes:
//   • not initialized → show spinner (no navigation)
//   • initialized + no session → /(auth)/login
//   • initialized + session + profile.onboarding_completed → /(tabs)/dashboard
//   • initialized + session + !onboarding_completed → /onboarding/welcome
//   • initialized + session + google_fit_pending in localStorage → /(tabs)/dashboard
//   • initialized + session + onboarding_gfit_pending → /onboarding/welcome
//   • safety net: not initialized after 10s → /(auth)/login
// ============================================================

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Platform } from 'react-native';

// ── Router mock ───────────────────────────────────────────
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// ── Supabase mock (prevents WebSocket init if any transitive import hits it) ─
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// ── Auth store mock — state driven by test-local variables ─
let mockSession: unknown = null;
let mockIsInitialized = false;
let mockProfileFetched = false;
let mockProfile: unknown = null;

jest.mock('@/hooks/useAuthStore', () => {
  const useAuthStore = (selector?: (s: any) => any) => {
    const state = {
      session: mockSession,
      isInitialized: mockIsInitialized,
      profileFetched: mockProfileFetched,
      profile: mockProfile,
    };
    return selector ? selector(state) : state;
  };
  useAuthStore.getState = () => ({ isInitialized: mockIsInitialized });
  return { useAuthStore, __esModule: true };
});

// ── Import component AFTER mocks ──────────────────────────
import Index from '../../app/index';

// ──────────────────────────────────────────────────────────

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  mockSession = null;
  mockIsInitialized = false;
  mockProfileFetched = false;
  mockProfile = null;
});

describe('app/index.tsx routing', () => {
  // ── Not initialized → spinner, no navigation ──────────
  it('does not navigate while auth is not initialized', async () => {
    jest.useFakeTimers();
    mockIsInitialized = false;

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  // ── No session → login ───────────────────────────────
  it('redirects to login when initialized with no session', async () => {
    jest.useFakeTimers();
    mockIsInitialized = true;
    mockProfileFetched = true;
    mockSession = null;

    render(<Index />);

    await act(async () => { jest.advanceTimersByTime(500); });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  // ── Session + completed profile → dashboard ───────────
  it('redirects to dashboard when session and onboarding are complete', async () => {
    jest.useFakeTimers();
    mockIsInitialized = true;
    mockProfileFetched = true;
    mockSession = { access_token: 'tok' };
    mockProfile = { onboarding_completed: true };

    render(<Index />);

    await act(async () => { jest.advanceTimersByTime(500); });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
  });

  // ── Session + incomplete profile → onboarding welcome ─
  it('redirects to onboarding when profile is not complete', async () => {
    jest.useFakeTimers();
    mockIsInitialized = true;
    mockProfileFetched = true;
    mockSession = { access_token: 'tok' };
    mockProfile = { onboarding_completed: false };

    render(<Index />);

    await act(async () => { jest.advanceTimersByTime(500); });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
  });

  // ── Session + no profile → onboarding welcome ────────
  it('redirects to onboarding when session exists but no profile', async () => {
    jest.useFakeTimers();
    mockIsInitialized = true;
    mockProfileFetched = true;
    mockSession = { access_token: 'tok' };
    mockProfile = null;

    render(<Index />);

    await act(async () => { jest.advanceTimersByTime(500); });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding/welcome');
  });

  // ── Safety net ────────────────────────────────────────
  it('forces navigation to login after 10s if auth never initializes', async () => {
    jest.useFakeTimers();
    mockIsInitialized = false;

    render(<Index />);

    await act(async () => {
      jest.advanceTimersByTime(11000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  // ── Google Fit OAuth return ───────────────────────────
  describe('google_fit_pending localStorage flag', () => {
    const originalOS = Platform.OS;
    const localStorageItems: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => localStorageItems[key] ?? null,
      setItem: (key: string, value: string) => { localStorageItems[key] = value; },
      removeItem: (key: string) => { delete localStorageItems[key]; },
      clear: () => { Object.keys(localStorageItems).forEach((k) => delete localStorageItems[k]); },
    };

    beforeEach(() => {
      (Platform as any).OS = 'web';
      Object.defineProperty(global.window, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
      mockLocalStorage.clear();
    });

    afterEach(() => {
      (Platform as any).OS = originalOS;
      mockLocalStorage.clear();
    });

    it('routes to dashboard when returning from Google Fit OAuth even with null profile', async () => {
      jest.useFakeTimers();
      mockIsInitialized = true;
      mockProfileFetched = true;
      mockSession = { access_token: 'tok' };
      mockProfile = null; // profile fetch failed/timed out
      mockLocalStorage.setItem('google_fit_pending', '1');

      render(<Index />);
      await act(async () => { jest.advanceTimersByTime(500); });

      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
    });

    it('routes to login when flag is set but there is no session', async () => {
      jest.useFakeTimers();
      mockIsInitialized = true;
      mockProfileFetched = true;
      mockSession = null;
      mockLocalStorage.setItem('google_fit_pending', '1');

      render(<Index />);
      await act(async () => { jest.advanceTimersByTime(500); });

      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
