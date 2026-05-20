# Onboarding Feature — Implementation Reference

**Last updated:** 2026-05-20

---

## 1. Overview

New users are routed through a two-part onboarding sequence immediately after their first sign-in:

| Part | Route | Required? | What it does |
|------|-------|-----------|--------------|
| Welcome hub | `/onboarding/welcome` | Entry point | Presents health data connect (optional) and profile setup CTA (mandatory) |
| Profile wizard | `/onboarding/step1–4` | Mandatory | Collects biometrics, conditions, goals, preferences — writes to `profiles` table and sets `onboarding_completed = true` |

Once `onboarding_completed = true` the user is always routed directly to `/dashboard` on subsequent logins.

---

## 2. Route Flow

```
index.tsx (route guard)
    │
    ├── session + onboarding_completed ──► /(tabs)/dashboard
    ├── session + onboarding_gfit_pending ──► /onboarding/welcome  (Google Fit OAuth return during onboarding)
    ├── session + !onboarding_completed ──► /onboarding/welcome
    └── no session ──► /(auth)/login

/onboarding/welcome
    ├── [Optional] Connect Health Data
    │     • Apple Health — requestHealthPermissions() (iOS native)
    │     • Google Fit — signInWithGoogleFitScopes() + onboarding_gfit_pending flag (web)
    │     • "Skip for now →" link
    └── [Required] "Start Profile Setup" → /onboarding/step1

/onboarding/step1  →  step2  →  step3  →  step4
                                            │
                                      completeOnboarding()
                                      sets onboarding_completed = true
                                            │
                                      /(tabs)/dashboard
```

---

## 3. File Map

```
app/onboarding/
├── welcome.tsx          Hub screen (connect + profile setup CTA)
├── step1.tsx            About You (name, age, gender, height, weight)
├── step2.tsx            Health Conditions (multi-select chips)
├── step3.tsx            Goals (multi-select chips)
├── step4.tsx            Preferences (diet + activity) — saves profile
└── _layout.tsx          Stack navigator; registers all 5 screens

src/components/onboarding/
├── OnboardingShell.tsx  Progress bar + Next/Back button wrapper
├── ChipSelector.tsx     Multi-select chip grid (used in step2/3/4)
├── OnboardingQuestion.tsx  Renders a question by type (textarea / multitext / select / pills)
├── OnboardingFlow.tsx   Orchestrator for the MI-aligned wellness flow (see §6)
└── WellnessWheel.tsx    Interactive SVG radar chart + sliders

src/config/
└── onboardingConfig.ts  Step definitions, WellnessWheel config, AnyStep union type

src/services/
├── onboardingService.ts Validation, config merge, UserPreferences builder, service factory
└── profile.ts           completeOnboarding() — upserts profile + sets onboarding_completed

src/utils/
└── wheelCalculations.ts SVG geometry helpers, score-to-radius, MI prompt builder

src/__tests__/onboarding/
├── onboardingConfig.test.ts   13 schema integrity tests
├── wheelCalculations.test.ts  25 geometry + scoring tests
└── onboardingService.test.ts  25 validation + service tests
```

---

## 4. Database

Completion state is stored in the `profiles` table (Supabase PostgreSQL):

```sql
-- profiles table (from 001_initial_schema.sql)
onboarding_completed  boolean  default false

-- Set to true by completeOnboarding() in src/services/profile.ts
-- Read by index.tsx route guard via useAuthStore → profile.onboarding_completed
```

Wellness wheel scores and onboarding responses are stored separately in:

```sql
-- 002_onboarding_tables.sql
public.onboarding_config    -- remote config override (optional; falls back to DEFAULT_ONBOARDING_CONFIG)
public.user_preferences     -- uid, data jsonb, updated_at
```

RLS: `user_preferences` is owner-only read/write. `onboarding_config` is public read.

---

## 5. Profile Wizard Steps (step1–4)

State is held in `useOnboardingStore` (Zustand). `completeOnboarding()` is called on step4 submit.

| Step | Route | Required? | Fields |
|------|-------|-----------|--------|
| 1 | `step1` | name + age required | Full name (pre-filled from Google metadata), age, gender chips, height (cm), weight (kg) |
| 2 | `step2` | at least 1 condition | Health conditions multi-select chips |
| 3 | `step3` | at least 1 goal | Goals multi-select chips |
| 4 | `step4` | activity + 1 diet pref | Dietary preference chips + activity level radio |

---

## 6. MI-Aligned Wellness Flow (OnboardingFlow + WellnessWheel)

An alternative onboarding path using motivational-interviewing (MI) aligned questions and an interactive Wellness Wheel. Accessed via `/onboarding/flow` (wired in `app/onboarding/_layout.tsx`).

### Step types

| Type | `STEP_TYPES` value | Description |
|------|--------------------|-------------|
| `textarea` | `'textarea'` | Single free-text area |
| `multitext` | `'multitext'` | Multiple text inputs (add/remove rows) |
| `select` | `'select'` | Single-select list |
| `pills` | `'pills'` | Chip grid — single or multi-select, optional "Other" free text |
| `group` | `'group'` | Groups multiple sub-questions on one screen |

### WellnessWheel

- 11 life-area segments rendered as an SVG radar chart
- Scale: **1–10** (min 1, max 10, default 5)
- User adjusts scores via sliders (height 44 px for easy dragging)
- Top N lowest-scoring areas become `focusAreas` fed to the coaching engine
- `miPromptTemplate` surfaces the two lowest areas as reflection prompts (`{area1}`, `{area2}`)

### Config (`src/config/onboardingConfig.ts`)

```ts
export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  schemaVersion: '1.0.0',
  steps: [
    // GroupStep or QuestionStep (type: 'group' | 'pills' | 'select' | ...)
  ],
  wellnessWheel: {
    scale: { min: 1, max: 10 },
    defaultScore: 5,
    segments: [ /* 11 segments with id, label, shortLabel, color */ ],
    miPromptTemplate: '...',   // must contain {area1} and {area2}
    focusAreaCount: 3,
    reassessmentDays: 30,
  },
};
```

Remote config override: `onboarding_config` Supabase table — rows fully replace the default when present.

### UserPreferences (output)

```ts
{
  uid: string,
  onboardingVersion: string,      // schemaVersion
  completedAt: string,            // ISO 8601
  responses: Record<string, string | string[]>,
  wellnessScores: {
    scores: Record<string, number>,  // 1–10 per segment
    assessedAt: string,
    nextAssessmentDue: string,       // assessedAt + reassessmentDays
  },
  focusAreas: string[],             // top-N lowest segment ids
}
```

---

## 7. Auth + Routing — Key Implementation Notes

### PKCE race condition fix (`useAuthStore.initialize`)

On web, Supabase's `detectSessionInUrl` is lazy. Without intervention, `INITIAL_SESSION: null` fires before the `?code=` is exchanged, routing the user back to login.

Fix: `initialize()` checks for `?code=` in the URL and calls `supabase.auth.exchangeCodeForSession(window.location.href)` before registering `onAuthStateChange`. This ensures `INITIAL_SESSION` always carries the real session on OAuth return.

```ts
// src/hooks/useAuthStore.ts — initialize()
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(window.location.href);
  }
}
supabase.auth.onAuthStateChange(async (event, newSession) => { ... });
```

### Google Fit OAuth during onboarding

`welcome.tsx` sets `localStorage.setItem('onboarding_gfit_pending', '1')` before calling `signInWithGoogleFitScopes()`. On return, `index.tsx` detects this flag and routes to `/onboarding/welcome` (not dashboard).

### Redirect URLs (required setup)

Register these in **Supabase → Authentication → URL Configuration → Redirect URLs** AND in **Google Cloud Console → OAuth 2.0 credentials → Authorized redirect URIs**:

```
https://project-leo-virid.vercel.app
http://localhost:8082
http://localhost:8081
http://localhost:19006
```

Failure to register a URL causes Supabase to fall back to the Site URL, redirecting the user to production instead of localhost.

---

## 8. Re-assessment (30-day Wellness Wheel check-in)

```ts
const due = new Date(prefs.wellnessScores.nextAssessmentDue);
if (new Date() >= due) {
  // Show WellnessWheel in re-assessment mode
  // On save: update wellnessScores + focusAreas; keep responses unchanged
}
```

Render `<WellnessWheel readonly={false} />` pre-filled with previous scores.

---

## 9. Test Coverage

| File | Tests |
|------|-------|
| `onboardingConfig.test.ts` | 13 — schema integrity, type enum, scale (1–10), segment uniqueness |
| `wheelCalculations.test.ts` | 25 — SVG geometry, score-to-radius, color thresholds, MI prompt |
| `onboardingService.test.ts` | 25 — validation per type (textarea/select/multitext/pills), config merge, preferences builder |
| `index.routing.test.tsx` | 7 — route guard: no session → login; completed → dashboard; incomplete → welcome; Google Fit return |

Run all: `npm test` from `project-leo/`.

---

## 10. Privacy

`user_preferences` contains health-related free-text. Ensure:
- Supabase RLS restricts `user_preferences` to the authenticated `uid` only.
- Free-text response columns are not indexed.
- Include preferences in your account-deletion flow (GDPR / HIPAA).
