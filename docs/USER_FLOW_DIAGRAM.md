# Project LEO — User Flow Diagram

## Quick Overview

```
                    ┌─── App Root (index.tsx) ───┐
                    │                             │
                    │ Checks auth + onboarding   │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              No Session            Session Exists
                    │                     │
                    │        ┌────────────┴────────────┐
                    │        │                         │
                    │    onboarding_completed?    Returning from
                    │        │         │            Fit OAuth?
                    │       NO        YES              │
                    │        │         │              YES
                    ▼        ▼         ▼               ▼
              /login    /onboarding  /dashboard   /onboarding/welcome
                        /welcome
```

---

## NEW USER FLOW (Detailed)

```
START
  ↓
┌─────────────────────────────┐
│   /(auth)/login             │
│                             │
│ • Email/Password Form       │
│ • Continue with Google      │
│ • Continue with Apple       │
│ • Forgot Password link      │
│ • Sign Up link              │
└────────┬────────────────────┘
         │
    [User Signs Up or Logs In]
         │
    ┌────┴────────────────────────┐
    │                             │
    │ Email/Password          OAuth (Google/Apple)
    │    │                           │
    │    ▼                           ▼
    │ /(auth)/signup      Browser redirects to provider
    │ • Full name              │
    │ • Email             User approves scopes
    │ • Password               │
    │ [Create Account]         ▼
    │    │              Returns to app with code
    │    │                     │
    └────┴─────────────────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │ Supabase Auth               │
    │ • Code exchanged            │
    │ • Session created           │
    │ • Profile fetched           │
    └────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ index.tsx routing logic     │
    │ onboarding_completed = NO   │
    └────────┬────────────────────┘
             │
             ▼
    ┌──────────────────────────────────┐
    │ /onboarding/welcome              │
    │ (Welcome Hub)                    │
    │                                  │
    │ ┌──────────────────────────────┐ │
    │ │ [OPTIONAL]                   │ │
    │ │ Connect Health Data          │ │
    │ │ • Apple Health (iOS)         │ │
    │ │ • Google Fit (Web/Android)   │ │
    │ │ [Connect] [Skip for now →]   │ │
    │ └──────────────────────────────┘ │
    │                                  │
    │ ┌──────────────────────────────┐ │
    │ │ [REQUIRED]                   │ │
    │ │ Set Up Your Profile          │ │
    │ │ [Start Profile Setup]        │ │
    │ └──────────────────────────────┘ │
    └────────┬─────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
[Connect Fit]  [Start Setup]
      │             │
      ▼             ▼
Google OAuth   /onboarding/step1
Redirect       (About You)
      │        • Full Name
      │        • Age
      │        • Gender (chips)
      │        • Height (cm)
      │        • Weight (kg)
      │             │
      │             ▼
      │        /onboarding/step2
      │        (Health Conditions)
      │        • Type 2 Diabetes
      │        • Prediabetes
      │        • Hypertension
      │        • High Cholesterol
      │        • Obesity
      │        • Heart Disease
      │        • None
      │             │
      │             ▼
      │        /onboarding/step3
      │        (Your Goals)
      │        • Reverse Diabetes
      │        • Lower BP
      │        • Lower Cholesterol
      │        • Lose Weight
      │        • Improve Energy
      │        • Better Sleep
      │        • Eat Healthier
      │        • Build Strength
      │             │
      │             ▼
      │        /onboarding/step4
      │        (Preferences)
      │        • Diet preferences
      │        • Activity level
      │        (Sedentary to Very Active)
      │        [Complete Setup]
      │        → Saves profile
      │        → Sets onboarding_completed = true
      │             │
      └─────────────┤
                    ▼
        ┌───────────────────────────┐
        │ /(tabs)/dashboard         │
        │                           │
        │ User is now onboarded ✓   │
        │ Can access all features   │
        └───────────────────────────┘
```

---

## EXISTING USER FLOW (Simplified)

```
START
  ↓
┌─────────────────┐
│ /(auth)/login   │
│ [Sign In]       │
└────────┬────────┘
         │
    Supabase auth
    (code exchange,
     session created,
     profile fetched)
         │
         ▼
    index.tsx checks:
    • session = YES ✓
    • onboarding_completed = YES ✓
         │
         ▼
    ┌──────────────────────────┐
    │ /(tabs)/dashboard        │
    │                          │
    │ • Health metrics         │
    │ • Goals progress         │
    │ • AI coaching summary    │
    │ • Today's meals          │
    │                          │
    │ [Tab Navigation]         │
    │ Dashboard | Log |        │
    │ Coaching | Profile       │
    └──────────────────────────┘
```

---

## ROUTE GUARD LOGIC (index.tsx - The Decision Tree)

```typescript
// Wait for auth to initialize
if (!isInitialized || !profileFetched) {
  return <LoadingSpinner />
}

// Now make routing decision
if (session) {
  // User is logged in
  
  if (isOnboardingGfitReturn) {
    // Returning from Google Fit OAuth during onboarding
    router.replace('/onboarding/welcome')
  } 
  else if (isGfitReturn || profile?.onboarding_completed) {
    // Existing user OR returning from Fit OAuth on dashboard
    router.replace('/(tabs)/dashboard')  ← EXISTING USER
  } 
  else {
    // New user - hasn't completed onboarding yet
    router.replace('/onboarding/welcome')  ← NEW USER
  }
} 
else {
  // No session - not authenticated
  router.replace('/(auth)/login')  ← NOT LOGGED IN
}
```

---

## Screen Map

### Authentication Flow
```
/(auth)/
├── login.tsx              ← Email/password + OAuth (Google, Apple)
├── signup.tsx             ← Create account (name, email, password)
└── forgot-password.tsx    ← Password reset flow
```

### Onboarding Flow (New Users Only)
```
/onboarding/
├── welcome.tsx            ← Hub: connect health data (opt) + start profile setup
├── step1.tsx              ← About You (biometrics)
├── step2.tsx              ← Health Conditions (multi-select)
├── step3.tsx              ← Your Goals (multi-select)
├── step4.tsx              ← Preferences (diet, activity) - completes onboarding
└── flow.tsx               ← Form state management
```

### Main App (Existing & New Users After Onboarding)
```
/(tabs)/
├── _layout.tsx            ← Tab navigation structure
├── dashboard.tsx          ← Home (health score, metrics, coaching, meals)
├── log.tsx                ← Data entry (meals, metrics, labs)
├── coaching.tsx           ← AI coaching recommendations
└── profile.tsx            ← User profile, edit, sign out
```

### Route Guards
```
/
├── index.tsx              ← Main route guard (auth + onboarding check)
└── auth-callback.tsx      ← OAuth redirect handler (re-exports index)
```

---

## Google Fit OAuth Special Cases

### Case 1: Connecting during Onboarding
```
User on /onboarding/welcome
    ↓
Clicks [Connect] for Google Fit
    ↓
signInWithGoogleFitScopes() called
    ↓
Sets localStorage: onboarding_gfit_pending = 1
    ↓
Browser redirects to Google OAuth
    ↓
User approves fitness scopes
    ↓
Browser redirects: app/?code=xyz
    ↓
index.tsx detects onboarding_gfit_pending flag
    ↓
Routes to /onboarding/welcome
    ↓
Shows "Connected!" badge on Google Fit card
```

### Case 2: Connecting from Dashboard
```
User on /(tabs)/dashboard
    ↓
Clicks "Connect Google Fit"
    ↓
signInWithGoogleFitScopes() called
    ↓
Sets localStorage: google_fit_pending = 1
    ↓
Browser redirects to Google OAuth
    ↓
User approves fitness scopes
    ↓
Browser redirects: app/?code=xyz
    ↓
index.tsx detects google_fit_pending (no onboarding flag)
    ↓
Routes to /(tabs)/dashboard
    ↓
Fetches Google Fit data → updates health metrics
```

---

## Key State Checks

| State | Value | Result |
|-------|-------|--------|
| `session` | null | → `/(auth)/login` |
| `session` | ✓ + `onboarding_completed` | ✓ | → `/(tabs)/dashboard` |
| `session` | ✓ + `onboarding_completed` | ✗ | → `/onboarding/welcome` |
| `isInitialized` | ✗ | → Loading spinner |
| `profileFetched` | ✗ | → Loading spinner |
| `isOnboardingGfitReturn` | ✓ | → `/onboarding/welcome` (override dashboard) |
| `isGfitReturn` | ✓ | → `/(tabs)/dashboard` (+ fetch Fit data) |

---

## Data Flow Summary

```
Login/Signup
    ↓
OAuth or Email/Password
    ↓
Code Exchange (PKCE)
    ↓
Session Created
    ↓
Profile Fetched from Supabase
    ↓
Check: onboarding_completed?
    ├─ NO  → /onboarding/welcome (4-step wizard)
    │        ↓
    │   Complete Step 4
    │        ↓
    │   Save profile, set onboarding_completed = true
    │        ↓
    └─ YES → /(tabs)/dashboard  ✓ READY TO USE
```
