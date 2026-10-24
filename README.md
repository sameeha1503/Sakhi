# Sakhi (सखी / సఖి) — Women's Healthcare Companion

**Sakhi** is a private, rural-friendly women's healthcare companion app designed to help women track menstrual health, recognize patterns (such as PCOS or endometriosis signs), access health guidance, manage prescriptions, and find urgent care when needed.

Built with **TanStack Start**, **React 19**, **Tailwind CSS 4**, and **i18next**, supporting **11 Indian languages**: English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, and ଓଡ଼ିଆ.

> **Privacy & Medical Notice:**
>
> - All personal health records remain stored locally on the device via the storage adapter and can be deleted entirely at any time.
> - Sakhi provides educational health guidance, schedule organization, and pattern recognition; it never diagnoses conditions or prescribes medications.

---

## Supported Languages & Review Status

The app features a unified, accessible **LanguageSelect** dropdown component with search, large tap targets (minimum 44px–52px), native script labels, and mobile bottom sheet/popover presentation. Non-English translations are lazy-loaded via dynamic imports to keep initial bundle sizes tiny while remaining server-rendering safe.

| Language      | Code | Native Script Label |  Review Status   | Notes                                                          |
| :------------ | :--: | :------------------ | :--------------: | :------------------------------------------------------------- |
| **English**   | `en` | English             |       Base       | Authoritative baseline for keys & interpolations               |
| **Hindi**     | `hi` | हिन्दी              | **Needs Review** | Rural-friendly phrasing; needs native speaker verification     |
| **Telugu**    | `te` | తెలుగు              | **Needs Review** | Natural conversational tone; needs native speaker verification |
| **Tamil**     | `ta` | தமிழ்               | **Needs Review** | Everyday spoken Tamil; needs native speaker verification       |
| **Kannada**   | `kn` | ಕನ್ನಡ               | **Needs Review** | Everyday spoken Kannada; needs native speaker verification     |
| **Malayalam** | `ml` | മലയാളം              | **Needs Review** | Everyday spoken Malayalam; needs native speaker verification   |
| **Marathi**   | `mr` | मराठी               | **Needs Review** | Everyday spoken Marathi; needs native speaker verification     |
| **Bengali**   | `bn` | বাংলা               | **Needs Review** | Everyday spoken Bengali; needs native speaker verification     |
| **Gujarati**  | `gu` | ગુજરાતી             | **Needs Review** | Everyday spoken Gujarati; needs native speaker verification    |
| **Punjabi**   | `pa` | ਪੰਜਾਬੀ              | **Needs Review** | Everyday spoken Punjabi; needs native speaker verification     |
| **Odia**      | `or` | ଓଡ଼ିଆ               | **Needs Review** | Everyday spoken Odia; needs native speaker verification        |

> [!NOTE]
> **Native Speaker Review Status:** Currently **none** of the translations have been formally confirmed by a native speaker. Hindi and Telugu, along with all 8 newly added languages, still require native speaker review to verify clinical sensitivity and colloquial rural clarity.

### Maintaining Translation Parity

**Rule:** Every new UI string must be added to **ALL 11 locale files** (`src/i18n/locales/*.json`) with identical keys and matching interpolation variables (`{{name}}`, `{{n}}`, `{{days}}`, etc.).
The automated test suite `src/test/locales-parity.test.ts` validates:

- 100% key parity (zero missing keys, zero superfluous keys).
- Non-empty values for all keys.
- Complete variable interpolation synchronization across all 11 files.

---

## Key Features

- **Dropdown Language Selector (`LanguageSelect`)**: Accessible button displaying a globe icon, current language in native script, and chevron arrow. Opens a searchable popover/sheet with checkmark indicator and large tap targets. Used consistently in the top bar, landing page, and Settings.
- **Multilingual Support (11 Languages)**: Localized in 11 languages with Noto Sans fallback typography for Tamil, Telugu, Kannada, Malayalam, Devanagari, Bengali, Gujarati, Gurmukhi, and Odia scripts. Date formatting conforms to the active language `-IN` locale (e.g. `ta-IN`, `mr-IN`).
- **Privacy-First Onboarding**: Clear consent explaining local data ownership and one-tap data deletion.
- **Rural-Friendly Design**: Large tap targets (minimum 44px–56px), icon-first visual language, minimal text per screen, and single primary action per view. Tested and responsive at **360px width** for entry-level smartphones.
- **PWA & Offline Capability (Phase 5)**:
  - Web App Manifest (`manifest.json`) with Sakhi branding, `#b5532f` terracotta theme color, and installable icons.
  - Minimal service worker (`sw.js`) caching the core app shell (`/`, `/home`, `/log`, etc.) without breaking TanStack Start SSR or build pipelines.
  - Sticky offline status indicator banner (`WifiOff` icon) that informs the user: _"Offline mode — Your check-ins and logs are saved on this phone."_
  - Daily check-ins, medicine dose logging, and offline reviews work seamlessly with zero internet connection.
- **Storage Error Handling & Quota Protection (Phase 5)**:
  - All storage writes are wrapped in safe `try/catch` handlers in `storage.ts`.
  - Distinguishes quota limits (`QuotaExceededError`) from blocked browser permissions, displaying friendly non-blocking warning banners instead of crashing.
- **One-Tap Demo Profile (Phase 5)**:
  - Accessible directly from `/settings`.
  - Instantly loads 3 months of realistic logs triggering clinical pattern flags, medicines with dose history, past doctor visits with an upcoming follow-up, and clean vault.
  - Dedicated **Clear demo data** button to wipe sample records cleanly.
- **Prescription Scanner & OCR (Phase 3)**:
  - Camera/gallery prescription photo reader (`/scan`).
  - Automatic extraction into editable cards with verification note: _"Please check this with your doctor or pharmacist."_
  - Plain-language _"what it is for"_ explanation for every medicine from a curated static dictionary with safe fallback.
- **Medicines & Daily Doses (`/medicines`) (Phase 3)**:
  - Today's dose schedule cards organized by time of day (Morning, Afternoon, Evening, Night).
  - Quick large tap actions for **Taken** (with timestamp) and **Skip**.
  - Refill alert banner when supply has 3 or fewer days remaining.
  - Weekly adherence percentage tracking and 7-day visual history.
- **Discreet Dose Reminders (Phase 3)**:
  - Checks pending doses every minute while app is open, showing a top banner and toast.
  - Optional browser Notification API opt-in.
  - Privacy-preserving wording: strictly discreet (_"Time for your tablet"_), never revealing medicine names or conditions.
- **Daily Check-In & Symptom Log (`/log`) (Phase 2)**: Rapid 4-step logging for menstrual flow, pain locations & severity (1–5), energy/mood/sleep, and common symptoms.
- **Cycle Tracker & Pattern Alerts (`/cycle`) (Phase 2)**: 35-day visual calendar, cycle length tracking, and rule-based doctor visit flags.
- **Urgent Care Red-Flag Mode (`/urgent`) (Phase 2)**: Immediate guidance, nearest hospital directory, and one-tap 108 ambulance calling when severe symptoms are logged.
- **Hospital Map & Care Locator (`/care`) (Phase 4)**:
  - Interactive Leaflet map with OpenStreetMap tiles (SSR-safe, client-side dynamic load).
  - Directory of 34 sample government hospitals, CHCs, and PHCs across Telangana, Andhra Pradesh, and neighbouring states.
  - Geolocation permission with 1-line reason, searchable town fallback, and opt-in location persistence.
  - Distance in km, direct phone call (`tel:`), Google Maps directions, and "Women's doctor available" filter chip.
  - Friendly proximity nudge when a hospital is within 10 km.
- **Doctor Question Prep (`/care/questions`) (Phase 4)**:
  - Generates suggested questions to ask the doctor based on logged symptoms and pattern flags (e.g. irregular cycles, severe pain, heavy bleeding, medicines).
  - Pre-populated with generic wellness, nutrition, warning signs, and follow-up questions.
  - Tick questions to bring to the appointment, or write and save custom questions.
- **Doctor Visits Timeline (`/care/visits`) (Phase 4)**:
  - Timeline of clinic visits with doctor/clinic name, reason, notes, and linked medicines.
  - Next follow-up date tracking with an upcoming follow-up alert banner displayed on Home when a visit is within 3 days.
- **One-Page Printable Doctor Summary (`/care/summary`) (Phase 4)**:
  - 1-page printable view containing 90-day cycle statistics (lengths, flow highlights, severe pain days), pattern flags worded supportively as _"worth discussing with a doctor"_, active medicines, recent visits, and ticked questions.
  - Tailored `@media print` A4 stylesheet and "Download / Print PDF" button using native browser print dialog for perfect Telugu and Hindi script rendering.
- **Government Health Schemes Finder (`/care/schemes`) (Phase 5)**:
  - Static curated directory of central and state health schemes: Ayushman Bharat PM-JAY, Ayushman Arogya Mandirs (women 30+ cancer screening & primary care), Janani Suraksha Yojana (JSY), Pradhan Mantri Matru Vandana Yojana (PMMVY), Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA), and Janani Shishu Suraksha Karyakram (JSSK).
  - 3–4 simple questions with big buttons (age group, pregnancy status, ration card/household category, state).
  - Cards showing what the scheme offers, documents to carry, where to apply, and direct links to official government portals.
  - Opt-in monthly reminder for PMSMA on the 9th of every month for pregnant women.
  - Integrates nearest Ayushman Arogya Mandir / PHC from map directory with direct call and directions actions.
- **Private Document Vault (`/vault`) (Phase 5)**:
  - 4-digit PIN privacy lock to shield prescription photos, lab reports, and scans from other people using a shared phone.
  - Salted Web Crypto PBKDF2 (100,000 iterations, SHA-256); raw PIN is never stored.
  - Lockout protection: 5 consecutive failed attempts trigger a 5-minute lockout (escalating on repeated failures).
  - Auto-locks after 2 minutes of inactivity or immediately upon leaving the vault.
  - Backed by IndexedDB for large documents (photos and PDFs) with in-memory fallback, and integrated with the _"Delete all my data"_ purge.
- **Educational Guides (`/learn`)**: Plain-language explainers for PCOS/PCOD and endometriosis.

---

## How to Run

### Requirements

- **Node.js** v18+ (tested on Node v20/v24)
- **npm** (or bun / pnpm)

### Setup & Commands

```bash
# Install dependencies
npm install

# Start local development server (runs on http://localhost:8080)
npm run dev

# Run all automated test suites (Vitest)
npm run test

# Check linting and formatting
npm run lint

# Format code with Prettier
npm run format

# Create production build
npm run build
```

### Windows One-Click Batch Launcher (`run.bat`)

Double-click `run.bat` (or run `run.bat` in Command Prompt / PowerShell) to open the interactive menu:

```cmd
=========================================================
      Sakhi (सखी / సఖి) - Women's Healthcare Companion
=========================================================

  [1] Start Development Server (http://localhost:8080)
  [2] Run All Tests (Vitest - 52 tests)
  [3] Type Check (tsc) & Linter (eslint)
  [4] Create Production Build (npm run build)
  [5] Install Dependencies (npm install)
  [6] Exit
```

You can also pass arguments directly:

- `run.bat dev` — Launches the dev server and opens `http://localhost:8080` in your default browser.
- `run.bat test` — Runs all 52 Vitest unit and flow tests.
- `run.bat build` — Builds the production bundle.
- `run.bat lint` — Runs TypeScript typecheck and ESLint.

---

## How to Load Demo Data

A dedicated demo profile loader is built into the app for evaluators and demonstrations:

1. Open the app and navigate to **Settings** (tap the **Profile** tab in the bottom bar, then tap **Settings**).
2. Locate the **Demo Profile** section at the top.
3. Tap **Load demo profile**:
   - Creates **3 months of realistic symptom and cycle logs**:
     - Cycle gaps of 38 and 29 days with severe pain level 4+ during periods, triggering the `irregularPlus` and `painCycle` flags.
     - Symptoms (acne, hair fall, weight changes) distributed across weeks.
   - Creates **sample prescription with 3 active medicines**:
     - _Ferrous Ascorbate (Iron)_ (100mg, Morning after food)
     - _Calcium & Vitamin D3_ (500mg, Night after food)
     - _Mefenamic Acid_ (500mg, Morning & Night after food for period cramps)
     - Includes a 4-day dose history with both taken and skipped doses (85% adherence).
   - Creates **2 past doctor visits**:
     - Visit 1: Dr. Sunitha at CHC Shamshabad (initial evaluation).
     - Visit 2: Dr. Lakshmi at Govt Maternity Hospital Koti, with an **upcoming follow-up scheduled in ~5 days**.
   - Resets vault into a **clean, vault-free state** (no PIN required yet).
4. Navigate to **Home** (`/home`), **Medicines** (`/medicines`), or **Doctor Summary** (`/care/summary`) to inspect the generated clinical alerts, upcoming appointment banners, and dose schedule.
5. To reset at any time, return to **Settings** and tap **Clear demo data** (or **Delete all my data**).

---

## Architecture: Mock Services to Production Real Services

The codebase is engineered strictly with a clean services boundary (`src/services/*`). UI routes never access `localStorage` or browser storage directly. This guarantees a drop-in replacement when transitioning to real backend services:

| Mock Service Module                                                                                     | Current Mock Implementation                                                                     | Planned Production Service                                              | Production Integration Details                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage & Check-In Logs**<br>`src/services/storage.ts`<br>`src/services/logs.ts`                      | LocalStorage adapter with prefix `sakhi:`, safe try/catch error handling, and memory fallbacks. | **Supabase Database (PostgreSQL with Row-Level Security)**              | Replace `storage.ts` adapter with `@supabase/supabase-js`. Store `daily_logs` in PostgreSQL with row-level security ensuring users can only read/write their own records. Offline-first synchronization is powered by an IndexedDB local cache that syncs to Supabase on reconnection. |
| **Authentication & Profiles**<br>`src/services/auth.ts`                                                 | Local session state with phone number and name in localStorage.                                 | **Supabase Auth (Phone OTP via SMS / WhatsApp)**                        | Passwordless login using Supabase Phone OTP. Rural users enter their 10-digit mobile number, receive a 6-digit OTP via SMS or WhatsApp, and authenticate without requiring passwords.                                                                                                  |
| **Prescription Scanner**<br>`src/services/scanner.ts`                                                   | 1.5-second simulated OCR extraction returning structured mock medicines.                        | **Multimodal Vision LLM (Gemini 1.5 Pro / Flash or Claude 3.5 Sonnet)** | The camera/upload input sends the image buffer to a secure edge function running a multimodal vision prompt. The LLM extracts medicine brand/generic names, dosages, frequencies, and food timings into structured JSON conforming to `PrescriptionExtraction`.                        |
| **Dose Reminders & Refill Alerts**<br>`src/services/medicines.ts`<br>`src/components/DoseReminders.tsx` | Periodic client-side timer checking pending doses, in-app toast, and browser Notifications API. | **Twilio API (WhatsApp & SMS Scheduled Notifications)**                 | In-app reminders only trigger while the web app is active. The production system uses Twilio to trigger scheduled background WhatsApp / SMS alerts directly to the user's mobile number even when the phone is locked or browser is closed.                                            |
| **Hospital & Clinic Locator**<br>`src/services/places.ts`<br>`src/routes/care.tsx`                      | Static directory of 34 sample government hospitals, CHCs, and PHCs across AP/Telangana.         | **National Health Portal (NHP) API & OpenStreetMap Overpass API**       | Live integration with the Ayushman Bharat / National Health Facility Registry and OpenStreetMap Overpass API. Queries verified public health facilities by latitude/longitude with real-time specialist availability.                                                                  |
| **Private Document Vault**<br>`src/services/vault.ts`<br>`src/routes/vault.tsx`                         | PBKDF2 Web Crypto PIN hashing (100k iterations) + local IndexedDB document storage.             | **Supabase Storage with Client-Side AES-GCM Encryption**                | Files uploaded to the private vault are encrypted in the browser using Web Crypto AES-GCM before upload, where the encryption key is derived from the user's PIN via PBKDF2. Encrypted blobs are backed up to private Supabase Storage buckets.                                        |

---

## Folder Layout

```
screenshot-to-spark-0803-main/
├── public/
│   ├── favicon.ico          # Application favicon
│   ├── icon.svg             # Vector SVG app icon
│   ├── icon-192.png         # 192x192 PWA PNG icon
│   ├── icon-512.png         # 512x512 PWA PNG icon
│   ├── manifest.json        # Web App Manifest for PWA installation
│   └── sw.js                # Minimal offline service worker
├── src/
│   ├── assets/              # Static imagery (condition explainers, icons)
│   ├── components/          # Shared UI components
│   │   ├── ui/              # Radix & Tailwind design primitives (sonner, etc.)
│   │   ├── AppShell.tsx     # Mobile frame, offline banner, storage error banner, nav
│   │   ├── DoseReminders.tsx# Periodic reminder checks, banner, toast, Notification opt-in
│   │   ├── FlagCards.tsx    # Doctor-visit advisory card component
│   │   └── LanguageSync.tsx # Client-side locale synchronization
│   ├── data/
│   │   └── schemes.ts       # Curated health schemes (Ayushman Bharat, PMSMA, JSY, etc.)
│   ├── hooks/               # Shared React hooks (e.g., use-mobile)
│   ├── i18n/                # Internationalization setup
│   │   ├── index.ts         # i18next configuration
│   │   └── locales/         # en.json, hi.json, te.json (1:1 key parity)
│   ├── lib/                 # Utility functions and error reporting
│   ├── routes/              # File-based routes (TanStack Router)
│   │   ├── __root.tsx       # Root shell, service worker registration, PWA manifest link
│   │   ├── index.tsx        # Language selector (/)
│   │   ├── consent.tsx      # Privacy consent (/consent)
│   │   ├── signup.tsx       # Authentication / profile creation (/signup)
│   │   ├── home.tsx         # Dashboard home (/home)
│   │   ├── log.tsx          # 4-step daily health check-in (/log)
│   │   ├── cycle.tsx        # Cycle calendar and history (/cycle)
│   │   ├── scan.tsx         # Prescription camera/upload & confirmation (/scan)
│   │   ├── medicines.tsx    # Today's doses, adherence, refill alerts (/medicines)
│   │   ├── learn.tsx        # Health explainers (/learn)
│   │   ├── urgent.tsx       # Red-flag hospital & emergency screen (/urgent)
│   │   ├── profile.tsx      # User profile & logout (/profile)
│   │   ├── settings.tsx     # Demo profile loader/clearer, language switch, delete data (/settings)
│   │   ├── care.tsx         # Hospital locator & doctor visit hub (/care)
│   │   ├── care.questions.tsx # Suggested & custom questions for doctor (/care/questions)
│   │   ├── care.visits.tsx  # Doctor visits timeline & follow-up reminders (/care/visits)
│   │   ├── care.summary.tsx # 1-page printable doctor summary (/care/summary)
│   │   ├── care.schemes.tsx # Government health schemes finder (/care/schemes)
│   │   └── vault.tsx        # Private PIN-locked document vault (/vault)
│   ├── services/            # Centralized data access and business logic
│   │   ├── auth.ts          # User profile, session, and onboarding preferences
│   │   ├── cycle.ts         # Menstrual cycle analytics and red-flag rules
│   │   ├── demo.ts          # Demo profile generator (3 months logs, meds, visits)
│   │   ├── logs.ts          # Daily check-in log records
│   │   ├── medicines.ts     # Medicine list, dose schedule, adherence, refills
│   │   ├── places.ts        # Hospital and health center directory (34 facilities)
│   │   ├── questions.ts     # Doctor visit question prep service
│   │   ├── scanner.ts       # Prescription image extraction service
│   │   ├── storage.ts       # LocalStorage adapter with quota & error protection
│   │   ├── vault.ts         # PBKDF2 PIN hashing, lockout, IndexedDB storage
│   │   └── visits.ts        # Doctor clinic visits & follow-up tracking
│   ├── styles.css           # Tailwind CSS v4 styling, custom tokens (@utility tap, card-soft)
│   └── test/                # Vitest test suites (11 suites, 50 unit & integration tests)
└── roadmap.md               # Completed phase-by-phase development roadmap
```
