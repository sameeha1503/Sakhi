# Sakhi roadmap

- [x] **PHASE 0: Audit and Baseline (Completed)**
  - Clean dev server, test suite (15 files, 170 tests passing), lint (0 errors), typecheck (`tsc --noEmit` 0 errors), and production build.
  - Design baseline applied:
    - Warm blush-white background (`#FFF8FA`) with faint mint radial gradient.
    - Curated color tokens: primary teal `#0B7A75`, secondary soft teal `#D9F2EF`, accent berry rose `#C2255C`, success `#276749`, warning `#92580A`, destructive `#B42318` strictly for urgent states, text `#2B1B2E` (contrast ratio 14.6:1).
    - Serif headings (`Lora`, `Rozha One`) configured across `h1`–`h6` with clean sans body (`Baloo 2` and 9 Noto Sans Indic scripts).
    - Slim top bar with app name and language selector across all screen sizes.
    - Floating pill bottom navigation (Home, Log, Medicines, Care, Profile) on all screen sizes with $\ge 44$px tap targets.
    - Home dashboard module cards: 2 columns from 768px, 1 on phones, with tinted borders in accent colors, round icon badges, uppercase tag pills, serif titles, short descriptions, and "Open →" links.
    - Floating chat widget button positioned above the bottom pill navigation on all screen sizes.
  - Learn feature fully removed (route, assets, links, `learn.*` keys; `chat.kb.*` and `flags.*` preserved).
  - Default README replaced with concise Sakhi README.
  - Environment variables: `.env.local` kept gitignored, `.env.example` lists all brief variables, no keys in client code.
- [x] **PHASE 1: Doctor visit, schemes, Home dashboard (Completed)**
- [x] **PHASE 2: Medicines and reminders (Completed)**
- [x] **PHASE 3: Demo profile (Completed)**
- [x] **PHASE 4: Care journey and same-day safety (Completed)**
- [x] **PHASE 5: Ask Sakhi chat (Completed)**
- [x] **PHASE 6: Share with doctor (QR) (Completed)**
- [x] **PHASE 7: Local-First Supabase Cloud Sync & Phone Auth (Completed)**
- [x] **PHASE 8: Top Bar Account Menu & Universal Log Out Flow (Completed)**
  - Round account avatar button next to sync badge and language dropdown ($\ge 44$px tap target, Popover on desktop, bottom sheet on phones).
  - Masked mobile number (`98••••3210`), sync status line, and quick links to Profile and Settings.
  - "Sign in to sync" button when in guest mode or signed out; hidden on chrome-free routes.
  - Safe log out confirmation dialog with up to 3s queue flush, offline unsynced warning, local device synced data cleanup (preserving private vault and language preference), redirect to `/signup`, and toast notification.
  - Reusable flow at bottom of `/settings` and `/profile`. 100% parity across all 11 Indic locales.
- [x] **PHASE 9: Landing Page Overhaul & Honest Privacy (Completed)**
  - Benefit-focused headline ("Understand your body. Get care sooner.") with no repetition of app name in hero.
  - Friendly illustrative UI preview card (mock Today check-in, mini month strip with next period prediction, nearest health centre).
  - 11 Indian language chips with instant switching, header language dropdown.
  - 4 outcome-focused help cards + 5th Ask Sakhi assistant strip with module accent tokens.
  - Honest privacy section ("Your health, your control") removing all obsolete device-only/e2e claims.
  - Always-visible emergency 108 strip with direct `tel:108` dialer button above footer.
  - SEO `<title>` and description head meta tags. 13 unit tests in `src/test/landing.test.tsx` and 100% locale parity.
- [x] **PHASE 10: Emergency Screen (/urgent) Live-Data Guard & Direct Care Access (Completed)**
  - Red layout with prominent "Call 108 ambulance" button rendered immediately on mount, never blocked or delayed.
  - Large secondary button "Find hospitals near me" linking to `/care?locate=1`, triggering immediate geolocation search.
  - Nearest hospital card shown strictly for live data (`geoapify` or `saved`); zero sample data or sample banners shown on emergency screen.
  - Non-blocking "Finding the nearest hospital..." line while locating, timing out after 8 seconds.
  - Calm fallback line when no live hospital is found: "If you can, ask someone to take you to the nearest hospital now."
  - "See all hospitals near you" text link inside live hospital card to `/care?locate=1`.
  - Attribution shown only when live hospital is displayed. 6 unit tests in `src/test/urgent.test.tsx` and 100% 11-locale parity.

- [x] Phase 2: symptom log, cycle tracker, pattern flags, red-flag screen (awareness cards migrated to Ask Sakhi knowledge base; verified with automated E2E & flow test suite across EN/HI/TE)
- [x] Phase 3: manual medicine entry, private vault prescription photo storage (AI prescription reading planned), medicines CRUD, dose reminders (verified; honest manual entry on /scan starting with empty card, direct vault photo saving with PIN lock, dose schedule generation, adherence history, refill alerts, discreet reminders, and unit tests passed)
- [x] Phase 4: hospital map, question prep, visit timeline, doctor PDF (verified; Leaflet SSR map with 34 facilities & geolocation fallback, question prep generated from pattern flags & symptoms, visits CRUD with 3-day follow-up reminder banner on Home, printable 1-page A4 doctor summary with native EN/HI/TE support, unit tests passed)
- [x] Phase 5: schemes finder, private vault, demo profile, PWA, offline support & storage error handling (verified; 6 central/state health schemes with quiz, PBKDF2 Web Crypto PIN vault with lockout and IndexedDB storage, 1-tap realistic demo profile loader and clearer in Settings, web app manifest and offline service worker shell caching, sticky offline status banner, robust storage quota/blocked error handling, full 360px mobile accessibility, and complete mock-to-production architecture mapping)
- [x] Responsive Desktop & Mobile Redesign: modern website layout on desktop (>=768px sticky top header with brand, nav links, compact EN/HI/TE language switcher, profile button; max-w-6xl container with privacy footer; 2-3 column Home cards; 2-column Cycle calendar; 2-column Log with desktop progress side panel; 2-column Profile & Settings; modern Landing page with hero & 3-column feature highlights; centered Consent, Signup & Urgent screens; verified at 360px, 768px, and 1280px across English, Hindi, and Telugu with 100% i18n parity and zero broken tests)
- [x] Multilingual Expansion & Dropdown Selector: Replaced segmented language buttons with a reusable accessible `LanguageSelect` dropdown component (globe icon, native script name, chevron, searchable Popover+Command list with checkmarks and $\ge 44$px tap targets; responsive phone popover); expanded from 3 to 11 Indian languages (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, ଓଡ଼ିଆ) with 100% key parity across 416 keys; SSR-safe dynamic lazy bundle loading (`addResourceBundle`); Noto Sans font fallbacks for all 8 Indic scripts; `-IN` locale date formatting; automated Vitest parity test suite asserting 0 missing keys, 0 extra keys, and matching interpolation parameters.
- [x] Live Location-Based Healthcare Facilities (Geoapify + OpenStreetMap Overpass + Nominatim + OSRM): Replaced hard-coded hospital list with dynamic live queries. Added `src/services/places.ts` using server-side Geoapify API, search across 5 km, 10 km, 25 km, and 50 km merging all nearby facilities (capped at 50 km, true count), non-blocking OSRM driving distance and travel duration enrichment for the top 10 centres with straight-line "approx" fallback, manual Indian village/town/PIN geocoding box via Nominatim ($\le 1$ req/sec, manual Enter/Search trigger only), comprehensive type tags (Hospital, PHC, CHC, Clinic, Govt, Women's health doctor), "Recommended for you" strip, "Prepare for this visit" button on every facility, multi-tier failure cascade (Geoapify $\rightarrow$ saved $\rightarrow$ Overpass $\rightarrow$ `src/data/sampleFacilities.ts` with prominent fallback warning banner), 108 emergency priority on `/urgent`, OSM attribution, 22 unit tests with Overpass fixtures, and 100% i18n parity across all 11 locale files.
- [x] Doctor Consultation QR Code Sharing (`/share`):
  - **On-Device Compact Snapshot**: Compresses selected consultation details (90-day cycle summary, pattern flags, active medicines, recent visits, and doctor questions) directly into the URL fragment (`#d=...`) using `lz-string`.
  - **Zero Server Storage & Complete Privacy**: Nothing is sent to or stored on any cloud server. The link and QR code exist solely on the device.
  - **Privacy Toggles & Size Limit**: Patient toggles exactly what to share (cycle, flags, medicines, visits, questions, and an optional name toggle that defaults to anonymous). Automatically prunes older notes to strictly enforce $\le 1,200$ characters for fast, reliable scanning on budget smartphone cameras, notifying the user when notes were trimmed.
  - **Advisory Expiry**: Patient chooses a 24-hour or 7-day advisory expiry period. The read-only `/share` route validates and visibly indicates expiry status to the doctor without requiring authentication or cookies.
  - **Doctor Read-Only View**: Clean, high-contrast, printable summary readable by any phone browser without login.
- [x] Same-Day Safety Tiers & Clinical Pattern Flags:
  - **Three Same-Day Safety Tiers**: `urgent` (red-flag rules redirecting to `/urgent`), `soon` (see a doctor in the next day or two, e.g. pain 3-4 for 3 consecutive days, or flow heavy twice in 3 days), and `none`.
  - **Calm Post-Save "Soon" Card**: Displayed on `/cycle` when saving today's entry with tier `soon`, featuring direct action buttons for "Find care near me" (`/care`) and "Prepare doctor questions" (`/visit?tab=questions`).
  - **New Pattern Flags**: `lateCycle` (45+ days since last period start) and `ongoingPain` (pain level 3+ on 5 of the last 7 days) with supportive non-diagnostic wording ("worth discussing with a doctor"). Integrated into `FlagCards`, Doctor Summary, and suggested question generators.
- [x] Unified Accessible Design Tokens & Refresh: Single source of truth in `src/styles.css` with CSS variables mapped to Tailwind v4. Replaced palette with background `#FFF8FA` with subtle mint corner gradient (`#F1FBF7`), deep plum foreground `#2B1B2E`, primary teal `#0B7A75`, secondary mint `#D9F2EF` with dark teal `#0A4F4C`, berry rose accent `#C2255C`, warning amber `#92580A` with soft tint `#FFF4DB`, success `#276749`, destructive `#B42318`, faint plum-tinted shadows, visible 2.5px primary focus rings, and 6 module accent tokens (teal, berry, violet, green, amber, coral) for dashboard cards with tinted borders, badge backgrounds, and "Open →" links. Restricted red strictly to severe-symptom states, `/urgent`, and data deletion. 100% WCAG 2.1 AA compliant.
- [x] Consolidated Doctor Visit Module & Government Schemes Top-Level Routes:
  - **Root Cause Fixed**: Child routes `/care/questions`, `/care/visits`, `/care/summary`, and `/care/schemes` were previously shadowed by `src/routes/care.tsx`, which rendered its own complete page without an `<Outlet />`.
  - **Consolidated `/visit` Route**: Top-level route using type-safe zod search parameter validation (`?tab=questions|visits|summary`, default `questions`). Features a sleek pill-style tab bar:
    - **Questions tab**: Generates suggested questions from logged symptoms, cycle patterns, pattern flags (with clear "Why this question" explanation), active medicines, and mood/sleep patterns, alongside universal wellness questions. Checkbox ticking, custom question adding, and deletion.
    - **Visits tab**: Timeline of consultations (date, doctor/clinic, reason, notes, linked medicines, next follow-up date). Add, edit, delete with simple large-input form. Upcoming follow-up banner at top.
    - **Summary tab**: One-page printable summary with name, 90-day cycle statistics, pattern flags worded supportively ("worth discussing with a doctor"), active medicines, recent visits, and ticked questions. A4 print stylesheet and "Download / Print PDF" button using native browser print dialog for pristine Indic script rendering. Non-diagnostic safety disclaimer: _"Sakhi shares patterns and questions only. It does not diagnose."_
  - **Government Schemes (`/schemes`)**: Dedicated top-level route with 4 big-button questions (age, pregnancy, household category, state) matching schemes from `src/data/schemes.ts` (PM-JAY, Arogya Mandirs, JSY, PMMVY, PMSMA, JSSK) with what it offers, documents to carry, and official links.
  - **Home Dashboard**: Wide "Doctor visit" module card (tag: `RECORDS`) with 3 step buttons (1 Prepare questions, 2 Log a visit, 3 Doctor summary) and upcoming follow-up badge ("Follow-up in 2 days"). Dedicated Government schemes module card.
  - **Global Card/Link Audit**: Replaced shadowed card row on `/care` with two clean cards ("Doctor visit" $\rightarrow$ `/visit`, "Government schemes" $\rightarrow$ `/schemes`), updated `FlagCards` and `DoseReminders` links, and verified all 117 Vitest tests passing with 100% i18n key parity across 11 languages.
- [x] "Ask Sakhi" Live Streaming AI Assistant & Safety Guardrails:
  - **Live Token-by-Token Streaming**: OpenAI-compatible server-sent events (SSE) via `/api/chat` with `text/event-stream`, `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no`. Features typing indicator before first token and interactive **Stop** button that halts both the browser reader and cancels the upstream provider call on the server.
  - **Reasoning Model Optimization & Fast Models**: Automatically detects reasoning models (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`), sets `reasoning_effort: "low"`, `reasoning_format: "hidden"`, and raises `max_tokens: 800` so chain-of-thought tokens never delay or starve the visible output. Seamlessly supports ultra-fast non-reasoning chat models (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) without sending incompatible reasoning parameters.
  - **Streaming Timeouts & Resilient Fallback**:
    - **8-Second First Token Timeout**: If no visible content token arrives within 8 seconds, client immediately aborts the upstream stream and falls back to offline answers.
    - **25-Second Total Duration Cap**: Prevents indefinite hanging on sluggish networks.
    - **Anti-Queue Concurrency Guard**: Disables secondary message submission while generation is active; immediately re-enables and restores focus after completion, failure, or Stop.
    - **Idempotent Stream Closure**: Gracefully handles `data: [DONE]`, partial SSE line buffers, and provider error events without hanging on keep-alive sockets.
  - **Strict Local Safety Layer**: Intercepts emergency queries (108, chest pain, heavy bleeding), emotional distress (Tele-MANAS 14416, 112), and refused medical requests (dosages, diagnoses, home abortions) entirely on the client before ANY external AI call is made. Renders immediate action buttons (`tel:108`, `tel:14416`, `tel:112`, `/urgent`, `/care`) with zero latency.
  - **Educational Clinical Guardrails**: Injects a strict system prompt tailored to the active Indic language (<language name>): short sentences for limited literacy, women's health focus (periods, PCOS, nutrition, hygiene, mental wellbeing), under 120 words, zero medical diagnosis or prescribing.
  - **Automated Dosage Guard**: Server-side output guard scans all AI responses for medication dosing patterns (`\b\d+\s*(?:mg|ml|tablets?|capsules?)\b`) and automatically replaces them with a safety disclaimer: _"Please ask your doctor or pharmacist about medicines and doses."_
  - **Resilience & Fallback Sequence**:
    - **Sliding-Window Rate Limiting**: ~10 requests/min per IP with single-concurrency lock (1 request at a time per client).
    - **Daily Budget Tracking**: In-memory count of successful AI calls resetting at midnight (default 400 calls; `LLM_DAILY_LIMIT`). Emits clear server logs and smoothly falls back to the offline knowledge base once reached.
    - **Multi-Provider Fallback**: Automatically tries `LLM_FALLBACK_URL`/`LLM_FALLBACK_KEY`/`LLM_FALLBACK_MODEL` on primary 429, 5xx, or 20s timeout before falling back to the 16 curated offline intents.
    - **30-Minute Server Cache**: Caches suggestion-chip queries per language for instant responses and credit conservation.
    - **Secure Error Handling**: On 401/403 logs developer guidance and falls back; on 429 informs user _"The assistant is busy, here is a quick answer"_; never displays raw API keys or provider errors to users.
  - **Honest UI Labels**: Displays _"AI-generated, general information only"_ below AI responses and _"Offline answer"_ below fallback knowledge-base answers.
  - **Zero Personal Data**: Sends only the last 6 messages and the system prompt. Never includes user health logs, medicines, location, or personal vault documents.
  - **11-Locale Parity**: All 10 new strings (`chat.labelAi`, `chat.labelOffline`, `chat.stop`, `chat.busyNotice`, `chat.dosageDisclaimer`, `chat.distressNotice`, `chat.refusedMedicalNotice`, `chat.actions.*`) localized across all 11 Indian languages with 100% test parity.
- [x] Complete Deprecation and Removal of "Learn" Feature:
- [x] Monthly Cycle Calendar & Day-by-Day Historical Tracker:
  - **Month Grid & Accessible Navigation**:
    - 7-column calendar grid starting on **Monday**, responsive from 360px width with $\ge 44$px tap targets.
    - Previous/Next navigation constrained to past 24 months up to current month (no future navigation beyond current month).
    - Quick month & year jump dropdown sheet. Month and weekday labels localized via `Intl.DateTimeFormat(lang + "-IN", ...)` with clear Latin digits.
    - Date cell indicators: flow dots (light, medium, heavy in accent rose; `veryHeavy` in destructive), pain marker ($\ge 3$), symptom dot, today ring, selected day highlight, muted unselectable future days, dashed outline for predicted next period dates, and a quick legend.
    - Accessibility: full grid semantics (`role="grid"`, `role="row"`, `role="gridcell"`) with rich aria-labels (e.g. _"12 October, period, pain level 3, 2 symptoms logged"_).
    - Summary banner above grid: days logged this month, period days, and highest pain level.
  - **Day Detail Panel (Mobile Sheet / Desktop Side Panel)**:
    - Displays complete saved entry: flow, pain areas & level, mood, energy, sleep, symptoms, cycle day number, and optional personal note (up to 300 chars).
    - If empty: friendly "No entry for this day" with "Add entry" button (past days and today only).
    - "Edit this day" and "Add entry" load `/log?date=YYYY-MM-DD`.
    - "Delete this entry" with confirmation modal.
  - **Check-in Wizard Backfill & Targeted Redirects**:
    - `/log?date=YYYY-MM-DD` validates date param with Zod (rejects future dates, defaults to today).
    - Shows backfill notice banner when editing or logging a past day.
    - Free-text personal notes textarea (max 300 chars with live counter) in step 3.
    - **Safe Urgent Redirect**: Severe red-flag entries redirect to `/urgent` **only when saving today's entry**; backfilled or edited older entries safely return to the calendar at `/cycle?date=YYYY-MM-DD&saved=true` with a confirmation toast.
  - **Reliable Storage & Backup/Restore**:
    - Replaced `toISOString().slice(0, 10)` with local-time `formatLocalDate()` using local year, month, and day, eliminating timezone day-shift bugs in India (`UTC+05:30`).
    - Schema versioning (`LOGS_SCHEMA_VERSION = 2`) with migration, sanitization, and fallback defaults.
    - Settings -> "Backup": "Download my data" (JSON export) and "Restore from backup" (Zod schema validation, overwrite confirmation modal).
    - Local privacy disclaimer in Settings informing users data is stored on-device.
    - Demo profile data populates calendar; "Delete all my data" completely wipes all entries and notes.
    - 100% key parity across all 11 Indian languages and 16 unit tests in `src/test/cycle-calendar.test.ts`.
- [x] Awareness Cards (Floating, inside Ask Sakhi):
  - **Floating Trigger & Tabbed Panel**:
    - Embedded into `AskSakhiWidget.tsx` with a dedicated floating "Learn" pill button with a lightbulb icon stacked right above the chat trigger button.
    - Same visibility constraints: hidden on `/`, `/consent`, `/signup`, `/urgent`, `/share`; proper `bottom-20` / `bottom-6` offsets avoiding mobile navigation overlap.
    - Dialog includes two accessible tabs: **"Ask"** (live assistant) and **"Learn"** (awareness cards carousel).
  - **8 Educational Awareness Cards (`src/data/awarenessCards.ts`)**:
    - PCOS overview (`pcos_what`) & PCOS signs (`pcos_signs`).
    - Endometriosis overview (`endo_what`) & Endometriosis signs (`endo_signs`).
    - Normal cycle guidelines (`cycle_normal`).
    - When to see a doctor (`when_doctor`).
    - Urgent care red flags (`urgent_care` $\rightarrow$ `/urgent`).
    - Eating & anaemia basics (`anemia_basics` $\rightarrow$ `/schemes`).
  - **Rule-Based Personalization & Non-Diagnostic Language**:
    - Orders cards lightly based on on-device pattern flags (`irregularPlus`, `painCycle`, `heavyRepeat`) showing relevant cards first with a supportive **"Because of what you logged"** badge.
    - Strictly non-diagnostic language: uses only supportive phrases ("may", "can be a sign", "worth discussing with a doctor"); never "you have" or "you are diagnosed".
    - Disclaimer footer on every card: _"Sakhi shares general information, not medical advice. Please see a doctor if you are worried."_
  - **Controls, Offline Storage & 11-Locale Parity**:
    - Mobile touch swipe and keyboard arrow navigation (Left/Right).
    - Progress dots and Next/Back buttons with $\ge 44$px touch targets.
    - Persists last viewed card via storage adapter (`src/services/storage.ts`) and wipes on "Delete all my data".
    - Works 100% offline with zero network calls.
    - 100% parity across all 11 Indic languages under `awareness.*` namespace with 8 Vitest unit tests in `src/test/awareness-cards.test.tsx`.
  - **Removed Route & Assets**: Deleted `src/routes/learn.tsx` and static imagery `src/assets/learn-pcos.jpg` and `src/assets/learn-endo.jpg`.
  - **Replaced Links with Ask Sakhi**: Pattern flags banner on Cycle page now features an **"Ask Sakhi"** button (dispatches custom event to open the chat widget with relevant contextual questions: _"What is PCOS?"_, _"What are signs of endometriosis?"_, or _"Is my cycle normal?"_) alongside doctor visit preparation.
  - **Rebalanced Home Dashboard**: Symmetrical 6-card grid below the Doctor Visit banner (2 rows of 3 on desktop, 3 rows of 2 on tablet) eliminating trailing odd gaps.
  - **100% i18n Cleanliness**: Removed all `learn.*` keys across all 11 Indic language files while preserving `chat.kb.*` educational answers and `flags.*` pattern detection strings. Tested 0 missing/extra keys.
  - **Zero Broken Links**: Audited all app links and verified zero references to `/learn` or obsolete routes.

- [x] Primary Live Healthcare Places via Geoapify & 4-Step Fallback Chain:
  - **Replaced Unreliable Overpass**: Switched primary live hospital & healthcare directory provider from Overpass (which suffered frequent 502 capacity errors and unresponsive mirrors) to **Geoapify Places API v2** and **Geoapify Geocoding API v1**, preserving data access strictly behind the typed `src/services/places.ts` contract.
  - **Server-Side API Routes**:
    - `/api/nearby`: TanStack Start server route reading `GEOAPIFY_API_KEY` (server-side only, never prefixed with `VITE_`, never exposed to browser or responses). Enforces sliding-window rate limiting (~10 req/min/IP), 10-minute in-memory cache keyed by coordinates rounded to 3 decimals (`lat.toFixed(3), lng.toFixed(3)`), India-sized bounds validation (lat: 6.0–38.5, lng: 68.0–98.5, radius $\le 50$ km), circle filter with longitude-first coordinates (`circle:lon,lat,radiusMeters`), proximity bias, and healthcare categories (`healthcare.hospital,healthcare.clinic_or_praxis`).
    - `/api/geocode`: TanStack Start server route proxying Indian village/town/PIN queries to Geoapify Geocoding API (`filter=countrycode:in`, limit 5) with rate limiting and 10-minute caching.
  - **Progressive Radius Optimization**: Searches 5 km, 10 km, 25 km, and 50 km progressively, one request at a time, halting as soon as at least 8 healthcare facilities are found to conserve the free daily quota of 3,000 credits.
  - **Clean Place Typing**: Parses facility type (`hospital`, `clinic`, `phc`, `chc`), normalized callable phone or `null`, opening hours or `null`, distance in km, and women's health flags **strictly** when data explicitly mentions gynaecology, obstetrics, or maternity.
  - **4-Step Fallback Chain & Honesty**:
    1. Geoapify Places (via `/api/nearby` with progressive radius expansion).
    2. Saved results (if user enabled _"Remember my location"_ on this device).
    3. Overpass via `overpass-api.de` with a short 8-second timeout, tried once.
    4. Curated sample facilities (`src/data/sampleFacilities.ts`) with prominent banner and specific failure reasons:
       - **Unconfigured**: _"Live search is not configured"_ (with developer console guidance).
       - **Quota Exceeded (429)**: _"Live search limit reached — showing sample facilities"_.
       - **Service Unreachable**: _"Healthcare service unreachable — showing sample facilities"_.
       - **Bad Response**: _"Unable to load live facilities — showing sample facilities"_.
       - Interactive **"Try again"** button.
  - **Test Suite**: Added 13 mocked-fetch tests in `src/test/geoapify-places.test.ts` covering successful fixture parsing, progressive radius expansion, quota error (429), invalid key (401), network drop, 4-step fallback sequence, 10-minute caching, rate limit enforcement, and geocoding, with 100% i18n parity across 11 languages.

- [x] Pan-India Government Schemes Overhaul (All 28 States & 8 UTs, 3 Tiers, Check-in Personalization):
  - **All 36 States & Union Territories**: Added searchable, keyboard-accessible selector (bottom sheet on phones, dialog on desktop) covering all 28 states and 8 union territories, defaulting to detected or last chosen state without restricting the user's choices.
  - **Three Collapsible Tiers**:
    - **Tier 1 ("Made for women")**: Prominently placed at the top with accent/pink styling, count badge, and alert banner: _"Many women miss these. You may qualify for N schemes made for women."_ Covers maternity, cancer screening, menstrual hygiene, nutrition/anaemia, and women-specific state welfare.
    - **Tier 2 ("Health schemes you may also qualify for")**: Comprehensive general health coverage including Ayushman Bharat PM-JAY (with state-specific portal links), Ayushman Arogya Mandirs, and free diagnostics.
    - **Tier 3 ("Other support")**: Verified state cash transfers and welfare programs for women's socioeconomic wellbeing.
  - **Official Verification (No Inventions)**: Every scheme contains `officialUrl`, `sourceUrl`, and `verifiedOn: "2026-10-25"`. Verified state schemes across 20 largest/priority states (UP, MH, BR, WB, MP, TN, RJ, KA, GJ, AP, OD, TS, KL, JH, AS, PB, CG, HR, DL, GA). Remaining 16 states & UTs show national schemes plus verified health department fallback cards. Zero invented schemes for PCOS/endometriosis.
  - **Personalization & On-Device Patterns**: Uses 4 finder questions (age group, maternal status, household category, state) plus private on-device pattern switch (default ON). Automatically highlights anaemia support (AMB) if heavy bleeding logs exist and free cancer screening (Arogya Mandir) for women 30+.
  - **My List Tracker & Reminders**: Tracks "Saved", "Applied", and "Received" statuses in local storage (cleared upon data wipe). Offers monthly 9th PMSMA antenatal reminder and 30+ cancer screening reminder. Links schemes to `/care` for local health centre delivery.
  - **Home Dashboard Indicator**: Shows _"N schemes made for women you may qualify for"_ and an active unread indicator dot until the user opens the schemes page.
  - **Test Suite**: 14 tests in `src/test/schemes.test.ts` asserting 36 states/UTs, national scheme coverage, required fields, tier sorting, personalization, tracker persistence, and reminders, plus 100% key parity across all 11 Indic languages in `locales-parity.test.ts`.

## Manual Browser Testing Checklist

1. **Allow Location (Happy Path — Geoapify Live Search)**:
   - Make sure `GEOAPIFY_API_KEY` is set in `.env.local`.
   - Run `npm run dev` and navigate to `http://localhost:8080/care`.
   - Click the **"Use my location"** button and accept the browser's geolocation prompt.
   - Verify the loading indicator (_"Finding care near you..."_) displays.
   - Confirm live healthcare centres near you appear on the Leaflet map and in the facility list, sorted by proximity.
   - Verify the source badge displays: **"Live data, updated just now"** (green/emerald badge).
   - Verify the radius header displays the correct range (e.g., _"X centres within 10 km"_).
   - Check attribution at the bottom of the list and on the map: links to _"Powered by Geoapify"_ and _"© OpenStreetMap contributors"_.

2. **Deny Location then Search a Place (Geocoding)**:
   - Reset geolocation permissions in your browser (click the tune/lock icon beside the URL bar $\rightarrow$ set Location to "Block" or "Ask").
   - Reload `/care` and click **"Use my location"**.
   - Confirm the red alert appears explaining permission was denied, and the "Search a place" box is revealed.
   - In the search input, type an Indian village, town, or PIN code (e.g. `Shamshabad`, `Suryapet`, `Wayanad`, or `500096`).
   - Notice that typing does **not** trigger autocomplete on keystroke. Press **Enter** or click **Search**.
   - Select a matching result from the dropdown list.
   - Verify that the map recenters to the selected location, live facilities are queried progressively via `/api/nearby`, and the list updates.

3. **Turn the Network Off (Offline / Unreachable Fallback)**:
   - Open browser DevTools $\rightarrow$ **Network** tab $\rightarrow$ Throttling dropdown $\rightarrow$ select **"Offline"**.
   - On `/care`, click **"Change location"** and search a place or click **"Try again"**.
   - Confirm that Sakhi does not crash or hang.
   - Verify the fallback banner displays: **"Healthcare service unreachable — showing sample facilities"**.
   - Confirm the source badge displays: **"Sample data"** (amber badge).
   - Click the **"Try again"** button in the banner.
   - In DevTools, set throttling back to **"No throttling"** (Online) and click **"Try again"** $\rightarrow$ verify live search recovers smoothly.

4. **Missing or Invalid Key (Unconfigured State)**:
   - Temporarily clear `GEOAPIFY_API_KEY` in `.env.local` (or set an invalid value like `bad_key`).
   - Open DevTools **Console**.
   - Reload `/care`.
   - Verify the console logs the developer guidance:
     `[care] Live search is not configured: GEOAPIFY_API_KEY is missing or invalid. See README.md ('Environment Variables') to set up your free Geoapify key.`
   - Verify the banner displays: **"Live search is not configured"** with a **"Try again"** button.
   - Restore your valid key in `.env.local` and click **"Try again"** $\rightarrow$ live data returns.

5. **Consolidated Doctor Visit (`/visit`)**:
   - On `/home`, inspect the wide "Doctor visit" module card (tag: `RECORDS`).
   - Tap **"1 Prepare questions"** $\rightarrow$ opens `/visit?tab=questions`. Verify "Why this question" appears under flag and symptom questions. Tick a question and add a custom question.
   - Tap **"2 Log a visit"** $\rightarrow$ opens `/visit?tab=visits`. Tap "Log a visit", enter a visit with a follow-up 2 days away, and save.
   - Tap **"3 Doctor summary"** $\rightarrow$ opens `/visit?tab=summary`. Verify one-page printable layout, ticked questions, recent visit, pattern flags, and non-diagnostic note: _"Sakhi shares patterns and questions only. It does not diagnose."_ Tap "Download / Print PDF" to preview A4 print layout.
   - Return to `/home` and verify the Doctor visit card now displays the **"Follow-up in 2 days"** badge.

6. **Government Schemes Finder (`/schemes`)**:
   - Tap "Government schemes" on `/home` or `/care` $\rightarrow$ opens `/schemes`.
   - Answer the 4 quick eligibility questions (age, pregnancy, household category, state) and tap "See matching schemes".
   - Verify matching scheme cards display benefits, documents to carry, and official portal links.

7. **"Ask Sakhi" Live AI Streaming Assistant & Safety Testing**:
   - **Positioning & Responsive Layout**:
     - On desktop ($\ge 768$px): Floating button sits fixed at `bottom-6 right-6`. Tapping it opens a clean 380px panel anchored to the bottom-right.
     - On phone width (e.g. 390px): Floating button sits at `bottom-20 right-4`, comfortably above the floating bottom navigation bar without overlapping. Tapping opens a smooth bottom-sheet drawer (`max-h-[85vh]`).
     - On first load: speech-bubble tooltip _"Ask Sakhi ✨"_ appears.
     - Verify widget is hidden on signed-out routes (`/`, `/consent`, `/signup`, `/urgent`, `/share`).
   - **Test 1: Live AI Streaming (Question NOT in knowledge base)**:
     - **English**: Type a novel health question not in the 16 offline intents (e.g., _"Can drinking warm water with lemon help my digestion during periods?"_).
       - Verify animated typing indicator appears before the first token.
       - Verify words stream in live token-by-token.
       - Verify the **Stop** button appears while streaming and tapping it halts generation.
       - Verify the source label at the bottom reads: **"AI-generated, general information only"**.
     - **हिन्दी (Hindi)**: Switch language to हिन्दी from the top bar dropdown. Type _"पीरियड्स के दौरान क्या खाने से कमजोरी कम होती है?"_.
       - Verify the answer streams live in simple Hindi.
       - Verify the footer reads: _"एआई द्वारा जनरेट, केवल सामान्य जानकारी"_.
     - **తెలుగు (Telugu)**: Switch language to తెలుగు. Type _"పీరియడ్స్ సమయంలో ఎలాంటి ఆహారం తీసుకోవాలి?"_.
       - Verify the answer streams live in simple Telugu.
       - Verify the footer reads: _"AI-సృష్టించినది, సాధారణ సమాచారం మాత్రమే"_.
   - **Test 2: Emergency Safety Interception (No AI Call, Instant)**:
     - In English, type an emergency query: _"I am bleeding very heavily and feeling dizzy"_ or _"Call 108"_.
       - Verify response appears **instantly** without typing indicator or AI latency.
       - Verify direct emergency dialer button appears: **"Call 108"** (`tel:108`) and link to **"Emergency guidance"** (`/urgent`).
     - In Hindi, type: _"मुझे बहुत चक्कर आ रहे हैं और बहुत ज्यादा ब्लीडिंग हो रही है"_.
       - Verify instant Hindi emergency response with **"108 पर कॉल करें"** button.
     - In Telugu, type: _"ఎక్కువ రక్తస్రావం అవుతోంది తల తిరుగుతోంది"_.
       - Verify instant Telugu emergency response with **"108 కి కాల్ చేయండి"** button.
   - **Test 3: Dosage Guardrail & Medical Refusal**:
     - Type: _"What dose of meftal spas or paracetamol should I take for period pain?"_ or _"How many 500mg tablets should I take?"_.
       - If intercepted by local safety, verify message refuses dosing and instructs seeing a doctor.
       - If answered by AI, verify any dosage pattern (e.g. 500mg, 10 ml, 2 tablets) is automatically replaced with: _"Please ask your doctor or pharmacist about medicines and doses."_
   - **Test 4: Offline / Fallback Transparency**:
     - If `LLM_API_KEY` is not set or network is disconnected:
       - Tap any suggestion chip (e.g. _"What is PCOS?"_).
       - Verify offline answer is rendered with source label: **"Offline answer"**.

8. **Data Deletion Verification**:
   - Go to `/settings` and tap **"Delete all data"**.
   - Confirm deletion.
   - Reopen Ask Sakhi chat: verify conversation history has been completely wiped.
   - Reopen `/visit`: verify visits timeline is empty and question ticks/custom questions are reset.

9. **Top Bar Account Menu & Universal Log Out Flow**:
   - **Signed-in view**: Sign in with phone & PIN. Inspect top bar next to language selector and sync badge.
     - On desktop ($\ge 768$px): Click round teal initial avatar $\rightarrow$ Popover opens showing user name, masked number (e.g. `98••••3210`), sync status line ("Synced" / "Saving..." / "Offline, will sync later"), "My profile" (`/profile`), "Settings" (`/settings`), and calm neutral/berry "Log out" button.
     - On phone ($< 768$px, e.g. 360px): Tap round teal avatar $\rightarrow$ clean accessible Bottom Sheet opens with identical items and $\ge 44$px tap targets.
   - **Signed-out / Guest view**: When guest or signed out, avatar is replaced by a "Sign in to sync" link leading to `/signup`.
   - **Chrome-free routes**: Hidden on `/`, `/consent`, `/signup`, `/urgent`, `/share`.
   - **Log Out Confirmation Flow**:
     - Tap "Log out" $\rightarrow$ Confirmation dialog opens: _"Log out of Sakhi? Your data is safe in your account. Log in with your number and PIN to see it again on any phone."_ Buttons: "Stay logged in" and "Log out".
     - When unsynced changes exist and offline: warns _"You have changes that have not synced. Log out anyway?"_ with an option to stay.
     - On confirmation: flushes pending sync writes (max 3s), clears synced data from local storage on this phone, preserves private vault (PIN & lockout) and language preference, and redirects to `/signup` with toast _"You have been logged out"_.
   - **Consistent Entry Points**: Verified identical "Log out" button at bottom of `/settings` and `/profile`.

10. **Landing Page Overhaul & Honest Privacy (`/`)**:

- **Header & Hero Repetition**:
  - Header shows logo + "Sakhi" + tagline "Your health friend" with language dropdown on the right.
  - Benefit headline appears in serif `h1`: _"Understand your body. Get care sooner."_ (app name is not repeated).
  - Subtitle describes 30-second tracking, finding care, and discovering government schemes.
  - Small line under "Get started": _"Takes 1 minute. No email needed."_
  - Secondary link: _"I already have an account"_ routes directly to `/signup` in login mode.
- **Language Chips**:
  - Row of 11 native language chips (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, ଓଡ଼ିଆ).
  - Tapping any chip immediately switches the entire page language and updates the active chip highlight without reloading.
- **UI Showcase Preview Card**:
  - Clearly illustrative preview card with an uppercase "Example" tag.
  - Displays mock Today check-in (Medium flow, Calm mood, Mild cramps), mini calendar strip with Next period indicator, and nearest health centre row.
- **How Sakhi Helps (4 Cards + 5th Strip)**:
  - 4 cards using module accent tokens (teal, berry, violet, green) with outcome-focused headlines and descriptions: _"Notice patterns early"_, _"Be ready for the doctor"_, _"Find care near you"_, and _"Never miss a scheme"_.
  - 5th strip highlighting _"Ask Sakhi"_ with clear non-diagnostic and no-prescribing disclaimer.
- **Honest Privacy Section**:
  - Section titled _"Your health, your control"_, explicitly noting number + 6-digit PIN login, guest mode on-device storage, PIN-locked prescription vault photos, 1-tap complete data deletion, and non-diagnostic guidance (zero claims of "never leaves device" or "end-to-end encrypted").
- **Emergency Strip & Footer**:
  - Calm emergency strip above footer: _"In an emergency call 108"_ with a direct `tel:108` dial button.
  - Clean footer with _"Made for women across India. Sakhi shares information, not medical advice."_ and link to Privacy & Consent.

11. **Emergency Urgent Screen Overhaul (`/urgent`)**:

- **Immediate 108 Ambulance Priority**:
  - "Call 108 ambulance" button rendered immediately on initial mount as the first, largest, and most prominent element.
  - Never blocked or delayed by loading spinners or redirects.
- **Strict Live-Only Nearest Hospital Card**:
  - Hospital card shown strictly when sourced from live data (`geoapify` or locally saved live result).
  - All sample data and sample warning banners completely removed from `/urgent`.
  - While locating, a calm text line _"Finding the nearest hospital..."_ appears beneath the 108 button with an 8-second timeout.
  - Fallback text when live data is unavailable: _"If you can, ask someone to take you to the nearest hospital now."_
- **Care Integration**:
  - Large secondary button _"Find hospitals near me"_ (MapPin icon) linking to `/care?locate=1`.
  - Text link on live hospital card: _"See all hospitals near you"_ linking to `/care?locate=1`.
  - `/care` automatically starts live location search flow on arrival when `locate=1` is present.
- **Attribution & Back Navigation**:
  - OSM / Geoapify attribution shown only when live hospital is rendered.
  - Back link uses `goBack` helper with `/home` fallback.

12. **Universal Consistent Back Button System**:

- **Shared Reusable Component (`src/components/BackButton.tsx`)**:
  - Accessible pill button with arrow-left icon and "Back" label (`aria-label="Go back"`).
  - 44px+ tap targets (`min-h-[44px]`), RTL flipping support, and soft design tokens.
  - Placed top-left of the content area in `AppShell` above page titles, ensuring it never overlaps titles at 360px or gets hidden behind bottom navigation.
- **In-App History Navigation vs. Fallback Helper (`src/services/navigation.ts`)**:
  - If browser history has a previous page within Sakhi (`canGoBackInApp()`), navigates back using `router.history.back()`.
  - If opened directly, from QR share link, or after a refresh, navigates to `/home` (or `/` if logged out).
- **Route Filtering**:
  - Excluded routes: `/`, `/home`, `/consent`, `/signup`, `/urgent`, `/share*`.
  - Included routes: `/log`, `/cycle`, `/medicines`, `/scan`, `/vault`, `/care`, `/visit`, `/schemes`, `/profile`, `/settings`.
- **Special Cases**:
  - `/log`: Intercepts unsaved changes using `BackHandlerContext` (`useBackHandler`) to display modal dialog _"Leave without saving?"_ with **Stay** and **Leave** buttons.
  - `/visit`: Tab switches via `?tab=` search param use `replace: true` so going back returns to previous page rather than cycling through each tab.
  - `/cycle`: Navigating to `/cycle` after saving check-in uses `replace: true` so back returns to page before check-in.
  - `/vault`: Locks unlocked vault upon back navigation.
- **11-Locale Parity**:
  - Added `common.back`, `common.goBack`, `log.unsavedTitle`, `log.unsavedBody`, `log.stay`, `log.leave` across all 11 Indic locale files.
