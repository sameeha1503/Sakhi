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
# Geoapify API key for healthcare facility locator & geocoding (myprojects.geoapify.com, free, no card)
GEOAPIFY_API_KEY=

# OpenAI-compatible chat completion URL (e.g., https://api.openai.com/v1/chat/completions or https://api.groq.com/openai/v1/chat/completions)
LLM_API_URL=
# Secret API key for primary LLM provider (server-side only, never exposed to browser)
LLM_API_KEY=
# LLM model name (e.g., gpt-4o-mini, llama-3.3-70b-versatile, gemini-2.0-flash)
LLM_MODEL=
# Optional maximum successful AI requests per day before falling back to offline answers (default: 400)
LLM_DAILY_LIMIT=

# Optional fallback LLM provider URL used if primary provider returns 429, 5xx, or times out
LLM_FALLBACK_URL=
# Optional secret API key for fallback LLM provider
LLM_FALLBACK_KEY=
# Optional fallback LLM model name
LLM_FALLBACK_MODEL=

# --- Prescription Scanner (Server-Side Only) ---
# Provider adapter: openai (default, works with Google Gemini OpenAI-compatible endpoint) or anthropic
SCAN_PROVIDER=openai
# Secret API key for prescription scanner vision model (Google AI Studio Gemini key)
SCAN_API_KEY=
# OpenAI-compatible completions endpoint (Google Gemini)
SCAN_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
# Primary vision model identifier (e.g., gemini-2.5-flash or gemini-1.5-flash)
SCAN_MODEL=gemini-2.5-flash
# Fallback vision model identifier on quota/429/not-found (e.g., gemini-2.0-flash or gemini-1.5-flash-8b)
SCAN_MODEL_FALLBACK=gemini-2.0-flash
# Daily request cap for primary model before routing to fallback (default: 15)
SCAN_DAILY_LIMIT=15

# --- Medicine Explanations (Server-Side Only) ---
# Optional model override for medicine explanations (defaults to SCAN_MODEL_FALLBACK or gemini-2.0-flash)
EXPLAIN_MODEL=
# Optional daily request cap for medicine explanations (default: 300)
EXPLAIN_DAILY_LIMIT=300
```

### Prescription Scanner (Vision AI via Google Gemini)

Sakhi includes a real prescription digitizer powered by Google Gemini through its OpenAI-compatible endpoint:

- **Endpoint**: Configured at `SCAN_API_URL` (e.g., `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`) using `Authorization: Bearer SCAN_API_KEY`.
- **Primary & Fallback Model Chain**: Tries `SCAN_MODEL` first (e.g., `gemini-2.5-flash`). If rate-limited (429), out of quota, or if the primary daily limit is reached, it automatically falls back once to `SCAN_MODEL_FALLBACK` (e.g., `gemini-2.0-flash`).
- **How to Get a Gemini API Key**:
  1. Go to [Google AI Studio (aistudio.google.com)](https://aistudio.google.com).
  2. Sign in with your Google account and click **Get API key** -> **Create API key**.
  3. Set `SCAN_API_KEY` in `.env.local`.
- **Privacy Notice & Free-Tier Data Policy**:
  - In Google AI Studio's free tier, prompts and images may be reviewed by human reviewers and used by Google to train products. **Never upload real, personally identifiable patient prescriptions on the free tier; use sample, test, or synthetic prescription slips only.**
  - Sakhi never persists or logs prescription photos or extracted text on the server or in `localStorage`. The photo is downscaled in the browser (max 1600px, 85% JPEG), sent directly to the `/api/scan` endpoint in memory, and immediately discarded.
  - A 5-entry client-side LRU hash cache prevents redundant API calls if the user re-scans the same photo.
- **Known Limitations & Human-in-the-Loop Verification**:
  - Doctor handwriting and abbreviations vary widely across clinics and languages. Vision models can misread dosages or brand names.
  - Sakhi flags uncertain entries with an amber **"Please check this one"** (`needsCheck`) badge, highlights empty dose/duration fields, and requires the user to review and confirm every medicine before saving to their active list.

### Medicine Explanations (AI-Powered with Local Caching & Built-in Fallback)

"What is this medicine for" delivers real, AI-generated explanations per medicine in the user's active language:

- **AI-Generated in 11 Languages**: Generates plain-language explanations at a 6th-grade reading level (used for, how it is usually taken, common side effects, and when to ask a doctor) using `EXPLAIN_MODEL` (or `SCAN_MODEL_FALLBACK`, e.g., `gemini-2.0-flash`).
- **Local Storage Cache (90-Day TTL)**: Cached via the local storage adapter keyed by normalized medicine name and language code. Only uncached names are requested in a single batch, and in-flight requests are automatically deduplicated. Included in the "Delete all my data" wipe.
- **Safety Limits & Daily Budget**: Rate limited to 10 req/min and 60 req/day per client IP, plus a global daily counter (`EXPLAIN_DAILY_LIMIT`, default: 300) resetting at midnight `America/Los_Angeles`. When exhausted, requests return `explain_unavailable` (503) without calling upstream.
- **Strict Privacy**: Only medicine names, doses, and the target language code are sent to the model. Zero user logs, profile data, or locations. Medicine names and model outputs are never stored or logged on the server.
- **Offline & Low-Confidence Fallback**: When offline, unconfigured, or rate-limited, the UI seamlessly falls back to categorized purpose strings with a _"General information only"_ label. If the model is unsure of a medicine name, it sets `confidence: "low"` and displays _"We are not sure about this medicine. Please ask your pharmacist."_ with no guessed usage.
- **Clinical Safety Filter**: Code-level safety filtering automatically drops any field containing dosing advice, diagnoses, or phrases like _"stop taking"_ or _"increase the dose"_.
- **Known Limitations**: Brand-name accuracy across Indian regional manufacturers and regional-language medical translations require review by a licensed pharmacist and native speakers.

### How to Get an AI Key & Model Recommendations

1. **Groq (Recommended — Ultra-fast inference with free tier)**:
   - Visit [console.groq.com](https://console.groq.com) and create a free API key.
   - Set `LLM_API_URL=https://api.groq.com/openai/v1/chat/completions`.
   - **Recommended Fast Non-Reasoning Model**: `LLM_MODEL=llama-3.3-70b-versatile` (ultra-low latency, high clinical accuracy, 128k context) or `llama-3.1-8b-instant`.
   - **Reasoning Models Supported**: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, or `qwen/qwen3.8-27b`. Sakhi automatically sets `reasoning_effort: "low"`, `reasoning_format: "hidden"`, and raises max tokens to 800 so reasoning never exhausts the response budget or delays content delivery.
2. **OpenAI**: Visit [platform.openai.com](https://platform.openai.com), set `LLM_API_URL=https://api.openai.com/v1/chat/completions`, and `LLM_MODEL=gpt-4o-mini`.
3. **OpenRouter**: Visit [openrouter.ai](https://openrouter.ai), create a key, and set `LLM_API_URL=https://openrouter.ai/api/v1/chat/completions`.

### Streaming & Resilient Fallbacks

- **Live SSE Streaming**: Chunks stream token-by-token with `text/event-stream`, `Cache-Control: no-cache, no-transform`, and `X-Accel-Buffering: no`.
- **First-Token Timeout (8s)**: If no visible content token arrives within 8 seconds, Sakhi aborts and falls back to offline answers.
- **Total Cap (25s)**: Maximum streaming duration cap preventing indefinite hangs.
- **Active Stop Cancellation**: Clicking **Stop** aborts the client stream and immediately cancels the upstream provider call on the server.
- **Concurrency & Anti-Queue Lock**: Blocks secondary message submissions while generation is in progress, restoring immediate input access upon completion, stop, or error.

### Privacy Safeguards

- **Zero Personal Data**: Sakhi **never** sends your cycle logs, symptom check-ins, medicine lists, documents, or GPS coordinates to the LLM endpoint. Only the conversation context (up to the last 6 messages) is sent.
- **Local Safety Interception**: Emergency queries (108, chest pain, heavy bleeding), emotional distress (Tele-MANAS 14416, 112), and refused medical requests (dosages, diagnoses, home abortions) are intercepted locally with **zero** external AI calls.
- **Clinical Output Guard**: If an AI reply mentions medicine dosages (e.g., 500mg, 10 ml, 2 tablets), the text is automatically sanitized to direct you to your doctor or pharmacist.
- **Offline Fallback**: When offline or unconfigured, Sakhi seamlessly falls back to 16 curated offline health intents in your chosen language.

### Deploying to Production

When deploying to Cloudflare Workers / Pages, Vercel, or Node.js hosts, define the server environment variables in your provider's dashboard without the `VITE_` prefix:

- `GEOAPIFY_API_KEY`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- (Optional) `LLM_DAILY_LIMIT`, `LLM_FALLBACK_URL`, `LLM_FALLBACK_KEY`, `LLM_FALLBACK_MODEL`
  The runtime server reads these securely at runtime and logs only presence (`set`/`missing`), keeping secrets safe.

### Government Schemes Engine & Pan-India Coverage

- **All 36 States & Union Territories**: Searchable, keyboard-accessible state selector (bottom sheet on phones, modal on desktop) allowing access to schemes across all 28 states and 8 union territories, defaulting to detected/saved state without restrictions.
- **Three-Tier Categorization**:
  1. **Made for Women (Top, Accent Highlighted)**: Maternity (JSY, PMMVY, PMSMA, JSSK, SUMAN, state maternity), cancer screening (Ayushman Arogya Mandirs, Arogya Mahila), menstrual & adolescent health (MHS, RKSK, Udaan, Swechha, Khushi, She Pad), nutrition & anaemia (Anemia Mukt Bharat, Poshan 2.0, Mathru Poorna), and women-specific state welfare.
  2. **Health Schemes You May Also Qualify For**: General health insurance & care (PM-JAY with state-specific implementation links, state insurance schemes like MJPJAY, Aarogyasri, Chiranjeevi/MAAY, Chirayu, DDSSY, and free diagnostics).
  3. **Other Support**: Verified state cash-transfer & welfare schemes for women (Ladki Bahin, Ladli Behna, Gruha Lakshmi, Kalaignar Magalir Urimai, Orunodoi, Mahtari Vandan, Maiyan Samman, Subhadra, Lakshmir Bhandar, Griha Aadhar).
- **Official Sources Only**: Every entry contains `sourceUrl`, `officialUrl`, and `verifiedOn: "2026-10-25"`. States without custom verified entries provide an official fallback to the state health department website.
- **Check-in Pattern Personalization**: Connects to on-device daily logs (default ON, private) to highlight anaemia support (Anemia Mukt Bharat) for heavy bleeding patterns and free cancer screening at Arogya Mandirs for women 30+.
- **My List Tracker**: Local tracker for "Saved", "Applied", and "Received" statuses, completely wiped by "Delete all my data".
- **Reminders & Care Integration**: Monthly 9th PMSMA antenatal reminder, 30+ screening reminder, and direct links to `/care` for schemes delivered at primary health centres.

### Monthly Cycle Calendar & Data Backup

- **Monthly Calendar Grid (`/cycle`)**:
  - Full-month view with Monday-first week headers, 24-month historical navigation, and month/year jump selector.
  - Multi-indicator date cells: flow dot strength, pain marker ($\ge 3$), symptom dot, today ring, selected day highlight, muted unselectable future dates, and dashed outlines for predicted next period dates.
  - Accessibility: `role="grid"` table with rich accessible labels (e.g., _"12 October, period, pain level 3, 2 symptoms logged"_).
  - Monthly summary statistics line (days logged, period days, highest pain level).
- **Day Detail & Backfilling (`/log?date=YYYY-MM-DD`)**:
  - Tapping any date opens a day detail sheet (bottom sheet on phones, side panel on desktop) with flow, pain areas, mood, energy, sleep, symptoms, cycle day number, and personal notes.
  - Log past entries or edit existing ones at `/log?date=YYYY-MM-DD` (future dates rejected).
  - Severe red-flag entries redirect to `/urgent` **only when logging today**; editing or backfilling past dates returns to the calendar with selected date and confirmation toast.
  - Delete entries with confirmation dialog.
- **On-Device Storage & JSON Backup/Restore (`/settings`)**:
  - Schema-versioned local storage (`LOGS_SCHEMA_VERSION = 2`) with migration and sanitization.
  - Date strings created via `formatLocalDate()` using local year, month, and day to prevent IST timezone day-shifting.
  - "Download my data" exports full check-in history as formatted JSON.
  - "Restore from backup" validates JSON via Zod and merges entries with confirmation prompt.

### Health Awareness Cards (Floating, inside Ask Sakhi)

- **Floating Trigger & Two-Tab Drawer (`AskSakhiWidget`)**:
  - Integrated directly into the existing Ask Sakhi floating widget without adding extra round buttons.
  - Features a small floating "Learn" pill with a lightbulb icon stacked above the chat trigger, with identical route visibility (hidden on `/`, `/consent`, `/signup`, `/urgent`, `/share`).
  - Opens the same bottom sheet (mobile) / 380px anchored panel (desktop) with two accessible tabs: **"Ask"** (live streaming AI assistant) and **"Learn"** (swipeable awareness cards).
- **8 Core Educational Cards (`src/data/awarenessCards.ts`)**:
  1. **What is PCOS/PCOD?** (Action: "Ask Sakhi about this" $\rightarrow$ switches to Ask tab)
  2. **Signs that may point to PCOS** (Action: "Log how I feel" $\rightarrow$ `/log`)
  3. **What is endometriosis?** (Action: "Ask Sakhi about this" $\rightarrow$ switches to Ask tab)
  4. **Signs that may point to endometriosis** (Action: "Prepare for a doctor visit" $\rightarrow$ `/visit`)
  5. **What is a normal cycle?** (Action: "Log how I feel" $\rightarrow$ `/log`)
  6. **When should I see a doctor?** (Action: "Find care near me" $\rightarrow$ `/care`)
  7. **Red flags that need urgent care** (Action: "View emergency care" $\rightarrow$ `/urgent`)
  8. **Eating and anaemia basics** (Action: "Check health schemes" $\rightarrow$ `/schemes`)
- **Light Personalization & Non-Diagnostic Language**:
  - Rule-based ordering: users with active pattern flags (`irregularPlus`, `painCycle`, `heavyRepeat`) see the matching card first with a supportive **"Because of what you logged"** badge.
  - Strict clinical safety: uses only supportive phrasing ("may", "can be a sign", "worth discussing with a doctor"); strictly never uses diagnostic language ("you have", "you are diagnosed").
  - Persistent disclaimer footer on every card: _"Sakhi shares general information, not medical advice. Please see a doctor if you are worried."_
- **Accessible & Offline-First**:
  - Full touch swipe support and keyboard arrow navigation (Left/Right).
  - Progress dots and Next/Back buttons with $\ge 44$px touch targets.
  - Remembers last viewed card via the storage adapter (`src/services/storage.ts`), completely wiped on "Delete all my data".
  - Operates 100% offline with zero network requests.

### Supported Languages & Localization Review Status

| Language  | Code | Native Script | Awareness Cards Status | Medicine Info Status | Overall Status |
| :-------- | :--: | :------------ | :--------------------: | :------------------: | :------------: |
| English   | `en` | English       |        Complete        |       Complete       |    Verified    |
| Hindi     | `hi` | हिन्दी        |  Needs native review   | Needs native review  |    Verified    |
| Telugu    | `te` | తెలుగు        |  Needs native review   | Needs native review  |    Verified    |
| Tamil     | `ta` | தமிழ்         |  Needs native review   | Needs native review  |    Verified    |
| Kannada   | `kn` | ಕನ್ನಡ         |  Needs native review   | Needs native review  |    Verified    |
| Malayalam | `ml` | മലയാളം        |  Needs native review   | Needs native review  |    Verified    |
| Marathi   | `mr` | मराठी         |  Needs native review   | Needs native review  |    Verified    |
| Bengali   | `bn` | বাংলা         |  Needs native review   | Needs native review  |    Verified    |
| Gujarati  | `gu` | ગુજરાતી       |  Needs native review   | Needs native review  |    Verified    |
| Punjabi   | `pa` | ਪੰਜਾਬੀ        |  Needs native review   | Needs native review  |    Verified    |
| Odia      | `or` | ଓଡ଼ିଆ         |  Needs native review   | Needs native review  |    Verified    |

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
