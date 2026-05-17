// ============================================================
// useAuthStore — unit tests
// ============================================================

import { act } from '@testing-library/react-native';

// ── Supabase mock ──────────────────────────────────────────
let onAuthStateChangeCallback: ((event: string, session: unknown) => void) | null = null;

const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockExchangeCodeForSession = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb) => {
        onAuthStateChangeCallback = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
      getSession: mockGetSession,
      signOut: mockSignOut,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  },
}));

// ── Profile service mock ───────────────────────────────────
const mockGetProfile = jest.fn();
jest.mock('@/services/profile', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

// ── Import AFTER mocks ─────────────────────────────────────
import { useAuthStore } from '@/hooks/useAuthStore';

// ── Helpers ───────────────────────────────────────────────
const fakeUser = { id: 'user-1', email: 'test@example.com', user_metadata: { full_name: 'Test User' } };
const fakeSession = { user: fakeUser, access_token: 'token-abc' };
const fakeProfile = { id: 'user-1', full_name: 'Test User', email: 'test@example.com', avatar_url: null };

function resetStore() {
  useAuthStore.setState({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    isInitialized: false,
  });
  onAuthStateChangeCallback = null;
  jest.clearAllMocks();
}

// ──────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(resetStore);

  // ── initialize ──────────────────────────────────────────
  describe('initialize()', () => {
    it('sets isInitialized after first auth event with no session', async () => {
      await act(async () => {
        useAuthStore.getState().initialize();
        onAuthStateChangeCallback?.('INITIAL_SESSION', null);
      });

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });

    it('sets session and user when INITIAL_SESSION fires with a session', async () => {
      mockGetProfile.mockResolvedValue(fakeProfile);

      await act(async () => {
        useAuthStore.getState().initialize();
        onAuthStateChangeCallback?.('INITIAL_SESSION', fakeSession);
      });

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.session).toBe(fakeSession);
      expect(state.user).toBe(fakeUser);
    });

    it('fetches profile after session is set', async () => {
      mockGetProfile.mockResolvedValue(fakeProfile);

      await act(async () => {
        useAuthStore.getState().initialize();
        onAuthStateChangeCallback?.('SIGNED_IN', fakeSession);
        // wait for async profile fetch
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockGetProfile).toHaveBeenCalledWith(fakeUser.id);
      expect(useAuthStore.getState().profile).toEqual(fakeProfile);
    });

    it('does not crash when profile fetch fails', async () => {
      mockGetProfile.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        useAuthStore.getState().initialize();
        onAuthStateChangeCallback?.('SIGNED_IN', fakeSession);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Should still be initialized with session, just no profile
      expect(useAuthStore.getState().isInitialized).toBe(true);
      expect(useAuthStore.getState().session).toBe(fakeSession);
      expect(useAuthStore.getState().profile).toBeNull();
    });

    it('does not re-fetch profile when same user fires another event', async () => {
      mockGetProfile.mockResolvedValue(fakeProfile);

      await act(async () => {
        useAuthStore.getState().initialize();
        onAuthStateChangeCallback?.('SIGNED_IN', fakeSession);
        await Promise.resolve();
        await Promise.resolve();
      });

      // Second event with same user
      mockGetProfile.mockClear();
      await act(async () => {
        onAuthStateChangeCallback?.('TOKEN_REFRESHED', fakeSession);
        await Promise.resolve();
      });

      // profile already set, same user — should NOT re-fetch
      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  // ── setSession ──────────────────────────────────────────
  describe('setSession()', () => {
    it('updates session and user', () => {
      useAuthStore.getState().setSession(fakeSession as any);
      expect(useAuthStore.getState().session).toBe(fakeSession);
      expect(useAuthStore.getState().user).toBe(fakeUser);
    });

    it('clears user when session is null', () => {
      useAuthStore.setState({ session: fakeSession as any, user: fakeUser as any });
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // ── refreshProfile ─────────────────────────────────────
  describe('refreshProfile()', () => {
    it('fetches and stores profile for current user', async () => {
      useAuthStore.setState({ user: fakeUser as any });
      mockGetProfile.mockResolvedValue(fakeProfile);

      await act(async () => {
        await useAuthStore.getState().refreshProfile();
      });

      expect(mockGetProfile).toHaveBeenCalledWith(fakeUser.id);
      expect(useAuthStore.getState().profile).toEqual(fakeProfile);
    });

    it('does nothing when no user is set', async () => {
      await act(async () => {
        await useAuthStore.getState().refreshProfile();
      });
      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  // ── signOut ─────────────────────────────────────────────
  describe('signOut()', () => {
    it('clears all auth state', async () => {
      useAuthStore.setState({ session: fakeSession as any, user: fakeUser as any, profile: fakeProfile as any });
      mockSignOut.mockResolvedValue({});

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
    });

    it('still clears state even if supabase.signOut throws', async () => {
      useAuthStore.setState({ session: fakeSession as any, user: fakeUser as any });
      mockSignOut.mockRejectedValue(new Error('network'));

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      expect(useAuthStore.getState().session).toBeNull();
    });
  });
});
