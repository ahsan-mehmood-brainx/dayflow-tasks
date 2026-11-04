---
diff_hash: 8b266cef74bf7be617176b57c47396d7cdf0ea4f5fdbadfa1d3b8b60e950780c
reviewed_at: 2026-11-04T14:28:10Z

## Summary

Stack: React Native / Expo SDK 58 (React marker). Builds the DayFlow Tasks app on the scaffold: a
layered architecture (domain / data / state / presentation) with Redux Toolkit, React Navigation 7
(typed, auth-gated root stack), FlashList, a repository pattern with mock and REST implementations, a
small fetch-based ApiService, constructor-based DI, ESLint layer-boundary rules, and 15 test suites.

Re-review (since the previous review): 2 of 3 open findings are fixed. `AGENTS.md` now records the
React Navigation deviation, and the `web` block was removed from `app.json`. `appConfig.ts` now rejects
cleartext `http://` for non-local hosts. The Medium API-security finding is only partly addressed:
`ApiService` gained a `getHeaders` hook, but nothing in the composition root supplies it, and the
README is internally inconsistent about auth support. It stays open. No new findings were raised.

Verification from the previous review (not re-run for this pass): `tsc --noEmit` clean, `expo lint`
clean, `jest` 135/135. Large lockfile (package-lock.json) skimmed only.

## Findings

### Critical (0)

### High (0)

### Medium (1)
- **src/shared/api/ApiService.ts:84** — API mode sends requests with no credentials. The cleartext-http
  part of the original finding is fixed, but the unauthenticated-request part is still open. *(security)*
  - status: open
  - dev_reasoning: N/A
  - ai_reasoning: Re-review. Fixed part: `src/config/appConfig.ts` `parseBaseUrl` now throws unless
    `http://` targets a dev host (`DEV_HOST_PATTERN` / `isCleartextAllowed`), so a non-local cleartext
    base URL is rejected at startup. Still open: `ApiService.execute` now spreads `this.getHeaders()`
    into request headers, but `src/core/di/dependencies.ts` constructs `new ApiService({ baseUrl,
    timeoutMs })` without `getHeaders`, so no `Authorization` header is ever sent. Auth is simulated
    (`MockAuthService`, no token), so with `EXPO_PUBLIC_TASK_REPOSITORY=api` the sign-in gate is still
    client-side only. README.md:348 documents "API requests are not authenticated", which covers the
    "document it" option only partly. README.md:145 says ApiService has "no auth-header support", which
    is now stale and contradicts the new hook. To close: either state in README that api mode is
    dev-only for this training project and fix the README:145 contradiction, or wire a token source into
    `getHeaders` before pointing at a real backend. If this is intentionally training-only, mark skipped
    with that reason.

### Low (2)
- **AGENTS.md:28** — Project instructions mandated Expo Router and `src/app/`, contradicting the
  React Navigation 7 implementation. *(consistency)*
  - status: fixed
  - dev_reasoning: N/A
  - ai_reasoning: AGENTS.md "Navigation & Routing" now states the deliberate React Navigation 7
    choice, forbids adding `expo-router` or `src/app/`, and points to `src/core/navigation/` and the
    React Navigation docs. The contradiction is resolved.
- **app.json** — Leftover `web` config (favicon) after the `web` script and `react-native-web`
  support were dropped. *(consistency)*
  - status: fixed
  - dev_reasoning: N/A
  - ai_reasoning: The `expo.web` block is removed from `app.json` (diff shows the block replaced by a
    `plugins` array). No `"web"` key remains in `app.json` or `package.json`, so the half-declared
    platform is gone. Web is out of scope, as the finding allowed.

## Reviewed files
- .code-reviews/brainx-review.md — review file (excluded from diff hash so the hash is stable when written)
- .env.example — reviewed (no secrets; documents public-only vars)
- .gitignore — reviewed (`.env*.local` and `coverage/` ignored)
- App.tsx — reviewed (deletion; entry moved to src/App.tsx)
- README.md — reviewed (skimmed; checked for the auth-posture contradiction noted above)
- AGENTS.md — re-reviewed (changed; finding resolved)
- app.json — re-reviewed (changed; finding resolved)
- eslint.config.js, jest.setup.ts, index.ts, tsconfig.json — reviewed (no issues)
- package.json — reviewed (no open issues; web script no longer present)
- package-lock.json — skimmed (consistent with package.json)
- src/config/appConfig.ts, src/config/__tests__/appConfig.test.ts — re-reviewed (changed; cleartext fix verified)
- src/shared/api/ApiService.ts — re-reviewed (changed; getHeaders hook added, still unused by composition root)
- src/shared/api/__tests__/ApiService.test.ts — skimmed (changed)
- src/config/demoAccount.ts, src/core/**, src/App.tsx — unchanged since last review
- src/features/auth/** — unchanged since last review (no issues; demo credentials documented as non-secret)
- src/features/tasks/{data,domain,state}/** — unchanged since last review (no issues)
- src/features/tasks/presentation/** — unchanged since last review (hooks reviewed in depth; screens and components skimmed)
- src/features/tasks/testing/**, all other __tests__/** — skimmed (135 tests passed previously)
- src/shared/lib/**, src/shared/hooks/** — unchanged since last review
- src/shared/theme/tokens.ts, src/shared/ui/** — skimmed
