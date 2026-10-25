# Sakhi (सखी): Your Women's Health Friend

> A private, multilingual women's healthcare companion for urban and rural India, built for PS1: Women's Healthcare.

- **Team**: Sync Strikers (Sameeha Modak, Team Leader; Simra Faniband)
- **Live Demo Link**: `https://<your-vercel-deployment-subdomain>.vercel.app` *(Fill in your deployed Vercel URL)*
- **Demo Video Link**: `https://<your-demo-video-link>` *(Fill in your demo video URL)*

---

## The Problem

Women across India face persistent structural barriers when managing their health:

- **Care is delayed**: Women frequently normalize chronic pelvic pain, irregular bleeding, and extreme fatigue, seeking care only when conditions become severe.
- **Signs of PCOS, PCOD, and endometriosis are missed**: Early indicators of hormonal and menstrual disorders are widely misunderstood or dismissed as ordinary period cramps.
- **Follow-up records are lost**: Paper prescriptions and lab receipts get lost, faded, or damaged, leaving doctors with no longitudinal history during follow-ups.
- **Hesitation during clinic visits**: High patient volume leaves doctors with little time to explain, and social stigma leaves women hesitant to ask intimate questions.
- **Government welfare goes unclaimed**: Central and state maternity benefits, nutritional support, and free screening programs exist, but eligible women rarely discover them.
- **Language and digital literacy barriers**: Most healthcare tools are written in English clinical jargon rather than clear, localized regional languages.

---

## What Sakhi Does

| Feature | What It Does | Who It Helps |
| :--- | :--- | :--- |
| **Daily Check-in & Month Grid** | 30-second log for bleeding flow, pain areas, mood, energy, and symptoms. 24-month calendar shows flow strength, pain markers, and predicted next periods. | Women tracking irregular cycles, pain progression, and cycle patterns over time. |
| **Clinical Pattern Flags & 108 Emergency** | Detects 5 patterns on-device: irregular cycles, cyclical pain, repeat heavy flow, late cycles, and ongoing pain. Severe red flags route directly to a same-day emergency screen with 1-tap 108 ambulance calling. | Women experiencing acute warning signs or chronic symptoms needing prompt medical care. |
| **Nearby Healthcare Finder (Live)** | Finds nearby PHCs, CHCs, maternity hospitals, and dispensaries via live Geoapify Places API v2 with automatic radius expansion (5, 10, 25, 50 km) and OpenStreetMap fallback. | Rural and urban women looking for verified public and private health centres. |
| **Doctor Visit Preparation & QR Share** | Generates tailored questions based on logged symptoms, maintains visit history, prints a 1-page A4 consultation summary, and generates a private on-device QR code (compressed via `lz-string` into URL fragment). | Women preparing for clinic consultations who want a structured, concise summary for their doctor. |
| **Medicines & Dose Reminders** | Morning, afternoon, and evening dose schedule tracking, taken/skipped adherence records, refill alerts, and private prescription photo storage. | Women managing long-term prescriptions, iron/calcium supplements, or hormonal therapies. |
| **Private PIN-Locked Vault** | Hardware-accelerated PBKDF2 Web Crypto PIN hashing (SHA-256, 100,000 iterations), brute-force lockout, and IndexedDB storage for sensitive prescriptions and lab reports. | Women sharing a family phone who need strict privacy for their medical documents. |
| **Pan-India Government Schemes** | Comprehensive database covering all 36 States and Union Territories. Highlights "Made for Women" schemes (JSY, PMMVY, Arogya Mandirs, cancer screening) and personalizes recommendations from check-in logs. | Expectant mothers, adolescent girls, and women seeking financial aid or free public screenings. |
| **Ask Sakhi AI & Awareness Cards** | Streaming conversational assistant with local emergency triage (108, Tele-MANAS 14416), automatic dosage sanitization, 16 offline intents, and 8 swipeable educational cards on PCOS, endometriosis, and anaemia. | Women seeking clear, stigma-free health explanations and clinical education in plain language. |
| **11 Indian Languages** | Native translations for English, हिन्दी, తెలుగు, தமிழ், ಕನ್ನಡ, മലയാളം, मराठी, বাংলা, ગુજરાતી, ਪੰਜਾਬੀ, and ଓଡ଼ିଆ with 100% key parity verified by automated tests. | Non-English speakers across urban and rural India. |
| **Offline-First PWA** | App shell caching, service worker offline fallback, and local storage keep daily logging, calendar views, medicines, and offline health answers accessible without internet. | Women in low-connectivity rural areas or with intermittent mobile data. |
| **Phone + 6-Digit PIN Cloud Sync** | Simple phone number and 6-digit PIN login using Supabase Auth (synthetic email mapping; no email required). Automatically merges multi-device logs and supports offline queues. | Women who upgrade phones or access their records across multiple family devices. |

---

## Real-Time vs Curated Architecture

Sakhi clearly separates live network services from deterministic, on-device clinical rules and curated databases:

| Category | Component | Mechanism | Source & Freshness |
| :--- | :--- | :--- | :--- |
| **Live / Real-Time** | Nearby Health Facilities | Live Geoapify Places API v2 with 5–50 km radius expansion and Nominatim village geocoding. | Real-time external API; cached locally; OpenStreetMap fallback. |
| **Live / Real-Time** | Ask Sakhi AI Chat | Streaming Server-Sent Events (SSE) via OpenAI-compatible endpoints (Groq / OpenAI). | Live LLM inference (`llama-3.3-70b-versatile` or `gpt-4o-mini`). |
| **Live / Real-Time** | Account Cloud Sync | Supabase PostgreSQL REST / Realtime with client-side debounced sync (~800ms) and offline retry queue. | Live database sync with timestamp conflict resolution. |
| **On-Device Rule-Based (No AI)** | Cycle & Pattern Flags | Deterministic clinical algorithms identifying 5 pattern flags (`irregularPlus`, `painCycle`, `heavyRepeat`, `lateCycle`, `ongoingPain`). | Pure client-side TypeScript logic (`src/services/cycle.ts`); executes instantly offline. |
| **On-Device Rule-Based (No AI)** | Emergency Triage | Same-day red-flag detection routing to `/urgent` with direct `tel:108` ambulance dialer. | Deterministic severity rules (`src/services/logs.ts`); zero network dependency. |
| **On-Device Rule-Based (No AI)** | Doctor Visit Questions | Generates targeted questions for doctors based on specific active symptom flags and medicines. | Deterministic rules engine (`src/services/questions.ts`); zero network dependency. |
| **On-Device Rule-Based (No AI)** | Vault Encryption & Lockout | PBKDF2 Web Crypto PIN hashing (100k rounds) with 5-attempt brute-force lockout. | Browser Web Crypto API & IndexedDB (`src/services/vault.ts`); strictly on-device. |
| **On-Device Rule-Based (No AI)** | Doctor QR Consultation Share | Compresses selected health record snapshot with `lz-string` directly into URL fragment (`#data=...`). | Browser memory only (`src/services/share.ts`); no server storage or tracking. |
| **Curated & Dated** | Government Schemes | Database covering central programs and state-specific schemes across all 36 States & UTs. | Official portals (MoHFW, WCD, State Depts); verified on `2026-10-25`. |
| **Curated & Dated** | Health Awareness Cards | 8 educational cards covering PCOS, endometriosis, normal cycles, anaemia, and red flags. | Curated clinical guidelines; reviewed against standard public health literature. |
| **Curated & Dated** | Offline Chat Intents | 16 instant multilingual responses covering emergencies, missed periods, cramps, and nutrition. | Handcrafted, verified medical education fallback when offline or unconfigured. |

---

## Safety and Privacy

Sakhi was engineered under strict clinical safety and privacy constraints:

1. **Informs, Never Diagnoses**:
   - Sakhi uses calm, supportive language ("may point to", "worth discussing with a doctor"). It never issues definitive medical diagnoses or prescribes treatment regimens.
2. **Emergency Routing (108 & 14416)**:
   - Queries or symptoms involving severe haemorrhage, acute chest pain, or emergency signs immediately route to `/urgent` with a 1-tap call to **108 Ambulance**.
   - Emotional distress or self-harm triggers immediately surface the Government of India **Tele-MANAS helpline (14416)** and **National Emergency Number (112)** without calling the AI.
3. **Medication Dosing Guard**:
   - The AI assistant is strictly forbidden from giving medication dosages. Both server-side and client-side sanitizers intercept numerical dosages (e.g., "take 500mg", "take 2 pills") and replace them with a prompt to consult a doctor or pharmacist.
4. **Zero Health Data Sent to AI**:
   - The conversational AI model receives **only** the user's active chat messages (last 6 turns). Personal health logs, cycle history, pain scores, prescription photos, and GPS coordinates are **never** transmitted to the LLM.
5. **Clear Cloud vs On-Device Data Separation**:
   - **Synced to Private Account**: Check-in logs, medicine schedules, doctor visit records, question checklists, and saved scheme tracker status.
   - **Strictly On-Device (Never Leaves Phone)**: Private vault PIN, PIN lockout state, vault prescription/lab photos (IndexedDB), and session cache.
6. **One-Tap Complete Data Wipe**:
   - Users can tap **"Delete all my data"** in Settings. This instantly flushes all local storage keys, purges all IndexedDB files, and permanently deletes all remote rows from the Supabase database.
7. **Honest Limitations**:
   - **Phone Verification**: Phone login uses a 10-digit mobile number and 6-digit PIN; SMS OTP verification is not yet integrated.
   - **PIN Recovery**: There is currently no remote PIN reset mechanism. If a user loses their 6-digit vault PIN, encrypted vault photos cannot be recovered.

---

## Screenshots

| Screen | Preview | Description |
| :--- | :---: | :--- |
| **Home Screen** | `docs/screenshots/home.png` | Today's check-in status, cycle forecast, nearest care card, and quick module navigation. |
| **Daily Check-in** | `docs/screenshots/log.png` | Icon-driven flow, pain area body map, mood chips, and symptom tracker with 44px tap targets. |
| **Cycle Calendar** | `docs/screenshots/calendar.png` | 24-month grid view with flow dots, pain markers, and predicted next period dates. |
| **Healthcare Finder** | `docs/screenshots/care.png` | Live nearby PHCs and hospitals with distance badges, filters, and visit preparation links. |
| **Government Schemes** | `docs/screenshots/schemes.png` | 36 States/UTs filter with "Made for Women" priority schemes and check-in personalization. |
| **Ask Sakhi & Learn** | `docs/screenshots/ask-sakhi.png` | Streaming AI health assistant with safety guards, and swipeable educational cards. |

*(Note: Image files should be placed inside `docs/screenshots/` following the guidelines in [`docs/screenshots/README.md`](file:///c:/Users/HP/Downloads/screenshot-to-spark-0803-main/docs/screenshots/README.md).)*

---

## Tech Stack and Architecture

### Technologies

- **Frontend & Routing**: TanStack Start + React 19 + TanStack Router (SSR-safe, full hydration, type-safe navigation)
- **Styling**: Tailwind CSS v4 (accessible 44px tap targets, warm blush palette `#FFF8FA`, primary teal `#0B7A75`, berry `#C84B6E`, violet `#7C3AED`)
- **Internationalization**: i18next supporting 11 Indian languages with automated 100% key and placeholder parity tests
- **Authentication & Cloud Sync**: Supabase Auth (synthetic email pattern) + PostgreSQL with Row-Level Security (RLS)
- **Healthcare Locator**: Geoapify Places API v2 + OpenStreetMap / Leaflet
- **AI Assistant**: OpenAI-compatible API (Groq `llama-3.3-70b-versatile` / OpenAI `gpt-4o-mini`) with SSE streaming
- **On-Device Security**: Web Crypto API (PBKDF2 SHA-256, 100k iterations) + IndexedDB for private document storage

### Architectural Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│  AppShell (TopBar, Nav, BackButton) • Routes (/home, /log, /care, etc.)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Typed Services Layer                             │
│   src/services/{auth, cycle, logs, medicines, visits, places, chat}    │
└─────────┬─────────────────────────┬───────────────────────────┬────────┘
          │                         │                           │
┌─────────▼──────────────┐ ┌────────▼──────────────┐ ┌──────────▼────────┐
│ Storage Adapter        │ │ Server API Routes     │ │ Client-Only Vault │
│ localStorage (instant) │ │ /api/chat   (SSE LLM) │ │ IndexedDB Storage │
│ + Supabase Sync (async)│ │ /api/nearby (Geoapify)│ │ Web Crypto PBKDF2 │
│ Row-Level Security     │ │ /api/geocode(Nominatim│ │ Never Leaves Phone│
└────────────────────────┘ └───────────────────────┘ └───────────────────┘
```

---

## Run It Locally

### Prerequisites

- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sameeha1503/Sakhi.git
   cd Sakhi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your API keys (see table below).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

5. **Run tests**:
   ```bash
   npm test
   ```

### Environment Variables

| Variable Name | Required / Optional | Where to Get It | Purpose |
| :--- | :---: | :--- | :--- |
| `GEOAPIFY_API_KEY` | **Required** for live care finder | [Geoapify MyProjects](https://myprojects.geoapify.com) (Free tier, no card required) | Live nearby healthcare facilities search and village geocoding. |
| `LLM_API_URL` | **Required** for AI chat | [Groq Console](https://console.groq.com) or [OpenAI](https://platform.openai.com) | OpenAI-compatible chat completion endpoint URL (e.g. `https://api.groq.com/openai/v1/chat/completions`). |
| `LLM_API_KEY` | **Required** for AI chat | [Groq Console](https://console.groq.com) or [OpenAI](https://platform.openai.com) | Secret API key for AI chat completions (server-side only, never leaked to browser). |
| `LLM_MODEL` | **Required** for AI chat | Provider documentation | Model identifier (recommended: `llama-3.3-70b-versatile` on Groq, or `gpt-4o-mini` on OpenAI). |
| `LLM_DAILY_LIMIT` | Optional | Custom integer | Daily request quota cap before falling back to offline answers (default: `400`). |
| `LLM_FALLBACK_URL` | Optional | Secondary LLM provider | Backup provider URL if primary returns rate limits (429) or server errors. |
| `LLM_FALLBACK_KEY` | Optional | Secondary LLM provider | Secret API key for backup LLM provider. |
| `LLM_FALLBACK_MODEL` | Optional | Secondary LLM provider | Model name for backup provider. |
| `VITE_SUPABASE_URL` | Optional (for cloud sync) | [Supabase Dashboard](https://supabase.com) | Supabase project URL (e.g. `https://xyzcompany.supabase.co`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional (for cloud sync) | [Supabase Dashboard](https://supabase.com) | Public `anon` publishable key (safe for browser client). |

> [!IMPORTANT]
> All keys (`GEOAPIFY_API_KEY`, `LLM_*`) run strictly on the server and are never exposed to the client bundle. Only the two public `VITE_SUPABASE_*` parameters are exposed client-side. Never commit `.env.local` to git.

### Supabase Database Schema (Row-Level Security)

If you connect a Supabase project for multi-device sync, run this SQL in your Supabase SQL Editor:

```sql
-- Create user_data table for encrypted local-first sync
create table if not exists public.user_data (
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Enable Row-Level Security
alter table public.user_data enable row level security;

-- Policies: users can only access and modify their own records
create policy "Users can read own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);
```

---

## Deploy to Vercel

Sakhi is configured for seamless deployment to Vercel via Nitro:

1. **Push your code** to GitHub.
2. **Import Project** into [Vercel](https://vercel.com).
3. **Set Environment Variables** in Project Settings:
   - `NITRO_PRESET=vercel`
   - `GEOAPIFY_API_KEY`
   - `LLM_API_URL`
   - `LLM_API_KEY`
   - `LLM_MODEL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. **Build Settings**:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `.output`
5. Click **Deploy**.

---

## Roadmap

The following planned capabilities are not yet built and are tracked for future releases:

- **SMS OTP Verification**: Two-factor SMS verification for phone logins.
- **PIN Recovery Mechanism**: Secure recovery flow for forgotten 6-digit vault PINs without compromising zero-knowledge encryption.
- **Client-Side Encrypted Vault Cloud Backup**: Encrypting vault images on the client before syncing them to private cloud storage.
- **Automated Vision AI Prescription OCR**: Scanning handwritten doctor prescriptions with vision models, requiring pharmacist/clinician confirmation before saving.
- **ABDM / ABHA & FHIR Health Records Integration**: Syncing consultation notes into India's national Ayushman Bharat Digital Mission infrastructure.
- **ASHA Worker Community Mode**: Multi-profile switching allowing rural village health workers to manage check-ins for multiple women in their community.
- **Server-Revocable Doctor Consultation Links**: Time-expiring doctor access links with server-side access revocation.
- **Indic Voice-to-Text & Audio Playback**: Spoken symptom input and read-aloud guidance for non-literate users across regional dialects.
- **Expanded State Welfare Datasets**: Deepening scheme coverage with localized eligibility calculators for panchayat-level programs.

---

## Testing & Quality Assurance

Sakhi maintains high test coverage across data services, triage logic, routing, internationalization parity, and security:

```bash
# Run unit and integration test suite
npm test

# Run tests in watch mode during development
npm run test:watch

# Verify TypeScript type correctness
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

- **Test Suite Results**: **281 passing tests across 23 test files** (100% passing).
- **Localization Parity**: Automated test [`src/test/locales-parity.test.ts`](file:///c:/Users/HP/Downloads/screenshot-to-spark-0803-main/src/test/locales-parity.test.ts) enforces 100% key and parameter parity across all 11 Indic language files.
- **Lint & Types**: 0 TypeScript compilation errors, 0 ESLint errors.

---

## Credits and Licence

### Data Sources & Attributions

- **Facility Map Data**: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Geocoding & Healthcare Search**: Powered by [Geoapify Places API](https://www.geoapify.com/).
- **Government Welfare Portals**: Official publications from the Ministry of Health and Family Welfare (MoHFW), Ministry of Women and Child Development (MWCD), and official State Health Mission portals.

### Medical Disclaimer

> **Sakhi provides educational health information and self-tracking tools. It does not provide medical diagnoses, treatment plans, or clinical prescriptions.**
> Sakhi is not a substitute for professional medical advice, diagnosis, or treatment. Users experiencing acute pain, severe bleeding, or emergency symptoms are instructed to contact their local emergency service (**108 Ambulance**) or visit the nearest healthcare facility immediately.
