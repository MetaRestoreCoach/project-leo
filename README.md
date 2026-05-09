# Project LEO - Health Coaching App

**"Your Health is Your Wealth"**

A cross-platform health coaching app that helps users reverse and manage chronic conditions (diabetes, hypertension, cholesterol) through AI-driven diet, exercise, and supplement recommendations rooted in functional medicine.

Built with React Native + Expo (iOS, Android, Web) and Supabase.

---

## Quick Start (Web Development)

```bash
# 1. Install dependencies
cd project-leo
npm install

# 2. Copy environment config
cp .env.example .env
# Edit .env with your Supabase credentials (see Setup Guide below)

# 3. Start the web dev server
npm run web
```

The app opens at `http://localhost:8081` and works as a responsive web app.

---

## Project Structure

```
project-leo/
├── src/
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── (auth)/             # Login, Signup, Forgot Password
│   │   ├── (tabs)/             # Main app tabs (Dashboard, Log, Coaching, Profile)
│   │   └── onboarding/        # 4-step profile wizard
│   ├── components/
│   │   ├── common/             # Button, Input, Card (shared UI)
│   │   ├── dashboard/          # MetricCard, CoachingCard, GoalProgress
│   │   └── onboarding/        # OnboardingShell, ChipSelector
│   ├── services/               # API layer (Supabase, Auth, Health, Coaching)
│   ├── hooks/                  # Zustand stores (auth, onboarding)
│   ├── types/                  # TypeScript type definitions
│   ├── constants/              # Theme, labels, config
│   └── assets/
├── supabase/
│   ├── migrations/             # SQL schema (run in Supabase SQL Editor)
│   └── functions/              # Edge Functions (Claude coaching engine)
├── docs/                       # Setup guides
└── package.json
```

---

## Setup Guide

### 1. Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to your users)
3. Once the project is ready, go to **SQL Editor**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql` and run it
5. Go to **Settings > API** and copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL` in `.env`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`

#### Enable Google Sign-In:
1. In Supabase dashboard: **Authentication > Providers > Google**
2. Enable it and add your Google OAuth Client ID and Secret
3. Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. Set the redirect URL as shown in Supabase

#### Enable Apple Sign-In:
1. In Supabase dashboard: **Authentication > Providers > Apple**
2. Follow the Apple Developer setup instructions shown there
3. (Can be deferred until iOS build phase)

### 2. GitHub Repository

```bash
# Initialize git in the project folder
cd project-leo
git init
git add .
git commit -m "Initial commit: Project LEO MVP scaffold"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/project-leo.git
git branch -M main
git push -u origin main
```

### 3. Vercel Deployment (Web)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **New Project** and import your `project-leo` repo
3. Set these build settings:
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
4. Add environment variables from your `.env` file
5. Deploy — your app is live!

Every push to `main` auto-deploys. PRs get preview URLs.

### 4. Claude API (Coaching Engine)

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account
2. Generate an API key
3. In your Supabase project: **Edge Functions > Secrets**
4. Add: `CLAUDE_API_KEY = sk-ant-your-key-here`
5. Deploy the edge function:
   ```bash
   npx supabase functions deploy generate-coaching-plan
   ```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run web` | Start web dev server (localhost:8081) |
| `npm run ios` | Start iOS simulator (requires Xcode) |
| `npm run android` | Start Android emulator |
| `npm start` | Start Expo dev server (scan QR on phone) |
| `npm run typecheck` | Run TypeScript type checking |

---

## MVP Features

- [x] Email/password registration with verification
- [x] Google Sign-In (OAuth 2.0)
- [x] Apple Sign-In (ready for iOS)
- [x] 4-step onboarding wizard (basics, conditions, goals, preferences)
- [x] Health dashboard with metrics grid
- [x] Manual health metric logging (weight, glucose, BP, steps, sleep, water)
- [x] Meal logging (breakfast, lunch, dinner, snack)
- [x] Lab result entry
- [x] AI coaching plan display (diet, exercise, supplements)
- [x] Goal progress tracking
- [x] User profile view and edit
- [x] Responsive layout (mobile + desktop)
- [x] Supabase Row-Level Security on all tables
- [x] Claude API coaching engine (via Edge Function)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo + TypeScript |
| Routing | Expo Router (file-based) |
| State | Zustand |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Claude API (Anthropic) |
| Deployment | Vercel (web), EAS Build (mobile - future) |

---

## Roadmap

**Phase 1 (Current):** MVP with auth, profile, dashboard, manual logging, AI coaching
**Phase 2:** Apple Health integration, Garmin/Fitbit, push notifications, community
**Phase 3:** Custom ML models, human coach marketplace, multi-language, B2B portal

---

## License

Proprietary. All rights reserved.
