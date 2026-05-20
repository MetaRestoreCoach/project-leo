# Onboarding Feature — Implementation Spec

**Feature:** MI-aligned onboarding flow with interactive Wellness Wheel
**Version:** 1.0.0
**Last updated:** 2026-05-19

---

## 1. Overview

New users complete a 7-step onboarding sequence immediately after sign-up (or on first login). The flow collects:

1. Six configurable health questions (text, multitext, single-select)
2. An interactive Wellness Wheel — 11 life-area satisfaction scores (0–9)

Responses are persisted to the user's profile and directly seed:
- Coaching card prioritisation (lowest wheel segments → first coaching content)
- The dashboard's personalised greeting
- The 30-day re-assessment reminder

All question copy and wheel segment definitions live in a **remote config** (Firestore `config/onboarding` document) that can be updated without a code deploy.

---

## 2. File Structure

```
src/features/onboarding/
  config/
    onboardingConfig.js       Default config — fallback if remote fetch fails
  utils/
    wheelCalculations.js      Pure math functions for SVG geometry + scoring
  services/
    onboardingService.js      Validation, config merge, preferences builder, service factory
  components/
    WellnessWheel.jsx         Interactive SVG wheel (pure presentational)
    OnboardingQuestion.jsx    Renders a single question by type
    OnboardingFlow.jsx        Orchestrator — manages step state + submission
  __tests__/
    onboardingConfig.test.js  13 schema integrity tests
    wheelCalculations.test.js 25 geometry + scoring unit tests
    onboardingService.test.js 25 validation + service tests
    OnboardingFlow.test.jsx   25 component integration tests
  index.js                    Public exports
```

---

## 3. Data Models

### 3.1 OnboardingConfig (stored in Firestore: `config/onboarding`)

```js
{
  schemaVersion: "1.0.0",      // bump on breaking changes
  lastUpdated: "2026-05-19",
  steps: [                     // Array<QuestionStep> — fully replaces default when present
    {
      id: string,              // unique key, used as key in UserPreferences.responses
      type: "textarea" | "multitext" | "select",
      question: string,        // prompt shown to the user
      required: boolean,
      hint: string | null,
      // textarea only:
      placeholder?: string,
      maxLength?: number,
      // multitext only:
      minItems?: number,
      maxItems?: number,
      // select only:
      options?: Array<{ value: string, label: string }>
    }
  ],
  wellnessWheel: {
    title: string,
    instruction: string,
    scale: { min: number, max: number },   // always 0–9
    defaultScore: number,                  // pre-filled value for each segment
    reassessmentDays: number,              // days until next wheel check-in
    focusAreaCount: number,                // how many low-score areas to highlight
    miPromptTemplate: string,             // must contain {area1} and {area2}
    segments: Array<{
      id: string,
      label: string,         // full name — shown in summary + coaching
      shortLabel: string,    // abbreviated — shown on wheel ring
      color: string          // hex — dot colour for this segment
    }>
  }
}
```

### 3.2 UserPreferences (stored in Firestore: `users/{uid}/preferences`)

```js
{
  uid: string,
  onboardingVersion: string,     // schemaVersion used during this session
  completedAt: string,           // ISO 8601 timestamp
  responses: {                   // one key per step.id
    goals: string[],
    physical_activity: string,
    sleep: string,
    stressors: string,
    barriers: string,
    work_life_balance: "yes" | "mostly" | "no"
  },
  wellnessScores: {
    scores: { [segmentId]: number },  // 0–9 per segment
    assessedAt: string,               // ISO timestamp
    nextAssessmentDue: string         // assessedAt + reassessmentDays
  },
  focusAreas: string[]    // top-N segment ids with lowest scores
}
```

### 3.3 Onboarding completion flag (Firestore: `users/{uid}/meta`)

```js
{ onboardingComplete: boolean }
```

---

## 4. Storage Interface

Any storage backend must implement this interface:

```js
{
  getRemoteConfig():                      Promise<OnboardingConfig | null>
  saveUserPreferences(uid, prefs):        Promise<void>
  loadUserPreferences(uid):               Promise<UserPreferences | null>
  markOnboardingComplete(uid):            Promise<void>
  isOnboardingComplete(uid):              Promise<boolean>
}
```

**Firebase Firestore adapter example:**

```js
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const firestoreStorage = {
  async getRemoteConfig() {
    const snap = await getDoc(doc(db, 'config', 'onboarding'));
    return snap.exists() ? snap.data() : null;
  },
  async saveUserPreferences(uid, prefs) {
    await setDoc(doc(db, 'users', uid, 'preferences', 'onboarding'), prefs);
  },
  async loadUserPreferences(uid) {
    const snap = await getDoc(doc(db, 'users', uid, 'preferences', 'onboarding'));
    return snap.exists() ? snap.data() : null;
  },
  async markOnboardingComplete(uid) {
    await setDoc(doc(db, 'users', uid, 'meta'), { onboardingComplete: true }, { merge: true });
  },
  async isOnboardingComplete(uid) {
    const snap = await getDoc(doc(db, 'users', uid, 'meta'));
    return snap.exists() ? snap.data().onboardingComplete === true : false;
  },
};
```

---

## 5. Component API

### OnboardingFlow

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `OnboardingConfig` | Yes | Merged config from `useOnboardingConfig` |
| `onComplete` | `(prefs) => void` | Yes | Called with `UserPreferences` on finish |
| `service` | `OnboardingService` | Yes | From `createOnboardingService(storage)` |
| `uid` | `string` | Yes | Firebase auth uid |
| `loading` | `boolean` | Yes | True while config is being fetched |
| `error` | `string \| null` | Yes | Error message if config fetch failed |

### WellnessWheel

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `segments` | `Segment[]` | Yes | From `config.wellnessWheel.segments` |
| `scores` | `{ [id]: number }` | Yes | Current scores |
| `scale` | `{ min, max }` | Yes | From `config.wellnessWheel.scale` |
| `onScoreChange` | `(id, score) => void` | No | Omit for readonly display |
| `readonly` | `boolean` | No | Hides sliders, disables click (default: false) |
| `size` | `number` | No | SVG pixel size (default: 400) |
| `miPromptTemplate` | `string` | No | Filled with 2 lowest area labels |
| `focusAreaCount` | `number` | No | Default: 3 |

### OnboardingQuestion

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `question` | `QuestionStep` | Yes | From `config.steps[i]` |
| `value` | `*` | Yes | Current answer |
| `onChange` | `(value) => void` | Yes | Called on every input change |
| `error` | `string \| null` | No | Inline validation message |

---

## 6. How to update questions without a code deploy

1. Open Firebase console → Firestore → `config/onboarding`
2. Edit the `steps` array. Each item must have `id`, `type`, `question`, `required`.
3. Save. The app fetches this config on next load — no deploy needed.

**Rules:**
- Never reuse an existing `id` for a different question (old preferences data will be mismatched).
- If renaming a question, add a new `id` and mark the old one deprecated in a comment.
- To add a new question type, update `STEP_TYPES` in `onboardingConfig.js` AND `OnboardingQuestion.jsx`, then deploy.

---

## 7. Integration steps

1. Copy `src/features/onboarding/` into your app.
2. Create `src/features/onboarding/hooks/useOnboardingConfig.js`:

```js
import { useState, useEffect } from 'react';
import { createOnboardingService } from '../services/onboardingService';
import { firestoreStorage } from '../services/firestoreStorage';

const service = createOnboardingService(firestoreStorage);

export function useOnboardingConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    service.getConfig()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading, error, service };
}
```

3. In your app router, add a guard on protected routes:

```jsx
// In App.jsx or your router config
const { data: isComplete } = useQuery(['onboarding', uid], () => service.isComplete(uid));

if (!isComplete) return <Navigate to="/onboarding" />;
```

4. Add `/onboarding` route:

```jsx
import OnboardingFlow from './features/onboarding/components/OnboardingFlow';
import { useOnboardingConfig } from './features/onboarding/hooks/useOnboardingConfig';

function OnboardingPage() {
  const { config, loading, error, service } = useOnboardingConfig();
  const { uid } = useAuthContext();

  return (
    <OnboardingFlow
      config={config}
      loading={loading}
      error={error}
      service={service}
      uid={uid}
      onComplete={(prefs) => {
        // prefs.focusAreas → pass to coaching engine
        navigate('/dashboard');
      }}
    />
  );
}
```

---

## 8. Re-assessment flow (30-day check-in)

On dashboard load, check `preferences.wellnessScores.nextAssessmentDue`:

```js
const due = new Date(prefs.wellnessScores.nextAssessmentDue);
if (new Date() >= due) {
  // Show wheel-only re-assessment prompt
  // On save: update wellnessScores + focusAreas, keep responses unchanged
}
```

Show `<WellnessWheel ... readonly={false} />` pre-filled with previous scores.

---

## 9. Test coverage summary

| File | Tests | Covers |
|------|-------|--------|
| `onboardingConfig.test.js` | 13 | Schema integrity, type enum, segment uniqueness, template placeholders |
| `wheelCalculations.test.js` | 25 | Geometry math, score-to-radius, click detection, color thresholds, focus areas, MI prompt |
| `onboardingService.test.js` | 25 | Validation (textarea/select/multitext), config merge, preferences builder, service factory |
| `OnboardingFlow.test.jsx` | 25 | Loading/error states, step navigation, validation blocking, Back/Next, wheel render, completion |
| **Total** | **88** | |

Run: `npm test` from the `outputs/` directory.

---

## 10. Storing user preferences — privacy note

`UserPreferences` contains health-related free-text. Ensure:
- Firestore security rules restrict `users/{uid}/**` to the authenticated `uid` only.
- Free-text responses are not indexed.
- GDPR/HIPAA: include preferences in your data-deletion flow when a user deletes their account.
