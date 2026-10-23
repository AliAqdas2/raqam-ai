# AUDIT.md — Phase 0 Repository and Architecture Audit

> **Date:** 2026-08-27
> **Agent:** AI Coding Agent
> **Phase:** Phase 0 — Repository and Architecture Audit
> **Status:** COMPLETE

---

## Executive Summary

The Raqam-AI repository is a **greenfield project**. It contains no application code, no dependencies, no configuration, and no infrastructure. The only substantive file is `AGENTS.md`, which serves as the complete product and engineering specification. Phase 1 (UI Fidelity / Design Mirroring) can begin immediately after this audit, as there is no existing code to refactor, migrate, or reconcile.

---

## 1. Current Repository State

### 1.1 Files

| File         | Purpose                                      |
| ------------ | -------------------------------------------- |
| `AGENTS.md`  | Product specification and agent instructions |
| `.gitignore` | Standard Next.js/Node.js ignore patterns     |

**Total tracked files:** 2
**Total application code files:** 0

### 1.2 Git History

| Commit    | Description              |
| --------- | ------------------------ |
| `52f8d09` | Initial commit           |
| `92b185e` | AGENTS.md initialized    |
| `5c692b7` | Add .gitignore           |
| `1550518` | Merge remote main (HEAD) |

**Branch:** `main` (single branch, up to date with `origin/main`)
**Unstaged changes:** `AGENTS.md` (modified locally)

### 1.3 Package Manager / Dependencies

- **No `package.json` exists.** No Node.js project has been initialized.
- **No `node_modules/` directory.**
- **No lock files** (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
- **No dependencies installed or declared.**

---

## 2. Routes and Data Sources

### Current routes

**None.** No Next.js application has been initialized. There is no `app/` directory, no `pages/` directory, and no routing configuration of any kind.

### Data sources

**None.** No data fetching, no API calls, no database connections, no hardcoded data files exist.

---

## 3. Mock / Hardcoded Data

**None.** There are no TypeScript files, no data arrays, no fixture files, and no `// MOCK_DATA` comments anywhere in the repository.

---

## 4. Existing Convex Functions

**None.** There is no `convex/` directory, no `convex/schema.ts`, no queries, no mutations, no actions, and no Convex configuration.

---

## 5. Current Authentication State

**None.** No authentication provider (Clerk, Convex Auth, or otherwise) has been configured. There are no auth-related files, no middleware, no protected routes, and no user management code.

---

## 6. Missing Environment Variables

All environment variables specified in `AGENTS.md` §5 are missing. No `.env`, `.env.example`, or `.env.local` files exist.

| Variable                            | Status  | Required By                 |
| ----------------------------------- | ------- | --------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | Missing | Phase 4 (Convex Layer)      |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Missing | Phase 3 (Auth)              |
| `CLERK_SECRET_KEY`                  | Missing | Phase 3 (Auth)              |
| `GOOGLE_GENERATIVE_AI_API_KEY`      | Missing | Phase 8 (Conversational AI) |
| `OPENAI_API_KEY`                    | Missing | Alternative to Gemini       |
| `GOOGLE_CLOUD_VISION_API_KEY`       | Missing | Phase 11 (Multimodal)       |
| `OPENAI_WHISPER_API_KEY`            | Missing | Phase 11 (Multimodal)       |

---

## 7. Dependency Conflicts with Tech Stack Requirements

**None.** Since no dependencies exist, there are no conflicts. The following stack must be established in Phase 1:

| Concern     | Required Technology      |
| ----------- | ------------------------ |
| Framework   | Next.js (App Router)     |
| Language    | TypeScript (strict mode) |
| Styling     | Tailwind CSS             |
| Components  | shadcn/ui                |
| Backend/DB  | Convex                   |
| Auth        | Clerk or Convex Auth     |
| AI Provider | Gemini or GPT-4o         |

---

## 8. Technical Debt

**None.** There is no code to incur debt against.

---

## 9. `.gitignore` Assessment

The existing `.gitignore` is a standard Next.js/Node.js ignore file. It correctly excludes:

- `node_modules/`
- `.next/` and `out/`
- `.env` and `.env*.local`
- `build/`
- `coverage/`
- `.vercel`
- `*.tsbuildinfo` and `next-env.d.ts`

**Missing entries to add in Phase 1 or later:**

- `convex/_generated/` (Convex auto-generated code)
- `.turbo/` (if Turborepo is used)
- `components/ui/` (shadcn/ui generated components — per AGENTS.md §5 "do not edit")

---

## 10. Phase 1 Readiness Assessment

### What needs to happen before Phase 1 can begin

The current app is in state: **Empty repository with only a specification document.**

The following **12 things** need to be created/established in Phase 1:

1. **Initialize Next.js project** with App Router and TypeScript (strict mode).
2. **Install and configure Tailwind CSS** with RTL support.
3. **Install and configure shadcn/ui** component library.
4. **Set up the directory structure** as specified in AGENTS.md §5 (routes, components, lib, hooks, convex, public/fonts).
5. **Load Urdu-capable font** (Noto Naskh Arabic) in `app/layout.tsx`.
6. **Create all primary route pages** (dashboard, transactions, budgets, goals, assistant, settings, login, signup).
7. **Build navigation** (sidebar or bottom bar).
8. **Implement all primary screens** with realistic placeholder/mock data labeled `// MOCK_DATA — replace in Phase 2`.
9. **Ensure RTL compatibility** from the start (`dir="rtl"` support, Tailwind RTL variants).
10. **Ensure responsiveness** at 320px, 768px, and 1280px breakpoints.
11. **Create `.env.example`** with all required environment variable names (values empty).
12. **Update `.gitignore`** to include `convex/_generated/` and `components/ui/`.

### Blockers for Phase 1

**None.** The repository is clean and ready for Phase 1 to begin immediately.

---

## 11. Conclusion

This is a greenfield repository. The audit confirms:

- **0 routes** exist
- **0 mock data sources** exist
- **0 Convex functions** exist
- **0 auth implementation** exists
- **0 environment variables** are configured
- **0 dependency conflicts** exist
- **0 technical debt** exists

The repository is in a pristine state, ready for Phase 1 (UI Fidelity / Design Mirroring) to begin. The `AGENTS.md` specification is comprehensive and provides all necessary guidance for implementation. No existing code needs to be reconciled, migrated, or refactored.

---

## 12. Post-Audit Dependency & Service Log

Additions made after Phase 0, recorded here per AGENTS.md §15 ("Introducing a new npm package without adding it to `AUDIT.md` with justification" is prohibited).

| Date       | Item                                             | Type                                     | Justification                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-30 | `vitest` `4.1.11`                                | devDependency (test runner)              | Runs `tests/unit/**`. Seeds AGENTS.md Phase 14. Zero runtime/bundle footprint. Adds `npm run test` / `typecheck` scripts + `.github/workflows/ci.yml`.                                                                                                                                                                                                                      |
| 2026-08-30 | AssemblyAI (`api.assemblyai.com`)                | External service (speech-to-text)        | Primary voice-transcription engine (model `universal-2` — cheapest tier, and the only AssemblyAI model supporting Urdu). Free tier covers hackathon demo volume. **User-approved.** No SDK added — raw `fetch` from `convex/ai.ts` via `lib/ai/transcription.ts`. Falls back to Gemini, then the browser Web Speech API. Key: `ASSEMBLYAI_API_KEY` (Convex deployment env). |
| 2026-08-30 | `framer-motion` `13.1.1`                         | dependency (UI animation)                | Assistant-page micro-interactions — composer focus ring, `VoiceRecorder` entrance, message-bubble entrance, suggestion-card hover. **User-approved.** React-19 compatible; ~35 KB gz. Scoped to `components/assistant/**`.                                                                                                                                                  |
| 2026-08-31 | `papaparse` `5.7.0` + `@types/papaparse` `5.5.2` | dependency + devDependency (CSV parsing) | Phase 12 bank-statement import. Battle-tested RFC-4180 parser (quoted commas, CRLF, BOM) instead of hand-rolled CSV splitting. Runs **client-side only** — `convex/imports.ts` imports just the pure normalizer, so papaparse never enters the Convex bundle. Pinned exact; `npm audit`: zero advisories from this package.                                                 |
| 2026-08-31 | Phase 13 — Proactive Financial Assistance         | **no new runtime packages**               | Budget/anomaly/bill/summary alerts + recurring-bill CRUD. New `lib/finance/` pure modules, `convex/recurring.ts` + `convex/proactive.ts`, `dismissedAlerts` table, dashboard alert region. `framer-motion` scope unchanged (used `tw-animate-css`, already present). `npm install` was run once to restore `papaparse` / `@types/papaparse` into `node_modules` (declared in Phase 12, never installed here). |
| 2026-08-31 | `convex-test` `0.0.56` + `@edge-runtime/vm` `5.0.0` | devDependencies (Convex integration tests) | Headless verification of Phase 13's Convex queries/mutations (`tests/integration/proactive.test.ts`) — seeds a scenario, runs `proactive.*` / `recurring.*` against convex-test's in-memory backend, no deployment or Clerk. Seeds AGENTS.md Phase 14 ("Integration tests for all Convex mutations"). Pinned exact. Zero runtime/bundle footprint; `tests/integration/**` files opt into the edge-runtime env via a per-file pragma. `convex/seed.ts` (`proactiveDemo` / `clearDemo`) is a CLI-only dev helper, not imported by the app. |
| 2026-08-31 | Phase 14 — Safety, Reliability & Testing           | **no new packages**                        | Full automated test pass: `tests/unit/{anomaly,projections,ai-schemas}.test.ts`, `tests/integration/{transactions,budgets,goals,categories,imports,summary,users,confirmation-gate,auth-isolation}.test.ts` (+ shared `tests/integration/_helpers.ts`), `tests/live/ai.live.test.ts` (self-skips without `GOOGLE_GENERATIVE_AI_API_KEY`). Suite total: **193 passing, 3 self-skipping live**. Two source fixes: `convex/assistant.ts#getConversationHistory` (added the missing auth + ownership check) and `convex/budgets.ts#getBudgetCategories` (`[]` instead of throw for a stale/foreign budget id). |
| 2026-08-31 | Phase 15 — Hackathon Polish                        | **`@clerk/ui` REMOVED · no new packages**   | `npm uninstall @clerk/ui` → **338 packages gone**, `npm audit` **0 vulnerabilities** (see §12.2). New: `auditLog` table + `convex/auditLog.ts` (AI-action trail, §6/§9), `users.onboardingCompletedAt`, `/onboarding` route, `<Landing/>` at `/` (bilingual, self-contained), `seed:demo` (replaces `proactiveDemo`), `docs/DEPLOY.md`. `confirmAction` returns instead of throwing on executor failure. Dashboard staged-render perf pass. New tests: `tests/integration/{audit-log,seed}.test.ts`. Suite: **200 passing, 3 self-skipping live**. |
| 2026-09-03 | `nodemailer` `9.1.1` + `@types/nodemailer` `8.0.1` | dependency + devDependency (email) | Post-hackathon addition — proactive alert notifications by email. Gmail SMTP transport, chosen by the user over Resend (Vercel Marketplace) and AWS SES for hackathon-scale simplicity (App Password, no domain verification). **User-approved.** Isolated to `lib/notifications/email.ts`, called only from `convex/notifications.ts` ("use node"). Keys: `GMAIL_USER` / `GMAIL_APP_PASSWORD` (Convex deployment env). `npm audit`: zero new advisories from this package. |
| 2026-09-03 | `@aws-sdk/client-pinpoint-sms-voice-v2` `3.1125.0` | dependency (SMS) | Post-hackathon addition — same alerts, by SMS via AWS End User Messaging. Chosen over Twilio (account creation blocked for this user) and confirmed against AWS's country-support docs: Pakistan sends via a self-service alphanumeric Sender ID with no destination-country pre-registration step (unlike India/Turkey/Vietnam/etc.). **User-approved**, overriding AGENTS.md Tier 4 / §17 ("SMS integration ... do not implement during the hackathon") — those items were deferred for hackathon-timeline/cost reasons (Twilio cost, FCM setup cost) that don't apply to this post-hackathon, AWS-based addition; see `docs/superpowers/specs/2026-09-03-alert-notifications.md`. Isolated to `lib/notifications/sms.ts`, called only from `convex/notifications.ts`. Keys: `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SMS_SENDER_ID` (Convex deployment env). `npm audit`: zero new advisories from this package (the one new moderate `qs` advisory after `npm install` traces to the pre-existing `shadcn` → `@modelcontextprotocol/sdk` → `express` devDependency chain, unrelated to this addition and unchanged by it). |
| 2026-09-03 | Alert-notification sweep (email + SMS)             | **schema + convex + lib** | New `notificationsSent` table (dedup, mirrors `dismissedAlerts` key shape); `convex/proactive.ts` refactored to a shared `computeAlerts()` used by both the auth-scoped `getAlerts` query and the new `internalQuery getAlertsForUser` (no identity in a cron); `convex/crons.ts` (first cron in this codebase) runs `convex/notifications.ts#runAlertSweep` hourly; bilingual (ur/en) message bodies in `lib/notifications/templates.ts`. Reuses existing `notificationPrefs` toggles and `users.email`/`users.phone` — no new UI. New tests: `tests/unit/notifications-templates.test.ts`. Suite: **206 passing, 3 self-skipping live**. |
| 2026-10-23 | Azure AI Speech — neural text-to-speech (`{region}.tts.speech.microsoft.com`) | External service (text-to-speech) | Gives the assistant a voice (two-way voice with the existing STT). Chosen for native Pakistani Urdu neural voices (`ur-PK-UzmaNeural` / `ur-PK-AsadNeural`) plus natural multilingual English voices (`en-US-Ava/AndrewMultilingualNeural`); free F0 tier (0.5M chars/month), $200 starter credit on new Azure accounts, then ~$16 / 1M chars, matching the user's ask for "free credits, then cheap". No SDK added: raw `fetch` from `convex/ai.ts#synthesizeSpeech` via `lib/ai/tts.ts`; the action requires a signed-in caller (billed per character). Falls back to the browser `speechSynthesis`. Keys: `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` (Convex deployment env). |
| 2026-10-23 | Input relevance guardrail · voice call · Ask Raqam · trend chart | **no new packages** | `lib/ai/guardrail.ts`: a Relevance Guardrail Agent attached to the triage agent as an Agents SDK *input* guardrail (blocking, fail-open; no output guardrail by design); blocked messages get a deterministic bilingual redirect and are stored with the new `messages.intentType` literal `"offTopic"`. `hooks/useVoiceCall.ts` + `components/assistant/VoiceCallOverlay.tsx`: hands-free "Call Raqam" (VAD auto-stop added to `useVoiceInput`; transcript always shown with a cancel window; write actions still need a tap on the ConfirmationCard). Dashboard opens on `components/dashboard/AskRaqam.tsx` (query → `/assistant?q=`), real 6-month trend (`lib/finance/trend.ts` + `summary.getMonthlyTrend`). Manrope switched to the variable font (fixes a Turbopack dev font-loader error). New tests: `tests/unit/{agent-workflow,guardrail,tts,trend,voice-vad}.test.ts`, `tests/live/guardrail.live.test.ts`, `getMonthlyTrend` integration tests. Suite: **300 passing, 4 self-skipping live**. |

### 12.1 `npm audit` — Phase 14 review (2026-08-31)

`npm audit`: **0 critical, 7 high, 12 moderate, 19 total.** All 19 are transitive
under a single direct dependency, **`@clerk/ui`** (used only for the Clerk `shadcn`
appearance theme — `app/layout.tsx` `import { shadcn } from "@clerk/ui/themes"` +
`app/globals.css` `@import "@clerk/ui/themes/shadcn.css"`).

| Advisory group | Severity | Path | Exploit path in this app |
| --- | --- | --- | --- |
| `image-size` (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq) — ICNS / JXL / HEIF parser infinite-loop DoS | high ×2 | `@clerk/ui` → `@solana/wallet-adapter-react` → `react-native` → `metro` → `image-size` | **None.** No patched `image-size` exists (2.0.2 is latest; advisories cover `<=2.0.2`). Metro/RN bundler never runs; no ICNS/JXL/HEIF parsing anywhere. |
| `metro`, `metro-config`, `metro-transform-worker` — via `image-size` | high ×3 | same RN toolchain subtree | **None.** This is a Next.js web app; Metro is never invoked. |
| `react-native`, `@react-native/community-cli-plugin`, `@react-native/virtualized-lists` | high ×2 + mod | `@clerk/ui` → `@solana/wallet-adapter-react` → `@solana-mobile/wallet-adapter-mobile` | **None.** `react-native` is never imported, bundled, or executed. |
| `@solana/web3.js` (via `jayson` → `uuid` buffer bounds check), `@solana/wallet-*`, `@clerk/ui` | moderate ×9 | Clerk Web3 wallet sign-in (unused) | **None.** No crypto-wallet auth is wired; `@clerk/nextjs` handles all auth. |

**Decision (grill-me):** documented as accepted for the hackathon — 0 critical, and
every high is a `CWE-835` infinite-loop DoS in React-Native / Metro build tooling
that is transitively present but never loaded on any code path of this deployment.
`npm audit fix` does not help (it wants to *add* ~124 RN packages); there is no
patched `image-size`.

**Phase 15 action item:** remove `@clerk/ui`. Replace `appearance={shadcn}` with an
inline Clerk `appearance` object (or `@clerk/themes`, which has no Solana / React
Native dependency tree). That drops all 19 advisories and a large slice of
`node_modules`. Deferred here because it changes the look of the login / signup
screens and needs a visual pass.

### 12.2 `npm audit` — Phase 15 (2026-08-31) — RESOLVED

`@clerk/ui` removed (`npm uninstall @clerk/ui` — **338 packages** gone,
the entire `@solana/*` + `react-native` + `metro` + `image-size` subtree with
them). `app/layout.tsx` now passes an inline `appearance={{ variables: {…} }}`
(warm-ledger palette) to `<ClerkProvider>`; `app/globals.css` no longer imports
`@clerk/ui/themes/shadcn.css`. The per-page `<SignIn>` / `<SignUp>`
`appearance.elements` overrides (unchanged) carry the detailed styling.

**`npm audit` now: `found 0 vulnerabilities`.** All 19 advisories from §12.1
are gone. Visual check of `/login` + `/signup` after the swap is on the Phase 15
browser checklist (PROGRESS.md).

---

_Audit completed. Phase 0 exit criteria satisfied: AUDIT.md exists, accurately describes the current state, and a human or another agent can read it and agree it is accurate._
