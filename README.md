# Sakhi (सखी) — Women's Healthcare Companion

**Sakhi** is a private, rural-friendly women's healthcare companion web app designed for urban and rural women in India (PS1: Women's Healthcare).

## Stack

- **Framework**: TanStack Start + React 19
- **Styling**: Tailwind CSS v4 (design tokens, accessible 44px tap targets, warm blush-white `#FFF8FA` & primary teal `#0B7A75` palette)
- **Internationalization**: i18next supporting 11 Indian languages (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, ଓଡ଼ିଆ) with 100% key parity
- **Data Access**: Local-first storage adapter behind `src/services/*` with one-tap complete data wipe

## Core Principles

1. **Local-First & Private**: Personal health logs, symptoms, and documents are stored locally on the device. Tapping "Delete all my data" in Settings completely wipes all storage.
2. **Informs, Never Diagnoses**: Sakhi provides health education, prepares questions for clinical visits, and identifies pattern flags. It never diagnoses conditions or prescribes medications. Reminders and notifications never name a medicine or condition.
3. **Rural-Friendly UI**: Large tap targets (minimum 44px), icon-first UI, few words per screen, serif headings, clean sans body, and one main action per view.
4. **Offline Resilience**: App shell caching and clear honest status banners keep check-ins, cycles, and medicines accessible without internet connectivity.

## Environment Variables

Create `.env.local` in the project root (never committed, ignored by git):

```env
# Healthcare facility locator & geocoding (myprojects.geoapify.com, free, no card)
GEOAPIFY_API_KEY=

# Chat Assistant (OpenAI-compatible server endpoint)
LLM_API_URL=
LLM_API_KEY=
LLM_MODEL=
LLM_DAILY_LIMIT=

# Optional fallback LLM provider
LLM_FALLBACK_URL=
LLM_FALLBACK_KEY=
LLM_FALLBACK_MODEL=
```

> **Note on Reminders**: Discreet reminders ("Time for your tablet") run while the app is open. Reliable background reminders will require Twilio SMS/WhatsApp integration.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run test suite
npm test

# Typecheck and lint
npx tsc --noEmit
npm run lint

# Production build
npm run build
```
