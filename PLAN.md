PROJECT BRIEF: "Sakhi", a women's healthcare companion web app for urban and rural women in India (hackathon problem statement PS1: Women's Healthcare). Stack: TanStack Start + React 19 + Tailwind 4 + i18next. Do NOT change the stack or restructure the project.

FIRST: save this entire brief verbatim as PLAN.md in the project root. At the start of every phase, re-read PLAN.md, AGENTS.md and roadmap.md. Then run PHASE 0 and stop.

HOW TO WORK

- Work phase by phase. After each phase: run tests, lint, typecheck and a production build and fix failures; update roadmap.md; give me a short list of what to test in the browser; then STOP and wait for me to say "Continue".
- Some of this may already exist. In every phase, first check what is already built and working. Do not rebuild it; fix and complete only what is missing or broken, and tell me what you found.

HARD RULES (all phases)

- All data access goes through src/services/*. Anything storing user data uses the storage service so "delete my data" wipes it.
- Every UI string lives in the locale files in src/i18n/locales/*.json. Add each new key to ALL existing locale files with identical keys, in simple natural language for women with limited literacy. A test must fail if any file is missing a key.
- Browser storage and browser APIs only in effects or handlers (server-rendered app). Never hand-edit src/routeTree.gen.ts. Use design tokens, not hard-coded colours.
- Rural-friendly UI: large tap targets (44px minimum), icon-first, few words per screen, one main action per screen. No voice input.
- The app informs and never diagnoses or prescribes. Notifications never name a medicine or condition.
- Secrets: never read, print, log or commit .env.local; never put keys in client code; keep .env.local in .gitignore; list every variable (empty) in .env.example. Never ask me to paste a key into chat; I will paste keys into .env.local myself. Variables: GEOAPIFY_API_KEY, LLM_API_URL, LLM_API_KEY, LLM_MODEL, optional LLM_DAILY_LIMIT, LLM_FALLBACK_URL, LLM_FALLBACK_KEY, LLM_FALLBACK_MODEL.
- Every card, button and link must open the correct existing page. No dead links or placeholders that redirect elsewhere.

PHASE 0: Audit and baseline

- Install, run the dev server, tests, lint and build; fix failures. Walk the app and list which routes and features exist, which are broken and which are missing, compared with this brief. Report before fixing large things.
- Design baseline (apply if missing): warm blush-white background (#FFF8FA) with a faint mint gradient; primary teal #0B7A75; secondary soft teal #D9F2EF; accent berry rose #C2255C (periods and women's health); success #276749; warning #92580A; destructive #B42318 only for urgent states; text #2B1B2E; serif headings, clean sans body. Home is a dashboard of rounded module cards (2 columns from 768px, 1 on phones) with a tinted border in each card's accent colour, a round icon badge, a small uppercase tag pill, a serif title, a short description and an "Open" link. A floating pill bottom navigation (Home, Log, Medicines, Care, Profile) on all screen sizes and a slim top bar with the app name. Check contrast (4.5:1 text).
- Remove the Learn feature completely (route, images, links, learn.* keys). Keep chat.kb.* and flags.* keys.
- Replace the default README with a short Sakhi README.

PHASE 1: Doctor visit, schemes, Home dashboard

- /visit with validated search param ?tab=questions|visits|summary (top-level route, not nested under /care).
  - Questions tab: suggested questions from her logged data and pattern flags plus generic ones; tick to bring; add her own.
  - Visits tab: timeline (date, clinic, reason, notes, linked medicines, next follow-up); add, edit, delete; upcoming follow-ups on top; empty state.
  - Summary tab: one-page printable summary (name, last 90 days of cycle and symptoms, pattern flags worded "worth discussing with a doctor", current medicines, recent visits, ticked questions). A4 print stylesheet and a "Download PDF" button that opens the browser print dialog. Do NOT use jsPDF (it cannot render Indian scripts).
- /schemes: finder with 3-4 big-button questions (age group, pregnant or not, household category, state) and a static curated list: PM-JAY (free hospital cover up to Rs 5 lakh per family per year for eligible households), Ayushman Arogya Mandirs (free primary care and cervical, breast and oral cancer screening for women 30+), Janani Suraksha Yojana and PM Matru Vandana Yojana (cash support for delivery and for pregnant and lactating women), PM Surakshit Matritva Abhiyan (free antenatal check-up on the 9th of every month), Janani Shishu Suraksha Karyakram (free delivery in public facilities). Each card: what it offers, documents, where to apply, official link. Always "you may qualify" and "confirm on the official source; rules vary by state and change".
- Home dashboard modules: Daily check-in, My cycle, Medicines, Care and hospitals, ONE consolidated "Doctor visit" card (three buttons inside: Prepare questions, Log a visit, Doctor summary; badge when a follow-up is within 3 days), Government schemes, Private vault (Soon if not built).
- Routing tests: /visit, /visit?tab=summary and /schemes match their own routes, not /care.

PHASE 2: Medicines and reminders

- services/medicines.ts: CRUD, dose schedule, taken/skipped log, adherence, refill alert when 3 or fewer days remain. ScannedMedicine type exported from medicines.ts; mock scanner removed.
- /medicines: today's doses as large cards with Taken and Skip, full list, history, adherence, "Add prescription" / "Add medicines".
- /scan: "Add your medicines" honest manual entry starting with one empty medicine card, "Add another medicine", remove card, and "Save to my medicines" flow. Secondary button: "Save prescription photo to my private vault" saves the document directly to the private vault under PIN protection without reading/OCR (AI prescription reading planned). Note: "Please check this with your doctor or pharmacist" above form in every language.
- A plain-language "what it is for" line from a small static dictionary with a safe fallback.
- Reminders while the app is open: banner and toast every minute for due doses, optional browser Notification opt-in, discreet wording ("Time for your tablet"). README note: reliable background reminders need Twilio WhatsApp/SMS later.

PHASE 3: Demo profile

- "Load demo profile" and "Clear demo data" in Settings: 3 months of realistic logs that trigger the pattern flags (irregular cycles plus symptoms, painful periods, heavy bleeding), a sample prescription with medicines and dose history, two past visits with a follow-up in about 5 days. Must work with every feature built so far.

PHASE 4: Care journey and same-day safety

- Live nearby facilities: server routes /api/nearby and /api/geocode call Geoapify using GEOAPIFY_API_KEY (server only). Read the current Geoapify docs for exact endpoints, categories, limits and credit costs; filters take longitude first. One wide request: 50 km radius, largest allowed result limit, repeat once at 100 km only if fewer than 10 results; sort nearest first; road distance for the nearest 10, "approx" for the rest; validate inputs, rate-limit, cache 10 minutes per coordinates rounded to 3 decimals. No small radius cap and no "within 5 km" label: show "N centres near you, nearest first" and "Show more" 10 at a time; filters All, Hospitals, Health centres, Government, Women's health with counts. Map fits the user and nearest 10, markers clustered. Source badge, "Powered by Geoapify" and OpenStreetMap attribution, "call before you go" note, "Phone not listed" when missing. Place search by Search/Enter (not as you type) via /api/geocode. Fallback chain with specific failure banners: live -> saved results (only if she turned on "remember my location") -> Overpass once with an 8 s timeout -> sample data with a banner.
- "Recommended for you" block at the top of /care when pattern flags exist: 3 best facilities (women's health first, then government, then nearest) with the reason in plain words. Show the women's-health tag only when the data says so.
- Scheme hints on government hospital, CHC, PHC and Arogya Mandir cards ("you may qualify for free or low-cost care" linking to /schemes). Never promise it is free.
- "Prepare for this visit" on each facility card opens /visit with the facility pre-filled; the next time the app opens after she taps Call or Directions, ask "Did you visit <facility>? Add it to your visits".
- Pattern flags in services/cycle.ts: keep irregularPlus, painCycle, heavyRepeat; add lateCycle (45 or more days since the last period start and at least 2 earlier cycles) and ongoingPain (pain level 3 or more on at least 5 of the last 7 logged days, minimum 5 entries). The flags banner gets a "Find care for this" button opening /care with the Women's health filter. Unit tests including boundaries.
- Same-day tiers after saving a check-in: urgent (very heavy flow, pain 5, or pelvic pain with pain 4 or more) goes straight to /urgent; "soon" (pain 4, heavy flow, or two or more symptoms with pain 3 or more) shows a gentle card with the reason, "Find care near me" and "Prepare for this visit", not the red screen. /urgent uses the live service (108 button always first, nearest hospital with call and directions), shows today's reason in plain words, and falls back to saved or sample data with a banner.

PHASE 5: Ask Sakhi chat

- Floating chat button bottom right, above the pill nav; panel is a bottom sheet on phones and a 380px panel on desktop; suggestion chips; typing indicator; history through the storage service; hidden on landing, consent, sign-up, /urgent and /share; accessible (focus trap, Esc, aria-live).
- /api/chat server route calling any OpenAI-compatible chat endpoint (LLM_API_URL, LLM_API_KEY, LLM_MODEL) with streaming (stream: true), temperature 0.3, max_tokens 400, 20 s timeout, input at most 500 characters, last 6 messages only, rate limit about 10 requests per minute, LLM_DAILY_LIMIT budget (default 400), optional fallback provider, cache of replies to the suggestion-chip questions for 30 minutes. Send NO personal data.
- Order: local safety layer first (emergencies, distress, refused topics) with no AI call; then the AI answers everything, including chips and typed questions in any language; the offline knowledge base (about 15 intents in chat.kb.*, with native and romanised keywords) is only the fallback, labelled "Offline answer"; AI answers labelled "AI-generated, general information only".
- System prompt: friendly health information assistant for women in India; reply in the selected language in short simple sentences; general education only (periods, PCOS/PCOD, endometriosis, pregnancy basics, nutrition, hygiene, mental wellbeing, using the Sakhi app); never diagnose, never recommend or change medicines or doses, never interpret tests or prescriptions; suggest a doctor for symptoms; emergencies: go to a hospital or call 108; under 120 words; politely refuse unrelated topics.
- Safety: emergency phrases in every language (native and romanised) show urgent buttons (Call 108, nearest hospital); distress shows a caring message with Tele-MANAS 14416 and 112 (constants in one file, to be re-verified); dosage, diagnosis, abortion or contraception instruction requests are refused with a pointer to her doctor or pharmacist. Output guard replaces medicine dosing text. Unicode-safe matching (NFC, no \w or \b). Tests for all of this, including empty phrase lists failing the test run.

PHASE 6: Share with doctor (QR)

- services/share.ts with a swappable interface; implement fragment sharing: compact JSON snapshot compressed with lz-string into the URL fragment {origin}/share#d=...;
