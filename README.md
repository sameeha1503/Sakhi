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
- **Live Hospital Map & Care Locator (`/care` & `/urgent`)**:
  - **Live OpenStreetMap Overpass API**: Real-time queries to Overpass API (`https://overpass-api.de/api/interpreter`, with automatic fallback mirror `https://overpass.kumi.systems/api/interpreter`) querying nodes, ways, and relations (`nwr`) with `amenity=hospital|clinic|doctors` or `healthcare=hospital|clinic|centre|doctor` (`out center tags`).
  - **Progressive Rural Radius**: Expands search radius from 5 km to 10 km, 25 km, and up to 50 km until at least 8 healthcare centres are retrieved, ensuring rural users receive relevant results.
  - **Road Distance & Drive Times**: Automatically enriches the nearest 10 centres with driving distance and travel duration via the public OSRM table service (`router.project-osrm.org/table`), non-blocking with graceful fallback to straight-line distance labeled "approx".
  - **Rich Facility Tags & Verification**: Tags facilities as Hospitals, PHCs, CHCs, or Clinics; marks Government facilities (`Govt` badge); and displays a `"Women's health doctor"` badge **only** when OSM tags or `healthcare:speciality` explicitly confirm gynaecology, obstetrics, or maternity services.
  - **Interactive Leaflet Map & Actions**: Live Leaflet map with OpenStreetMap tiles (`© OpenStreetMap contributors` attribution), direct phone calling (`tel:`, or friendly `"Phone not listed"` indicator), and Google Maps directions link with precise destination coordinates.
  - **Manual Village & PIN Geocoding**: Search input geocodes Indian villages, towns, or 6-digit PIN codes via Nominatim (`countrycodes=in`, limit 5). Strictly adheres to OSM Nominatim policy: manual trigger on Search/Enter (no autocomplete), and throttled to $\le 1$ request per second.
  - **Failure & Offline Fallback Hierarchy**: Primary Overpass $\rightarrow$ Kumi mirror $\rightarrow$ Cached results (with timestamp) $\rightarrow$ Curated sample facilities (`src/data/sampleFacilities.ts`) with a prominent alert banner: _"Showing sample data, no internet or service unavailable"_.
  - **Privacy-First Location**: Geolocation coordinates and live results are cached in memory for the active session. Coordinates are only saved to persistent storage if the user explicitly turns on _"Remember my location"_.
  - **Urgent Red-Flag Screen (`/urgent`)**: Priority 108 ambulance calling is always displayed at the top, followed by live nearest hospital query prioritizing `amenity=hospital` and `emergency=yes` with sample fallback.
  - **Caller Advisory**: Always reminds rural women: _"Hours and services can change. Please call before you go."_
- **Consolidated Doctor Visit Module (`/visit`)**:
  - Accessible via a prominent wide module card on `/home` (tag: `RECORDS`) and direct links. Uses validated search parameter routing (`/visit?tab=questions|visits|summary`).
  - **Questions tab (`/visit?tab=questions`)**: Generates suggested questions to ask the doctor based on logged symptoms, pattern flags (irregular cycles, severe pain, heavy flow), active medicines, and mood/sleep patterns, alongside universal wellness questions. Displays a clear _"Why this question"_ explanation under flag/symptom questions. Tick questions to bring to the appointment, or add and delete custom questions.
  - **Visits Timeline tab (`/visit?tab=visits`)**: Timeline of clinic visits with doctor/clinic name, reason, clinical notes, linked medicines, and next follow-up date. Upcoming follow-up alert banner displays when a visit is within 3 days (e.g. _"Follow-up in 2 days"_). Includes quick add/edit/delete form with large inputs and date picker.
  - **One-Page Printable Doctor Summary tab (`/visit?tab=summary`)**: 1-page printable view containing patient name, 90-day cycle statistics (lengths, flow highlights, severe pain days), pattern flags worded supportively as _"worth discussing with a doctor"_, active medicines, recent visits, and ticked questions. Tailored `@media print` A4 stylesheet and "Download / Print PDF" button using native browser print dialog for perfect Indic script rendering. Explicit non-diagnostic disclaimer: _"Sakhi shares patterns and questions only. It does not diagnose."_
- **Government Health Schemes Finder (`/schemes`)**:
  - Top-level route with a static curated directory in `src/data/schemes.ts`: Ayushman Bharat PM-JAY (free hospital cover up to ₹5 lakh/year), Ayushman Arogya Mandirs (free primary care and breast/cervical/oral cancer screening for women 30+), Janani Suraksha Yojana (JSY), Pradhan Mantri Matru Vandana Yojana (PMMVY), Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA), and Janani Shishu Suraksha Karyakram (JSSK).
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
- **"Ask Sakhi" Floating Chat Assistant**:
  - Accessible floating widget with chat icon fixed at the bottom right. Sits comfortably above mobile bottom navigation (`bottom-20`) so it never overlaps the navigation bar.
  - Opens a responsive panel: a bottom sheet on phones and an anchored 380px panel on desktop.
  - Includes a permanent non-diagnostic safety note: _"Sakhi shares general information, not medical advice."_
  - **Tappable Suggestion Chips**: Greeting presents common questions (_"What is PCOS?"_, _"What are signs of endometriosis?"_, _"Is my cycle normal?"_, _"When should I see a doctor?"_, _"How do I log my symptoms?"_, _"Find a hospital near me"_, _"What government schemes can I get?"_, _"How do I share my records with my doctor?"_, _"Is my data private?"_) for effortless 1-tap inquiries.
  - **Mode 1 (Offline Curated Knowledge Base)**: 16 intents in `src/data/knowledge.ts` covering PCOS, endometriosis, normal cycle duration, heavy bleeding, period pain, red flags, symptom logging, reminders, nearest hospitals, government schemes, doctor summary sharing, and privacy vault. Matches using Unicode NFC normalisation and substring matching (avoiding `\w`/`\b` regexes that break on Indic scripts) across all 11 languages.
  - **Mode 2 (Optional AI Integration)**: Server route `/api/chat` in TanStack Start enabled only when `LLM_API_KEY` and `LLM_API_URL` are set. Enforces input validation (max 500 characters, last 6 messages only), rate-limiting (~10 requests/minute/client), 15-second timeout, and automatic fallback to Mode 1.
  - **Privacy Guarantee**: By default, **Sakhi does NOT send the user's logs, medicines, or location to the model**; only the user's conversation messages are sent.
  - **Data Deletion Integration**: Chat history is persisted via the storage adapter and is completely wiped whenever the user chooses _"Delete all my data"_ in Settings.

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

| Mock Service Module                                                                                     | Current Mock Implementation                                                                                                                                                | Planned Production Service                                              | Production Integration Details                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage & Check-In Logs**<br>`src/services/storage.ts`<br>`src/services/logs.ts`                      | LocalStorage adapter with prefix `sakhi:`, safe try/catch error handling, and memory fallbacks.                                                                            | **Supabase Database (PostgreSQL with Row-Level Security)**              | Replace `storage.ts` adapter with `@supabase/supabase-js`. Store `daily_logs` in PostgreSQL with row-level security ensuring users can only read/write their own records. Offline-first synchronization is powered by an IndexedDB local cache that syncs to Supabase on reconnection. |
| **Authentication & Profiles**<br>`src/services/auth.ts`                                                 | Local session state with phone number and name in localStorage.                                                                                                            | **Supabase Auth (Phone OTP via SMS / WhatsApp)**                        | Passwordless login using Supabase Phone OTP. Rural users enter their 10-digit mobile number, receive a 6-digit OTP via SMS or WhatsApp, and authenticate without requiring passwords.                                                                                                  |
| **Prescription Scanner**<br>`src/services/scanner.ts`                                                   | 1.5-second simulated OCR extraction returning structured mock medicines.                                                                                                   | **Multimodal Vision LLM (Gemini 1.5 Pro / Flash or Claude 3.5 Sonnet)** | The camera/upload input sends the image buffer to a secure edge function running a multimodal vision prompt. The LLM extracts medicine brand/generic names, dosages, frequencies, and food timings into structured JSON conforming to `PrescriptionExtraction`.                        |
| **Dose Reminders & Refill Alerts**<br>`src/services/medicines.ts`<br>`src/components/DoseReminders.tsx` | Periodic client-side timer checking pending doses, in-app toast, and browser Notifications API.                                                                            | **Twilio API (WhatsApp & SMS Scheduled Notifications)**                 | In-app reminders only trigger while the web app is active. The production system uses Twilio to trigger scheduled background WhatsApp / SMS alerts directly to the user's mobile number even when the phone is locked or browser is closed.                                            |
| **Hospital & Clinic Locator**<br>`src/services/places.ts`<br>`src/routes/care.tsx`                      | **Live OpenStreetMap Overpass API** with fallback mirror, progressive radius (5–50km), OSRM road distance, Nominatim manual geocoding, session cache, and sample fallback. | **National Health Facility Registry (NHP) / Google Places API**         | Fully decoupled service. Can seamlessly swap from Overpass/OSRM to Google Places (Nearby Search + Geocoding API) or the Ayushman Bharat HFR API without modifying UI components.                                                                                                       |
| **Private Document Vault**<br>`src/services/vault.ts`<br>`src/routes/vault.tsx`                         | PBKDF2 Web Crypto PIN hashing (100k iterations) + local IndexedDB document storage.                                                                                        | **Supabase Storage with Client-Side AES-GCM Encryption**                | Files uploaded to the private vault are encrypted in the browser using Web Crypto AES-GCM before upload, where the encryption key is derived from the user's PIN via PBKDF2. Encrypted blobs are backed up to private Supabase Storage buckets.                                        |

---

### Live Healthcare Facility Data & Provider Migration

#### 1. Live Data Stack in `src/services/places.ts`

- **Primary Overpass API**: `https://overpass-api.de/api/interpreter`
- **Fallback Mirror**: `https://overpass.kumi.systems/api/interpreter`
- **Query Structure**: Nodes, ways, and relations (`nwr`) within progressive radius (5 km $\rightarrow$ 10 km $\rightarrow$ 25 km $\rightarrow$ 50 km) querying `amenity=hospital|clinic|doctors` and `healthcare=hospital|clinic|centre|doctor`, outputting `center tags;` so building ways and relations resolve to accurate geographic centers.
- **Road Routing & Drive Time**: Nearest 10 facilities query OSRM Table API (`https://router.project-osrm.org/table/v1/driving/...`) asynchronously with a 4s timeout. If unavailable, UI seamlessly falls back to straight-line distance marked `"approx"`.
- **Manual Village / PIN Search**: Geocoding queries OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=5&q=...`).

#### 2. Nominatim Usage Rules & Compliance

- **Strict Rate Limiting**: Enforces a minimum interval of 1000ms between consecutive requests (`searchRateLimiter`) to respect OSM operational usage guidelines.
- **No Autocomplete**: Keystroke search is prohibited. Geocoding triggers strictly upon user action (pressing the **Search** button or hitting the **Enter** key).
- **Descriptive Identification**: Outgoing HTTP requests specify an identifiable `User-Agent: Sakhi-Womens-Health-App/1.0`.

#### 3. Real-World Data Limits & User Guidance

- **Rural Coverage Gaps**: While major district and area hospitals are well mapped across India, smaller rural Sub-Centres and village clinics may not yet be completely mapped in OpenStreetMap. Sakhi compensates with progressive radius expansion (up to 50 km).
- **Missing Contact Numbers**: Contact phone numbers are frequently unmapped or outdated on crowd-sourced OSM tags. Sakhi indicates `"Phone not listed"` whenever tags omit phone numbers, while preserving the **Directions** link which functions purely via coordinates.
- **User Advisory**: A prominent advisory is rendered on `/care`: _"Hours and services can change. Please call before you go."_

#### 4. How to Swap in Google Places (or National Health Portal API)

All external data fetching, payload parsing, distance calculation, and error fallback are isolated within [`src/services/places.ts`](file:///c:/Users/HP/Downloads/screenshot-to-spark-0803-main/src/services/places.ts). The UI routes (`/care`, `/urgent`) and components (`HospitalMap`) interact strictly with these typed contracts:

- `findNearby(lat, lng, radiusKm): Promise<FindNearbyResult>`
- `searchLocationNominatim(query): Promise<GeocodedLocation[]>`
- `getNearestEmergencyHospital(lat, lng): Promise<Place | null>`

To migrate to **Google Places API**:

1. Replace the Overpass POST call inside `findNearby` with a GET request to the Google Places API (`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=hospital&key=YOUR_KEY`).
2. Map Google Places results to the `Place` interface (`name`, `geometry.location` $\rightarrow$ `lat`/`lng`, `types` $\rightarrow$ `hospital`/`clinic`, `formatted_phone_number` $\rightarrow$ `phone`, `vicinity` $\rightarrow$ `address`).
3. Replace `searchLocationNominatim` with Google Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json?address=${query}&components=country:IN&key=YOUR_KEY`).
4. Replace the OSRM table call with Google Distance Matrix API (`/maps/api/distancematrix/json`) or rely on Google Places distance.
5. Zero modifications are required across the UI routes or components!

---

## Environment Variables & Configuration

Sakhi keeps all secret API keys strictly on the server. Environment variables without the `VITE_` prefix are never bundled into client-side code, sent to the browser, or included in any API response.

### 1. Setting Up `GEOAPIFY_API_KEY`

Live healthcare facility search (`/care`, `/urgent`) and village/town geocoding use the **Geoapify Places API v2** and **Geoapify Geocoding API v1**.

1. Obtain a free API key at [myprojects.geoapify.com](https://myprojects.geoapify.com) (Free tier, no credit card required).
2. Create a local environment file named `.env.local` in the project root (or copy `.env.example`):
   ```bash
   GEOAPIFY_API_KEY=your_geoapify_key_here
   ```
3. Keep `.env.local` private. It is ignored by git in `.gitignore` and must never be committed.

### 2. Free-Tier Limits & Quota Protection

- **Daily Free Quota**: Geoapify's free tier provides **3,000 credits/day** at **5 requests/second**. Each Places or Geocoding search consumes 1 credit.
- **Client Rate Limiting**: The server route enforces an in-memory sliding window rate limit of **~10 requests per minute per client IP**. Requests exceeding this threshold return HTTP 429 (`rate_limited`).
- **10-Minute Response Caching**: Responses from `/api/nearby` are cached in memory for **10 minutes**, keyed by user coordinates rounded to 3 decimal places (~110-meter precision: `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}`). Repeated queries or nearby movements do not consume additional API credits.
- **Progressive Radius Optimization**: Searches start at **5 km**, expanding to **10 km**, **25 km**, and **50 km** only until at least **8 healthcare facilities** are returned. Requests are made one at a time, stopping immediately once sufficient facilities are found, preserving credits.

### 3. The 4-Step Fallback Chain & Honesty

When searching for healthcare facilities, Sakhi follows a strict, honest multi-tiered fallback hierarchy:

1. **Primary — Geoapify Places API** (via server route `/api/nearby`):
   - Healthcare categories: `healthcare.hospital,healthcare.clinic_or_praxis`.
   - Circle filter with longitude-first coordinates (`circle:lon,lat,radiusMeters`) and proximity bias.
   - Extracts: name, type (`hospital`, `clinic`, `phc`, `chc`), address, phone, opening hours, straight-line distance (`km`), and women's health doctors (strictly when explicitly mentioning gynaecology, obstetrics, or maternity).
   - Source badge displayed: **"Live data, updated just now"** (green/emerald badge).
2. **Secondary — Saved Results** (if user enabled _"Remember my location"_):
   - If Geoapify fails or returns no results, Sakhi checks local storage for previously saved facilities on this device.
   - Source badge displayed: **"Saved results from &lt;time&gt;"** (neutral badge).
3. **Tertiary — OpenStreetMap Overpass API** (one-shot fallback):
   - Queries `https://overpass-api.de/api/interpreter` with a short **8-second timeout**, tried **once** without unresponsive mirrors.
   - If successful, results are rendered with live source indicators.
4. **Final Fallback — Curated Sample Facilities**:
   - If all live services fail, Sakhi falls back to verified sample facilities (`src/data/sampleFacilities.ts`) so users are never left stranded.
   - Source badge displayed: **"Sample data"** (amber badge).
   - Displays a prominent status banner with specific failure reasons:
     - **Unconfigured / Invalid Key**: _"Live search is not configured"_ (with developer console guidance).
     - **Quota Exceeded (429)**: _"Live search limit reached — showing sample facilities"_.
     - **Service Unreachable**: _"Healthcare service unreachable — showing sample facilities"_.
     - **Bad Response**: _"Unable to load live facilities — showing sample facilities"_.
   - Includes an interactive **"Try again"** button to retry live discovery on demand.

### 4. Attribution Requirements

Per the Geoapify and OpenStreetMap licensing terms, attribution is prominently displayed:

- **Under the Facility List**: Links to _"Powered by Geoapify"_ and _"© OpenStreetMap contributors"_.
- **On the Leaflet Map**: TileLayer attribution includes _"Powered by Geoapify | © OpenStreetMap contributors"_.

### 5. Deploying to Production with Environment Variables

When deploying to serverless platforms, set `GEOAPIFY_API_KEY` in your hosting dashboard:

- **Vercel**:
  1. Open your project on [vercel.com](https://vercel.com) $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
  2. Add **Key**: `GEOAPIFY_API_KEY`, **Value**: `<your-api-key>`.
  3. Select all environments (**Production**, **Preview**, **Development**).
  4. Redeploy your application.
- **Cloudflare Pages / Workers**:
  1. Go to **Workers & Pages** $\rightarrow$ select your project $\rightarrow$ **Settings** $\rightarrow$ **Variables and Secrets**.
  2. Add `GEOAPIFY_API_KEY` as an encrypted secret or environment variable.
- **Netlify**:
  1. Go to **Site Configuration** $\rightarrow$ **Environment Variables** $\rightarrow$ **Add a variable**.
  2. Add `GEOAPIFY_API_KEY`.
- **Docker / Self-Hosted VPS**:
  Pass the variable in your `docker-compose.yml` or container environment:
  ```yaml
  environment:
    - GEOAPIFY_API_KEY=your_actual_key_here
  ```

> [!IMPORTANT]
> **Security Notice:** Never prefix `GEOAPIFY_API_KEY` with `VITE_`. Variables without the `VITE_` prefix remain server-side only and are never exposed to the client bundle or browser network requests.

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
│   │   ├── urgent.tsx       # Red-flag hospital & emergency screen (/urgent)
│   │   ├── profile.tsx      # User profile & logout (/profile)
│   │   ├── settings.tsx     # Demo profile loader/clearer, language switch, delete data (/settings)
│   │   ├── care.tsx         # Hospital locator & facilities (/care)
│   │   ├── visit.tsx        # Consolidated doctor visit (questions, visits, summary) (/visit)
│   │   ├── schemes.tsx      # Government health schemes finder (/schemes)
│   │   ├── vault.tsx        # Private PIN-locked document vault (/vault)
│   │   ├── api.chat.ts      # Server route for Ask Sakhi assistant (/api/chat)
│   │   ├── api.nearby.ts    # Server route for healthcare facility search (/api/nearby)
│   │   └── api.geocode.ts   # Server route for village/town geocoding (/api/geocode)
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
