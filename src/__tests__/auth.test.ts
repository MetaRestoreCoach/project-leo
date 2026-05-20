// ============================================================
// auth service — unit tests
// ============================================================

// ── Supabase mock (define jest.fn inside factory, not outside) ─
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// ── Minimal Platform mock (avoids loading native RN modules) ─
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (spec: Record<string, unknown>) => spec['web'] ?? spec['default'] },
}));

// ── window.location mock (Platform.OS=web uses window.location.origin) ─
Object.defineProperty(global, 'window', {
  value: { location: { origin: 'http://localhost:8081' } },
  writable: true,
});

// ── expo-web-browser mock ──────────────────────────────────
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

// ── expo-auth-session mock ─────────────────────────────────
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'projectleo://callback'),
}));

// ── Import auth functions after mocks are registered ──────
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, signInWithGoogleFitScopes } from '@/services/auth';

// Access mocked supabase auth methods at runtime (not hoisting time)
const getAuth = () => require('@/services/supabase').supabase.auth;

describe('auth service', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── signInWithGoogle (web) ────────────────────────────
  describe('signInWithGoogle()', () => {
    it('calls supabase.signInWithOAuth with google provider', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
      await signInWithGoogle();
      expect(getAuth().signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'google' }),
      );
    });

    it('passes a redirectTo option', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
      await signInWithGoogle();
      const call = getAuth().signInWithOAuth.mock.calls[0][0];
      expect(call.options?.redirectTo).toBeDefined();
    });

    it('passes prompt: select_account in queryParams', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
      await signInWithGoogle();
      const call = getAuth().signInWithOAuth.mock.calls[0][0];
      expect(call.options?.queryParams?.prompt).toBe('select_account');
    });

    it('throws when supabase returns an error', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: null, error: new Error('OAuth failed') });
      await expect(signInWithGoogle()).rejects.toThrow('OAuth failed');
    });
  });

  // ── signInWithGoogleFitScopes ─────────────────────────
  describe('signInWithGoogleFitScopes()', () => {
    it('calls signInWithOAuth with google provider and fitness scopes', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
      await signInWithGoogleFitScopes();
      const call = getAuth().signInWithOAuth.mock.calls[0][0];
      expect(call.provider).toBe('google');
      expect(call.options?.scopes).toContain('fitness.activity.read');
    });

    it('requests offline access with consent prompt', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
      await signInWithGoogleFitScopes();
      const call = getAuth().signInWithOAuth.mock.calls[0][0];
      expect(call.options?.queryParams?.access_type).toBe('offline');
      expect(call.options?.queryParams?.prompt).toContain('consent');
    });

    it('throws when supabase returns an error', async () => {
      getAuth().signInWithOAuth.mockResolvedValue({ data: null, error: new Error('Fitness OAuth failed') });
      await expect(signInWithGoogleFitScopes()).rejects.toThrow('Fitness OAuth failed');
    });
  });

  // ── signInWithEmail ───────────────────────────────────
  describe('signInWithEmail()', () => {
    it('calls signInWithPassword with correct credentials', async () => {
      getAuth().signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
      await signInWithEmail('user@example.com', 'pass123');
      expect(getAuth().signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'pass123',
      });
    });

    it('returns session data on success', async () => {
      const session = { access_token: 'tok' };
      getAuth().signInWithPassword.mockResolvedValue({ data: { session }, error: null });
      const result = await signInWithEmail('a@b.com', 'pw');
      expect(result.session).toEqual(session);
    });

    it('throws on invalid credentials', async () => {
      getAuth().signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid login credentials') });
      await expect(signInWithEmail('a@b.com', 'wrong')).rejects.toThrow('Invalid login credentials');
    });
  });

  // ── signUpWithEmail ───────────────────────────────────
  describe('signUpWithEmail()', () => {
    it('calls supabase.signUp with email and password', async () => {
      getAuth().signUp.mockResolvedValue({ data: { user: {} }, error: null });
      await signUpWithEmail('new@user.com', 'secret');
      expect(getAuth().signUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@user.com', password: 'secret' }),
      );
    });

    it('returns user data on success', async () => {
      const user = { id: 'user-1' };
      getAuth().signUp.mockResolvedValue({ data: { user }, error: null });
      const result = await signUpWithEmail('new@user.com', 'secret');
      expect(result.user).toEqual(user);
    });

    it('throws when email is already taken', async () => {
      getAuth().signUp.mockResolvedValue({ data: null, error: new Error('User already registered') });
      await expect(signUpWithEmail('existing@user.com', 'pw')).rejects.toThrow('User already registered');
    });
  });

  // ── signOut ───────────────────────────────────────────
  describe('signOut()', () => {
    it('calls supabase.signOut', async () => {
      getAuth().signOut.mockResolvedValue({ error: null });
      await signOut();
      expect(getAuth().signOut).toHaveBeenCalledTimes(1);
    });

    it('throws when supabase.signOut returns an error', async () => {
      getAuth().signOut.mockResolvedValue({ error: new Error('Network error') });
      await expect(signOut()).rejects.toThrow('Network error');
    });
  });
});
