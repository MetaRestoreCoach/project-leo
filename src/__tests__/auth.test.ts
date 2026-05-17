// ============================================================
// auth service — unit tests
// ============================================================

// ── Supabase mock ──────────────────────────────────────────
const mockSignInWithOAuth = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUpEmail = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUpEmail,
      signOut: mockSignOut,
    },
  },
}));

// ── Platform mock (web by default) ────────────────────────
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return { ...rn, Platform: { ...rn.Platform, OS: 'web' } };
});

// ── expo-web-browser mock ──────────────────────────────────
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

// ── expo-auth-session mock ─────────────────────────────────
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'myapp://callback'),
}));

import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } from '@/services/auth';

describe('auth service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── signInWithGoogle (web) ────────────────────────────
  describe('signInWithGoogle()', () => {
    it('calls supabase.signInWithOAuth with google provider on web', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
      await signInWithGoogle();
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      );
    });

    it('passes redirectTo on web', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
      await signInWithGoogle();
      const call = mockSignInWithOAuth.mock.calls[0][0];
      expect(call.options?.redirectTo).toBeDefined();
    });

    it('returns error from supabase', async () => {
      const err = new Error('OAuth failed');
      mockSignInWithOAuth.mockResolvedValue({ data: null, error: err });
      const result = await signInWithGoogle();
      expect(result?.error).toBe(err);
    });
  });

  // ── signInWithEmail ───────────────────────────────────
  describe('signInWithEmail()', () => {
    it('calls signInWithPassword with correct credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
      await signInWithEmail('user@example.com', 'pass123');
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'pass123',
      });
    });

    it('returns session on success', async () => {
      const session = { access_token: 'tok' };
      mockSignInWithPassword.mockResolvedValue({ data: { session }, error: null });
      const result = await signInWithEmail('a@b.com', 'pw');
      expect(result?.data?.session).toEqual(session);
    });

    it('returns error on bad credentials', async () => {
      const err = { message: 'Invalid login credentials' };
      mockSignInWithPassword.mockResolvedValue({ data: null, error: err });
      const result = await signInWithEmail('a@b.com', 'wrong');
      expect(result?.error).toEqual(err);
    });
  });

  // ── signUpWithEmail ───────────────────────────────────
  describe('signUpWithEmail()', () => {
    it('calls supabase.signUp with email and password', async () => {
      mockSignUpEmail.mockResolvedValue({ data: { user: {} }, error: null });
      await signUpWithEmail('new@user.com', 'secret', 'New User');
      expect(mockSignUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@user.com', password: 'secret' }),
      );
    });

    it('includes full_name in user_metadata', async () => {
      mockSignUpEmail.mockResolvedValue({ data: { user: {} }, error: null });
      await signUpWithEmail('new@user.com', 'secret', 'New User');
      const call = mockSignUpEmail.mock.calls[0][0];
      expect(call.options?.data?.full_name).toBe('New User');
    });

    it('returns error when email already taken', async () => {
      const err = { message: 'User already registered' };
      mockSignUpEmail.mockResolvedValue({ data: null, error: err });
      const result = await signUpWithEmail('existing@user.com', 'pw', 'Existing');
      expect(result?.error).toEqual(err);
    });
  });

  // ── signOut ───────────────────────────────────────────
  describe('signOut()', () => {
    it('calls supabase.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await signOut();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
