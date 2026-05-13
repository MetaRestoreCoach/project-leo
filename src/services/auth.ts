// ============================================================
// Authentication Service
// ============================================================

import { supabase } from './supabase';
import { Platform } from 'react-native';

// Lazy-load native auth modules only when needed
let WebBrowser: any = null;
let makeRedirectUri: any = null;

function loadAuthModules() {
  if (!WebBrowser) {
    WebBrowser = require('expo-web-browser');
    makeRedirectUri = require('expo-auth-session').makeRedirectUri;
    WebBrowser.maybeCompleteAuthSession();
  }
}

// Initialize on import for web (safe) or defer for native
if (Platform.OS === 'web') {
  // No-op on web - OAuth uses redirects natively
} else {
  loadAuthModules();
}

// -- Email/Password Auth --

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// -- Google OAuth --

export async function signInWithGoogle() {
  if (Platform.OS !== 'web') loadAuthModules();

  // Web: redirect back to the app root — index.tsx detects ?code= and exchanges it.
  // Native: deep-link back into the app, then exchange the code manually.
  const redirectTo = Platform.OS === 'web'
    ? window.location.origin
    : makeRedirectUri({ scheme: 'projectleo' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) throw error;

  // Native: open the OAuth URL in an in-app browser then exchange the PKCE code.
  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    }
  }

  return data;
}

// -- Apple Sign-In --

export async function signInWithApple() {
  loadAuthModules();

  const redirectTo = Platform.OS === 'web'
    ? window.location.origin
    : makeRedirectUri({ scheme: 'projectleo' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) throw error;

  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
    }
  }

  return data;
}

// -- Password Reset --

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// -- Sign Out --

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// -- Session --

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
