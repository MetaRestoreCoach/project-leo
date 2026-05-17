// ============================================================
// app/index.tsx — routing logic tests
// ============================================================
// We test the three routing paths:
//   1. No ?code param, no session → navigate to login
//   2. No ?code param, has session → navigate to dashboard
//   3. ?code param present → exchangeCodeForSession → replace to /dashboard

import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';

// ── Router mock ───────────────────────────────────────────
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// ── Supabase mock ──────────────────────────────────────────
const mockExchangeCodeForSession = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getSession: mockGetSession,
    },
  },
}));

// ── Auth store mock ────────────────────────────────────────
let mockSession: unknown = null;
let mockIsInitialized = false;

jest.mock('@/hooks/useAuthStore', () => ({
  useAuthStore: () => ({
    session: mockSession,
    isInitialized: mockIsInitialized,
  }),
  // Allow the safety-net effect to call getState()
  __esModule: true,
}));

// ── Platform mock (web) ────────────────────────────────────
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return { ...rn, Platform: { ...rn.Platform, OS: 'web' } };
});

// ── window.location helpers ────────────────────────────────
const originalLocation = window.location;

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, search, replace: jest.fn() },
  });
}

afterEach(() => {
  Object.defineProperty(window, 'location', { writable: true, value: originalLocation });
  jest.clearAllMocks();
  jest.useRealTimers();
  mockSession = null;
  mockIsInitialized = false;
});

// ── Dynamic import so mocks are applied before module load ─
async function renderIndex() {
  jest.resetModules();
  const { default: Index } = await import('../../app/index');
  return render(<Index />);
}

// ──────────────────────────────────────────────────────────

describe('app/index.tsx routing', () => {
  // ── Path 1: normal flow, no session ──────────────────
  it('redirects to login when initialized with no session', async () => {
    jest.useFakeTimers();
    setSearch(''); // no ?code
    mockIsInitialized = true;
    mockSession = null;

    await renderIndex();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  // ── Path 2: normal flow, has session ─────────────────
  it('redirects to dashboard when initialized with a session', async () => {
    jest.useFakeTimers();
    setSearch('');
    mockIsInitialized = true;
    mockSession = { access_token: 'tok' };

    await renderIndex();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard');
  });

  // ── Path 3: OAuth callback with valid code ────────────
  it('exchanges code and replaces to /dashboard on success', async () => {
    setSearch('?code=abc123');
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    });

    await renderIndex();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(window.location.replace).toHaveBeenCalledWith('/dashboard');
  });

  // ── Path 3b: OAuth code already used (page refresh) ──
  it('falls back to getSession() when exchange fails on page refresh', async () => {
    setSearch('?code=used-code');
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'code already used' },
    });
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'existing' } } });

    await renderIndex();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGetSession).toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith('/dashboard');
  });

  // ── Path 3c: OAuth completely fails, no existing session ─
  it('redirects to login after 3s when OAuth fails and no session exists', async () => {
    jest.useFakeTimers();
    setSearch('?code=bad-code');
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid code' },
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await renderIndex();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(3500);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  // ── OAuth error param ─────────────────────────────────
  it('shows error message when OAuth returns error param', async () => {
    setSearch('?error=access_denied&error_description=User+denied+access');

    const { getByText } = await renderIndex();

    await waitFor(() => {
      expect(getByText(/OAuth error/i)).toBeTruthy();
    });
    // Should NOT attempt code exchange
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  // ── Safety net ────────────────────────────────────────
  it('forces navigation to login after 8s if auth never initializes', async () => {
    jest.useFakeTimers();
    setSearch('');
    mockIsInitialized = false;

    // Mock getState to return not initialized
    const { useAuthStore } = require('@/hooks/useAuthStore');
    if (useAuthStore.getState) {
      useAuthStore.getState = () => ({ isInitialized: false });
    }

    await renderIndex();

    await act(async () => {
      jest.advanceTimersByTime(8500);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
