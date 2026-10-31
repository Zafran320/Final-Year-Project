# Improvement Plan

Phased plan for hardening, fixing, and rebranding the project. **Rule for every phase:** core
functionality (CV upload & analysis, company preparation, AI live interview, roadmap, dashboard,
Job Radar) must keep working exactly as before. Each phase ends with `npx tsc --noEmit` and
`npx vitest run` passing, plus a manual smoke test of the affected screens.

Status legend: ⬜ not started · 🟨 in progress · ✅ done

---

## Phase 1 — Security & Foundation ✅ (code done, 1.9 is yours)

Goal: close the critical security holes and get the full test suite running. No UI changes.

| ID | Task | Files | Status |
|----|------|-------|--------|
| 1.1 | Verify Supabase access tokens with Supabase (`auth.getUser`) instead of decoding the JWT payload without a signature check (account-takeover fix) | `server/routers/auth.ts` | ✅ |
| 1.2 | Block path traversal in the storage proxy; serve only files inside `.storage/` | `server/_core/storageProxy.ts` | ✅ |
| 1.3 | Remove hardcoded fallback session secret. Production refuses to run without a ≥32-char `JWT_SECRET`; development uses a random per-process secret with a warning | `server/_core/env.ts`, `server/_core/sdk.ts` | ✅ |
| 1.4 | Require a signed-in user + rate limit on `/api/gemini-live-token`, `/api/generate-speech`, and the `/api/gemini-live-ws` WebSocket upgrade | `server/_core/requestGuards.ts` (new), `server/_core/app.ts`, `server/ttsRouter.ts`, `server/geminiLiveProxy.ts` | ✅ |
| 1.5 | Validate TTS input (text length cap, `rate`/`pitch`/`volume` format) | `server/ttsRouter.ts` | ✅ |
| 1.6 | Reduce request body limit: 25 MB for tRPC (uploads), 1 MB everywhere else | `server/_core/app.ts` | ✅ |
| 1.7 | Fix test infrastructure: pin `jsdom` to a Node 20–compatible version, add missing `@testing-library/dom` | `package.json` | ✅ |
| 1.8 | Tests for 1.1–1.5 | `server/routers/auth.test.ts`, `server/_core/storageProxy.test.ts`, `server/_core/requestGuards.test.ts` | ✅ |
| 1.10 | Supabase clients failed to start on Node 20 (no global WebSocket) so auth/storage silently fell back to local JSON; pass `ws` as realtime transport | `server/supabase.ts` | ✅ |
| 1.9 | **Manual (you):** create your own Supabase project, Gemini key, Google Maps key; put them in `.env`; generate a new `JWT_SECRET` (`openssl rand -hex 32`) | `.env` | ⬜ |

## Phase 2 — Rename & Rebrand ✅ (code done, 2.6 is yours)

New name: **FutureMaker AI** (short name `FutureMaker`, slug `futuremaker-ai`). Logo artwork kept as is.

| ID | Task | Status |
|----|------|--------|
| 2.1 | Product name replaced across UI, SEO/OG tags, manifest, AI prompts, server User-Agents, docs, tests (57 files) | ✅ |
| 2.2 | Logo moved to neutral `/branding/logo.png`; every usage reads `BRAND_LOGO_SRC` / `BRAND_NAME` from `client/src/lib/brand.ts` | ✅ |
| 2.3 | Browser storage keys renamed (`futuremaker_*`) with a one-time migration from the old `careertwin_*` keys at startup, plus tests | ✅ |
| 2.4 | Supabase bucket `careertwin-storage` intentionally kept (renaming breaks uploaded CVs) | ✅ |
| 2.5 | `package.json` name, `.env.example` `VITE_APP_ID` | ✅ |
| 2.6 | **Manual (you):** set `VITE_APP_ID="futuremaker-ai"` in your own `.env`; rename the Vercel project/domain and GitHub repo if wanted, then update the `careertwin-ai.vercel.app` URLs in `docs/SUPABASE_URL_CONFIGURATION_GUIDE.md` and Supabase Auth redirect settings | ⬜ |

Intentionally unchanged: `manus-storage/careertwin-*.jpg` asset filenames, `reference_unpacked/`, presentation files, old `career-twin-logo.*` files (all Phase 6 cleanup).

## Phase 3 — Location & Job Radar ✅

Fixes "I'm in Islamabad but get Karachi jobs" and replaces hard-coded jobs with live listings.

Root causes found: (a) the browser picked the wrong OpenStreetMap address field, so Bahria Town
became the city "Zone IV" and Saddar, Rawalpindi became "Saddar"; (b) when GPS failed, IP lookup
was used (Pakistani ISPs geolocate to Karachi/Lahore) and cached forever; (c) the server treated
every Pakistani job as an equal "match"; (d) unknown cities got two invented jobs; (e) the city
list was a hard-coded set of companies, not live openings.

| ID | Task | Status |
|----|------|--------|
| 3.1 | One location source (`client/src/lib/userLocation.ts`): GPS → server geocoder → profile city → manual picker. IP lookup removed | ✅ |
| 3.2 | Server reverse geocoding (`server/services/location.ts`, `location.reverseGeocode`): Google if the Geocoding API is enabled → OpenStreetMap → nearest known city; 24 h cache, rate-limited, startup status log | ✅ |
| 3.3 | Distance-tier ranking: same city → ≤50 km → same province → remote (open to PK) → rest of country → elsewhere | ✅ |
| 3.4 | GPS fix expires after 24 h (manual choice 30 days); "Change city" + "Use my current location" controls | ✅ |
| 3.5 | `islamabadpakistan` bug fixed; "Near me"/city tabs no longer fall back to all jobs; fake counts removed | ✅ |
| 3.6 | Shared city reference table (`shared/pakistanCities.ts`) for name matching, distances and the city picker | ✅ |
| 3.7 | **No hard-coded jobs or companies.** Live local jobs from JSearch v5 (`/search-v2`) and SerpApi Google Jobs, queried in parallel, merged and de-duplicated (`server/services/localJobs.ts`); remote boards added only when a job-search key is set | ✅ |
| 3.8 | Quota protection (`server/services/jobSearchStore.ts`): 12 h disk cache, shared in-flight requests, monthly limit guard, provider-reported remaining count; search/filters run client-side; endpoint signed-in only and rate-limited (40/hour/user) | ✅ |
| 3.9 | Clear errors: no key → no listings + "connect a job search API key"; limit reached → "monthly limit reached"; outage → "temporarily unavailable" | ✅ |
| 3.10 | Apply tracking fixed: opening a posting records "opened"; only "Yes, I applied" or "Mark applied" records "applied" (`client/src/lib/jobApplications.ts`) | ✅ |
| 3.11 | **Manual:** `JSEARCH_API_KEY` set ✅; `SERPAPI_API_KEY` optional; Google Geocoding API optional (needs billing) | 🟨 |

## Phase 4 — Landing Avatar ⬜

- 4.1 Keep idle pose until sprite sheet is loaded (fixes vanishing character)
- 4.2 Reveal hero only when all images are ready
- 4.3 Frame-rate-independent spring (fixes jitter/spinning at low FPS)
- 4.4 Proper frame crossfade (fixes ghost/double face)
- 4.5 Dead zone around the eyes (fixes head snapping)
- 4.6 Pause animation when off-screen / tab hidden; lighten global pointer tracker
- 4.7 Convert sprites to WebP (~4 MB → ~1 MB)

## Phase 5 — Colour Scheme & Visual Identity ⬜

Needs: palette direction.

- 5.1 Consolidate duplicated theme tokens in `client/src/index.css`
- 5.2 Apply new palette (light + dark) and typography
- 5.3 Replace hardcoded hex values and Tailwind colour classes with tokens
- 5.4 Screenshot every route in both themes to confirm nothing broke

## Phase 6 — Cleanup ⬜

- 6.1 Delete unused template code (`heartbeat`, `dataApi`, `imageGeneration`, `voiceTranscription`, `_core/map.ts`, `Map.tsx`, `ManusDialog`, `ComponentShowcase`, `WelcomeExperience`, `PakistanInteractiveMap`, `JobRecommendationsRadar`)
- 6.2 Remove `client/public/__manus__/debug-collector.js`, `.manus-logs`, `files.zip`, `reference_unpacked/`, legacy MySQL migrations
- 6.3 One package manager (remove the other lockfile)
- 6.4 Rewrite `README.md` and `SECURITY.md` to match reality
- 6.5 Replace unverifiable marketing claims with accurate copy

## Phase 7 — Quality & "Master Project" Upgrades ⬜

- 7.1 GitHub Actions: type-check + tests on every push
- 7.2 Playwright end-to-end tests (login → CV upload → interview → jobs)
- 7.3 Split `LiveInterview.tsx` (4.5k lines) into components, same behaviour
- 7.4 Unify duplicated job logic (`JobRadarPage` / `JobRecommendationsGrid`)
- 7.5 Accessibility pass (keyboard, contrast, labels)
- 7.6 SSRF hardening for company-prep URL fetcher (pin resolved IP)
- 7.7 Architecture diagram + documentation for the report

---

## Change Log

### Phase 1 — results
- Branch: `phase-1-security-foundation` (not committed yet)
- Type-check: 23 errors → **0**
- Tests: 14 files / 82 tests running (18 files crashed) → **34 files / 269 tests, all passing**
- Production build: passes; hardcoded secret no longer present in `dist/index.js` or `api/index.js`
- Smoke test on the built server:

  | Request | Before | After |
  |---|---|---|
  | `GET /api/gemini-live-token` (anonymous) | 200, token issued | **401** |
  | `POST /api/generate-speech` (anonymous) | 200, audio generated | **401** |
  | WebSocket `/api/gemini-live-ws` (anonymous) | connected | **401** |
  | `GET /local-storage/..%2F..%2F…%2Fetc%2Fpasswd` | file served | **400** |
  | Home page, `/api/health`, `auth.me` | 200 | 200 |

- Behaviour change to note: because Supabase now actually initialises, login/storage use the
  Supabase project in `.env` instead of the local `.data/` JSON fallback. Do 1.9 first so that
  project is yours.

### Phase 3 — results
- Type-check: 0 errors. Existing test suite updated for the new behaviour: **34 files / 272 tests, all passing**. Production build passes.
- Live end-to-end test with a real JSearch key (31 Oct 2026): Islamabad, Lahore and Rawalpindi users each
  received 10 real postings from their own city first (e.g. Islamabad: CareCloud, Monty Mobile, Aventus),
  3–9 s for a first search, 0.03 s from cache.
- Location: Bahria Town → Islamabad, Saddar → Rawalpindi (OpenStreetMap; Google Geocoding not enabled).
