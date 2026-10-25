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
```

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

> **Note on Reminders**: In-app reminders trigger toasts and notification banners while the app is open. Reliable background reminders will require Twilio SMS/WhatsApp integration.

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
