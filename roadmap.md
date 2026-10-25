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
- [ ] **PHASE 1: Doctor visit, schemes, Home dashboard**
- [ ] **PHASE 2: Medicines and reminders**
- [ ] **PHASE 3: Demo profile**
- [ ] **PHASE 4: Care journey and same-day safety**
- [ ] **PHASE 5: Ask Sakhi chat**
- [ ] **PHASE 6: Share with doctor (QR)**

- [x] Phase 2: symptom log, cycle tracker, pattern flags, red-flag screen (awareness cards migrated to Ask Sakhi knowledge base; verified with automated E2E & flow test suite across EN/HI/TE)
- [x] Phase 3: mock prescription scanner, medicines, dose reminders (verified; scan route, dose schedule generation, adherence history, refill alerts, discreet reminders, and unit tests added)
- [x] Phase 4: hospital map, question prep, visit timeline, doctor PDF (verified; Leaflet SSR map with 34 facilities & geolocation fallback, question prep generated from pattern flags & symptoms, visits CRUD with 3-day follow-up reminder banner on Home, printable 1-page A4 doctor summary with native EN/HI/TE support, unit tests passed)
- [x] Phase 5: schemes finder, private vault, demo profile, PWA, offline support & storage error handling (verified; 6 central/state health schemes with quiz, PBKDF2 Web Crypto PIN vault with lockout and IndexedDB storage, 1-tap realistic demo profile loader and clearer in Settings, web app manifest and offline service worker shell caching, sticky offline status banner, robust storage quota/blocked error handling, full 360px mobile accessibility, and complete mock-to-production architecture mapping)
- [x] Responsive Desktop & Mobile Redesign: modern website layout on desktop (>=768px sticky top header with brand, nav links, compact EN/HI/TE language switcher, profile button; max-w-6xl container with privacy footer; 2-3 column Home cards; 2-column Cycle calendar; 2-column Log with desktop progress side panel; 2-column Profile & Settings; modern Landing page with hero & 3-column feature highlights; centered Consent, Signup & Urgent screens; verified at 360px, 768px, and 1280px across English, Hindi, and Telugu with 100% i18n parity and zero broken tests)
- [x] Multilingual Expansion & Dropdown Selector: Replaced segmented language buttons with a reusable accessible `LanguageSelect` dropdown component (globe icon, native script name, chevron, searchable Popover+Command list with checkmarks and $\ge 44$px tap targets; responsive phone popover); expanded from 3 to 11 Indian languages (English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, ଓଡ଼ିଆ) with 100% key parity across 416 keys; SSR-safe dynamic lazy bundle loading (`addResourceBundle`); Noto Sans font fallbacks for all 8 Indic scripts; `-IN` locale date formatting; automated Vitest parity test suite asserting 0 missing keys, 0 extra keys, and matching interpolation parameters.
- [x] Live Location-Based Healthcare Facilities (OpenStreetMap Overpass + Nominatim + OSRM): Replaced hard-coded hospital list with dynamic live queries. Added `src/services/places.ts` using OpenStreetMap Overpass API (`overpass-api.de` with `kumi.systems` fallback mirror), progressive rural radius expansion (5 km $\rightarrow$ 10 km $\rightarrow$ 25 km $\rightarrow$ 50 km until $\ge 8$ centres found), non-blocking OSRM driving distance and travel duration enrichment for the top 10 centres with straight-line "approx" fallback, manual Indian village/town/PIN geocoding box via Nominatim ($\le 1$ req/sec, manual Enter/Search trigger only), comprehensive type tags (Hospital, PHC, CHC, Clinic, Govt, Women's health doctor), multi-tier failure cascade (mirror $\rightarrow$ session cache $\rightarrow$ `src/data/sampleFacilities.ts` with prominent fallback warning banner), 108 emergency priority on `/urgent`, OSM attribution, 22 unit tests with Overpass fixtures, and 100% i18n parity across all 11 locale files.
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
- [x] "Ask Sakhi" Floating Chat Assistant Widget & Service:
  - **Floating Trigger Button**: Positioned fixed at bottom-right (`bottom-20 right-4` on mobile, `bottom-6 right-6` on desktop) sitting strictly above the mobile floating navigation bar so they never overlap. Displays a friendly "Ask Sakhi ✨" speech-bubble tooltip on first visit. Hidden automatically on signed-out pages, consent, signup, `/urgent`, and `/share`.
  - **Accessible Chat Panel**: Bottom sheet on mobile devices (`max-h-[85vh]`), 380px panel anchored bottom-right on desktop. Features Sakhi avatar, clear chat, close, Esc keyboard dismiss, focus trap, and live announcements. Includes permanent safety notice: _"Sakhi shares general information, not medical advice."_
  - **Tappable Suggestion Chips**: 9 curated chips in greeting for zero-typing interaction: _"What is PCOS?"_, _"What are signs of endometriosis?"_, _"Is my cycle normal?"_, _"When should I see a doctor?"_, _"How do I log my symptoms?"_, _"Find a hospital near me"_, _"What government schemes can I get?"_, _"How do I share my records with my doctor?"_, _"Is my data private?"_.
  - **Mode 1 (Knowledge Base)**: 16 intents in `src/data/knowledge.ts` covering PCOS, endometriosis, cycle normalcy, irregular periods, heavy bleeding, period pain, doctor red flags, symptom logging, reminders, finding care, government schemes, doctor summary sharing, privacy vault, and missed medicine dose. Uses Unicode NFC normalisation and space-padded substring matching (avoiding `\w`/`\b` regexes that break on Indian scripts). Includes direct 1-tap action buttons opening `/log`, `/care`, `/visit`, `/schemes`, `/medicines`, or `/vault`.
  - **Mode 2 (Server LLM Route `/api/chat`)**: TanStack Start server route activated only when `LLM_API_KEY` and `LLM_API_URL` exist. Enforces 500-char max, last 6 messages only, rate limiting (~10 req/min/client), 15s timeout, and automatic fallback to Mode 1. Never sends user logs, medicines, or location data to the model.
  - **Storage & Data Wipe**: Chat history saved in local storage (`sakhi:chat_history`) and wiped completely when "Delete all my data" is triggered in Settings.
- [x] Complete Deprecation and Removal of "Learn" Feature:
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
  - **Source Badges & Attribution**: Renders honest badges on `/care` (_"Live data, updated just now"_, _"Saved results from <time>"_, or _"Sample data"_), progressive radius summary label, and licence attribution (_"Powered by Geoapify"_ and _"© OpenStreetMap contributors"_) under the list and on the Leaflet map.
  - **Test Suite**: Added 13 mocked-fetch tests in `src/test/geoapify-places.test.ts` covering successful fixture parsing, progressive radius expansion, quota error (429), invalid key (401), network drop, 4-step fallback sequence, 10-minute caching, rate limit enforcement, and geocoding, with 100% i18n parity across 11 languages.

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

7. **"Ask Sakhi" Floating Chat Assistant**:
   - On signed-in pages (`/home`, `/log`, `/medicines`, `/care`, `/visit`, etc.), inspect the round floating button at the bottom-right.
   - On phone width (e.g. 390px): verify the button sits at `bottom-20`, clearly above the floating pill bottom navigation without overlapping.
   - On first visit: verify the "Ask Sakhi ✨" speech-bubble tooltip appears.
   - Tap the button: verify it opens as a smooth bottom sheet on phones, or an anchored 380px panel on desktop.
   - Verify the permanent safety note: _"Sakhi shares general information, not medical advice."_
   - Tap suggestion chip **"What is PCOS?"**: verify it sends, displays the assistant response with plain-language explanation, and displays the **"Doctor visit"** action link (`/visit`).
   - Tap **"Find a hospital near me"**: verify response displays with **"Find care near me"** action link (`/care`).
   - Type a custom question (e.g. _"I missed my medicine dose"_) and tap Send: verify it returns guidance and links to `/medicines`.
   - Switch language to हिन्दी: verify chips, answers, and interface adapt into Hindi, and typing _"पीसीओएस क्या है"_ returns accurate Hindi response.
   - Press **Escape** or tap Close: panel closes.
   - Verify the widget is NOT present on `/`, `/consent`, `/signup`, or `/urgent`.

8. **Data Deletion Verification**:
   - Go to `/settings` and tap **"Delete all data"**.
   - Confirm deletion.
   - Reopen Ask Sakhi chat: verify conversation history has been completely wiped.
   - Reopen `/visit`: verify visits timeline is empty and question ticks/custom questions are reset.
