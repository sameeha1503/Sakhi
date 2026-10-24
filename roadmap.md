# Sakhi roadmap

- [x] Phase 1: setup, language picker, i18n, nav, fake auth, consent, settings (verified; language sync & navigation guards added)
- [x] Phase 2: symptom log, cycle tracker, pattern flags, red-flag screen, awareness cards (verified with automated E2E & flow test suite across EN/HI/TE)
- [x] Phase 3: mock prescription scanner, medicines, dose reminders (verified; scan route, dose schedule generation, adherence history, refill alerts, discreet reminders, and unit tests added)
- [x] Phase 4: hospital map, question prep, visit timeline, doctor PDF (verified; Leaflet SSR map with 34 facilities & geolocation fallback, question prep generated from pattern flags & symptoms, visits CRUD with 3-day follow-up reminder banner on Home, printable 1-page A4 doctor summary with native EN/HI/TE support, unit tests passed)
- [x] Phase 5: schemes finder, private vault, demo profile, PWA, offline support & storage error handling (verified; 6 central/state health schemes with quiz, PBKDF2 Web Crypto PIN vault with lockout and IndexedDB storage, 1-tap realistic demo profile loader and clearer in Settings, web app manifest and offline service worker shell caching, sticky offline status banner, robust storage quota/blocked error handling, full 360px mobile accessibility, and complete mock-to-production architecture mapping)
- [x] Responsive Desktop & Mobile Redesign: modern website layout on desktop (>=768px sticky top header with brand, nav links, compact EN/HI/TE language switcher, profile button; max-w-6xl container with privacy footer; 2-3 column Home cards; 2-column Cycle calendar; 2-column Log with desktop progress side panel; side-by-side Learn cards; 2-column Profile & Settings; modern Landing page with hero & 3-column feature highlights; centered Consent, Signup & Urgent screens; verified at 360px, 768px, and 1280px across English, Hindi, and Telugu with 100% i18n parity and zero broken tests)
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

## Manual Browser Testing Checklist

1. **Allow Location (Happy Path)**:
   - Navigate to `/care`.
   - Click the **"Use my location"** button and accept the browser's geolocation prompt.
   - Verify the loading indicator (_"Finding care near you..."_) is shown.
   - Confirm live centres are rendered on the Leaflet map and list, sorted by proximity.
   - Verify distance tags show drive time/road distance or "approx", Government badges appear when applicable, and Women's health doctor badges only appear for verified facilities.
   - Verify the radius indicator displays (e.g., _"X centres within 10 km"_).

2. **Deny Location (Permission Denied Fallback)**:
   - Reset geolocation permissions in your browser (click the lock/tune icon beside the URL bar and set Location to "Block" or "Ask").
   - Click **"Use my location"**.
   - Confirm a friendly, clear alert appears explaining location access was denied, keeping the manual search box prominently displayed.

3. **Search a Village / Town / PIN Code (Nominatim Geocoding)**:
   - In the "Search a place" box on `/care`, type an Indian village, town, or PIN code (e.g. `Shamshabad`, `Suryapet`, `Wayanad`, or `501218`).
   - Notice that typing does not trigger autocomplete (per OSM policy). Press **Enter** or tap the **Search** button.
   - Select a matching result from the dropdown list.
   - Verify that the map recenters and live healthcare facilities within the progressive radius are queried and rendered.

4. **Network Offline / Failure (Graceful Degradation)**:
   - Open browser DevTools $\rightarrow$ Network tab $\rightarrow$ Throttling dropdown $\rightarrow$ select **"Offline"**.
   - Navigate to `/care` or `/urgent`.
   - On `/care`: verify the fallback banner displays: _"Showing sample data, no internet or service unavailable"_, rendering reliable offline sample facilities.
   - On `/urgent`: verify the emergency **"Call 108 Ambulance"** button is prominently displayed first and functional even offline, alongside fallback nearest hospital details and the advisory banner.

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
