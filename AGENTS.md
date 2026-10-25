## Architecture rules

- All data access goes through `src/services/*` (currently localStorage mocks) so real backends can be swapped in without UI changes.
- UI strings live only in `src/i18n/locales/*.json`. **Every new UI string must be added to ALL 11 locale files (`en`, `hi`, `te`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `pa`, `or`) with identical keys.** The automated test `src/test/locales-parity.test.ts` enforces 100% key and placeholder parity across all locales.
- Supported languages (11 total):
  - English (`en`)
  - हिन्दी (`hi` - Hindi)
  - తెలుగు (`te` - Telugu)
  - தமிழ் (`ta` - Tamil)
  - ಕನ್ನಡ (`kn` - Kannada)
  - മലയാളം (`ml` - Malayalam)
  - मराठी (`mr` - Marathi)
  - বাংলা (`bn` - Bengali)
  - ગુજરાતી (`gu` - Gujarati)
  - ਪੰਜਾਬੀ (`pa` - Punjabi)
  - ଓଡ଼ିଆ (`or` - Odia)
- Non-English locales are loaded lazily via dynamic import (`addResourceBundle`) to keep the initial page bundle lightweight while ensuring full SSR compatibility.
- Browser storage is read only in effects/handlers (SSR safety); auth gating happens client-side in `AppShell`.
