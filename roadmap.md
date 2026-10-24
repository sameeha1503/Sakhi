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

7. **Data Deletion Verification**:
   - Go to `/settings` and tap **"Delete all data"**.
   - Confirm deletion.
   - Reopen `/visit`: verify visits timeline is empty and question ticks/custom questions are reset.
