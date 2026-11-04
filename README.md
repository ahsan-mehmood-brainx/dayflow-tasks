# DayFlow Tasks

A lightweight task manager built with Expo, React Native and TypeScript as a self-contained training
project. It runs fully offline against an in-memory mock repository, and ships an HTTP-backed
repository behind the same interface for use with a real API.

Targets iOS and Android. Web is not supported, because `react-native-web` is not installed.

## Requirements

| Tool    | Version                                  |
| ------- | ---------------------------------------- |
| Node.js | ≥ 22.13 (required by Expo SDK 58)        |
| npm     | bundled with Node                        |
| Expo    | SDK 58 (React Native 0.88, React 19.3)   |

To run on a device, use Expo Go or a development build. iOS 16.4+ and Android 7+ are supported.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional; defaults select the mock repository
npm start                    # then press i / a, or scan the QR code with Expo Go
```

## Scripts

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `npm start`         | Start the Expo dev server                      |
| `npm run lint`      | ESLint (`expo lint`) incl. architecture rules   |
| `npm run typecheck` | `tsc --noEmit` in strict mode                   |
| `npm test`          | Jest (`jest-expo` preset) + Testing Library     |
| `npm run test:watch` / `test:coverage` | Watch mode / coverage report (`coverage/`, git-ignored) |
| `npm run verify`    | Lint, typecheck and tests in sequence           |

## Configuration

Configuration is read once at the composition root from `EXPO_PUBLIC_*` variables
(see [.env.example](.env.example)) and validated by [`parseAppConfig`](src/config/appConfig.ts).
An invalid combination fails fast at startup with a descriptive `ConfigError`.

| Variable                      | Default | Description                                          |
| ----------------------------- | ------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_TASK_REPOSITORY` | `mock`  | `mock` or `api`: which `TaskRepository` is injected   |
| `EXPO_PUBLIC_API_BASE_URL`    | –       | http(s) base URL; required when the repository is `api` |
| `EXPO_PUBLIC_API_TIMEOUT_MS`  | `10000` | HTTP request timeout                                  |
| `EXPO_PUBLIC_MOCK_LATENCY_MS` | `350`   | Simulated latency so loading states are visible       |

`EXPO_PUBLIC_*` values are inlined into the bundle, so never put secrets in them. Restart the dev
server with `--clear` after changing them.

## Architecture

A pragmatic, feature-based clean architecture. Dependencies point inward:
presentation → state (application) → domain, with data implementing domain contracts.

```
index.ts                     Entry point; registers src/App
src/
  App.tsx                    Composition root: reads config, builds the dependency container
  config/                    Environment parsing and validation
  core/                      App infrastructure
    di/                      AppDependencies container + React Context provider
    store/                   Redux store factory, typed hooks, typed thunk creator
    providers/               Provider tree (safe area → dependencies → store)
    testing/                 Test store factory and full-app render harness
    navigation/              Typed param lists, root stack (auth gate), tabs, tasks stack
  shared/
    lib/                     Result, AppError, calendar-date helpers (framework-free)
    api/                     ApiService: fetch wrapper with timeout, cancellation and typed errors
    theme/                   Design tokens (colour, type, spacing, radii, elevation, sizes)
    hooks/                   useToday (local day, refreshes at midnight and on foreground)
    ui/                      Design-system components built on the tokens
  features/
    tasks/
      domain/                Task model, business rules, ordering/filtering/overview, TaskRepository contract
      data/                  MockTaskRepository, ApiTaskRepository, DTOs and decoders, seed data
      state/                 tasksSlice, thunks, memoised selectors
      presentation/          Home, list, details and form screens; task components; view hooks
      testing/               Fixtures, the shared repository contract suite, a fake HTTP server
    auth/
      domain/                User, Session, credential validation, AuthService contract
      data/                  MockAuthService
      state/                 authSlice, thunks, selectors
      presentation/          Login and Profile screens, login form hook
  __tests__/                 Integration tests that render the whole app
```

### Domain model

[`Task`](src/features/tasks/domain/task.ts) is a discriminated union on `status`. An `active` task
always has `completedAt: null`, and a `completed` task always has a timestamp, so an inconsistent
completion state cannot be represented. The rules live in
[taskRules.ts](src/features/tasks/domain/taskRules.ts) as pure functions:

- `validateTaskDraft` trims input and enforces a non-empty title (≤ 100 chars), a description of
  ≤ 1000 chars, a known priority and a real calendar date. It returns every field error at once, so
  forms can reuse it for inline errors.
- `buildTask` and `reviseTask` validate as part of construction, so no caller can skip validation.
  `reviseTask` preserves `id`, `createdAt` and the completion state.
- `changeTaskCompletion` keeps status and `completedAt` consistent, and repeating the current state
  is a no-op.
- `getTaskTimeframe` classifies a task as overdue, today, upcoming, unscheduled or completed.

**Dates.** `dueDate` is a calendar day (`YYYY-MM-DD`, ISO 8601) rather than an instant, so "due today"
doesn't shift with the device time zone. `createdAt`, `updatedAt` and `completedAt` are full ISO 8601
timestamps. Display formatting belongs to the presentation layer.

### Repository pattern and error handling

[`TaskRepository`](src/features/tasks/domain/TaskRepository.ts) declares `getTasks`, `getTaskById`,
`createTask`, `updateTask`, `deleteTask` and `setTaskCompletion`. Every method accepts an optional
`AbortSignal` and resolves to a `Result<T, AppError>`. Expected failures are never thrown.

[`AppError`](src/shared/lib/appError.ts) is a serialisable discriminated union (`validation`,
`not_found`, `unauthorized`, `network`, `timeout`, `cancelled`, `http`, `invalid_response`,
`unexpected`). Its `message` is always
safe to show to users, and diagnostic detail is kept in a separate field. Because errors are plain
objects, they can be stored in Redux.

| Implementation | Behaviour |
| --- | --- |
| [`MockTaskRepository`](src/features/tasks/data/MockTaskRepository.ts) | In-memory store for the session, seeded relative to today, with configurable latency (respects cancellation). Writes go through the same domain rules a server would enforce. Clock and ID generator are injectable for deterministic tests. |
| [`ApiTaskRepository`](src/features/tasks/data/ApiTaskRepository.ts) | Uses the injected `ApiService`. Validates drafts and IDs before sending, decodes responses defensively, and maps 404 → `not_found`. On create and update, 400/422 → `validation`. |

Both implementations run the same behavioural suite,
[taskRepositoryContract.ts](src/features/tasks/testing/taskRepositoryContract.ts). The API version
runs against an in-process fake HTTP server, which is what makes them interchangeable.

### ApiService

[ApiService.ts](src/shared/api/ApiService.ts) is a deliberately small `fetch` wrapper with no added
dependency. It provides:

- a base URL and JSON `Accept`/`Content-Type` headers
- a per-request timeout and caller cancellation, both through `AbortController`, with timers and
  listeners always cleaned up
- consistent errors: network failure, timeout, cancellation, non-2xx status, invalid JSON, and
  payloads rejected by the caller's typed `Decoder<T>`
- `request(…, decoder)` for JSON responses, and `send(…)` for calls whose body is irrelevant (for
  example DELETE), whose body is never parsed

Per-request headers come from an injected `getHeaders` callback, evaluated on every request. The
composition root ([dependencies.ts](src/core/di/dependencies.ts)) uses it to send
`Authorization: Bearer <token>` from `AuthService.getAccessToken()` while a session is active, and no
`Authorization` header while signed out.

It has no retry or caching. Retry decisions belong to the caller. Server error
bodies are not surfaced, so 4xx/5xx errors use status-based messages.

### API contract expected by `ApiTaskRepository`

| Method & path | Request body | Success response |
| --- | --- | --- |
| `GET /tasks` | – | `TaskDto[]` |
| `GET /tasks/:id` | – | `TaskDto` |
| `POST /tasks` | `TaskWriteDto` | `TaskDto` |
| `PUT /tasks/:id` | `TaskWriteDto` | `TaskDto` |
| `PATCH /tasks/:id` | `{ "is_completed": boolean }` | `TaskDto` |
| `DELETE /tasks/:id` | – | empty (204) or any body |

```jsonc
// TaskDto
{
  "id": "task-1",                 // [A-Za-z0-9_-]{1,64}
  "title": "Send invoice",
  "description": null,            // string | null
  "priority": "high",             // "low" | "medium" | "high"
  "is_completed": false,
  "due_date": "2026-11-05",       // YYYY-MM-DD | null
  "created_at": "2026-11-01T08:00:00.000Z",
  "updated_at": "2026-11-01T08:00:00.000Z",
  "completed_at": null            // ISO 8601 | null (falls back to updated_at if missing on a completed task)
}
// TaskWriteDto: { "title", "description" (string | null), "priority", "due_date" }
```

No backend ships with this project. To try the API repository, point `EXPO_PUBLIC_API_BASE_URL` at
any server that implements this contract.

### Enforced boundaries

The layering is checked by ESLint ([eslint.config.js](eslint.config.js)) instead of relying on review alone:

- `features/*/domain` must not import React, React Native, Redux or any outer layer.
- `features/*/presentation` and `shared/ui` must not import `data/` implementations or the API client.
- `import/no-cycle`, `no-explicit-any` and `consistent-type-imports` are errors.

### Dependency injection

`createDependencies(config)` in [src/core/di/dependencies.ts](src/core/di/dependencies.ts) is the
single place where concrete services are chosen. The container is:

1. built once in [src/App.tsx](src/App.tsx),
2. provided through React Context by `DependencyProvider`, and
3. read by `StoreProvider`, which creates the Redux store with the container as the thunk `extra`
   argument.

Thunks receive dependencies through `extra`, and components dispatch thunks. Neither instantiates a
repository, so switching between mock and API repositories changes configuration only, never screens
or business logic. Tests build isolated stores with fake containers through `createAppStore`.

The container holds `config`, `taskRepository`, `authService` and `apiService`. `apiService` is
created whenever a base URL is configured and is `null` otherwise. Only the API repository consumes
it today; it sits in the container so further API-backed services can share it.

**Switching repositories:**

```bash
# .env.local
EXPO_PUBLIC_TASK_REPOSITORY=api
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000   # Android emulator: http://10.0.2.2:3000
```

Then restart with `npx expo start --clear`.

### State management

The store is built by `createAppStore(dependencies)` from two slices registered with `combineSlices`.
Thunks are created with `createAppAsyncThunk`, which types `extra` as the dependency container and
every rejection as an `AppError`. Components use the typed `useAppDispatch` and `useAppSelector`
hooks.

**`auth`** is a discriminated union in which each status carries only the data valid for it:

```
signedOut { error } ──signIn──▶ signingIn ──▶ signedIn { session } ──signOut──▶ signingOut { session } ──▶ signedOut
                 ◀── rejected (error) ──┘
```

`signIn` is ignored unless the user is signed out, so a double tap cannot start two sign-ins.
`signOut` always ends the local session, even if the service call fails.

**`tasks`** stores tasks in an entity adapter whose `sortComparer` keeps IDs in display order. It
also holds:

- `load`, a union: idle | loading | succeeded | failed with an error
- per-task `pendingMutations`, so controls can be disabled
- the shared search and status-filter `query`

Each guard below has a test that fails when the guard is removed:

| Concern | How it is handled |
| --- | --- |
| No optimistic success | The store changes only after the repository confirms. Meanwhile the task is marked pending (`selectTaskMutation`). |
| Duplicate submissions | Thunk `condition`s allow one create at a time and one mutation per task. |
| Stale responses | Each fetch or mutation records its `requestId`. Results from superseded requests, or requests started before a sign-out, are ignored. |
| Refresh vs. mutation race | Changes confirmed while a list request is in flight are recorded, and that list response cannot overwrite them. Otherwise a slow refresh could resurrect a just-deleted task. |
| Results after sign-out | A thunk whose session ended mid-request resolves as `cancelled`, so no "Task deleted" toast appears after logging out. |
| Failures | Rejections settle the pending state, so loading can't stay stuck. The error goes to the caller (`unwrap()`) or into `load` for list fetches. A `not_found` drops the task, and deleting an already-deleted task counts as success. |
| Data after sign-out | Task thunks refuse to run without a session, and sign-out resets the tasks slice. |

Selectors (`selectVisibleTasks`, `selectTaskOverview`) are memoised with `createSelector` over pure
domain functions (`matchesTaskQuery`, `buildTaskOverview`), so filtering never happens in render and
unrelated actions don't produce new arrays.

### Navigation

React Navigation 7 (native stack and bottom tabs), typed end to end in
[src/core/navigation/types.ts](src/core/navigation/types.ts):

```
RootStack ── Login                         (signed out)
          └─ Main ── BottomTabs            (signed in)
                      ├─ Home
                      ├─ Tasks ── TaskStack: TaskList → TaskDetails → TaskForm (modal)
                      └─ Profile
```

- **Typing.** `RootStackParamList`, `MainTabParamList` and `TaskStackParamList` are combined with
  `CompositeScreenProps`, so each screen's `navigation` and `route` are fully typed, including
  cross-navigator calls such as Home → `Tasks > TaskDetails`. `TaskForm` takes
  `{ mode: 'create' } | { mode: 'edit'; taskId }`, so opening an edit form without an ID is a
  compile error. Screens receive task IDs only and read the current task from the store.
- **Auth gate.** [RootNavigator](src/core/navigation/RootNavigator.tsx) declares either `Login` or
  `Main`, never both, based on `selectIsAuthenticated`. Logging out unmounts every protected screen
  (it doesn't merely hide them), so back gestures can't reveal stale content. No screen performs its
  own auth check.
- **Route identity.** `TaskDetails` and `TaskForm` use `getId`, so each task (and each form mode) is
  its own route. React Navigation 7 otherwise reuses a focused route of the same name. Without
  `getId`, tapping "New task" on Home while an edit form is open would turn that form into a create
  form. "See all" navigates with `pop: true` rather than stacking a second list.
- **Unsaved edits.** The task form uses `usePreventRemove` to confirm before discarding changes from
  Cancel or a swipe-down.

### UI composition

Screens are thin. Data comes from selectors, and actions go through small view hooks:

- `useTaskLoader` loads on first use and handles refresh and retry.
- `useTaskActions` handles completion and confirmed deletion, with toasts.
- `useTaskForm` holds form state; validation is the domain's `validateTaskDraft`.
- `useLoginForm` holds the login form state.

`runAction` turns a dispatched thunk into a `succeeded | failed | skipped` value, so hooks never
deal with thrown errors.

**Keyboard.** The task form measures how far the keyboard actually overlaps it, using
`useKeyboardOverlap` with `measureInWindow`, instead of a hand-tuned `KeyboardAvoidingView` offset.
A fixed offset is wrong inside an iOS page-sheet modal, and the measured overlap is 0 when Android
has already resized the window. The login screen uses `KeyboardAvoidingView` as Expo recommends,
since it is a full-screen root.

The task list is a FlashList v2. Rows are memoised, callbacks are stable, and filtering happens in
memoised selectors rather than during render. Each row subscribes only to its own pending state.

### Design system

Tokens live in [src/shared/theme/tokens.ts](src/shared/theme/tokens.ts). The palette is warm
neutral with a single deep-green accent. Text colours meet WCAG AA (≥ 4.5:1) on every surface, and
input outlines meet the 3:1 non-text minimum. Type uses the system font, so it honours OS text scaling.

Shared components in [src/shared/ui](src/shared/ui) are `AppText`, `Button`, `IconButton`,
`TextField`, `SegmentedControl`, `Chip`, `Banner`, `EmptyState`/`LoadingView`, `SectionHeader` and
`Toast`. Icons are Ionicons throughout.

**Accessibility.**

- Every control has a role and an accessible name, and every icon-only button has a label.
- Completion toggles are checkboxes that report their checked and busy states.
- Filters and priority pickers are radio groups.
- Priority and overdue status are always conveyed in words and icon shape as well as colour.
- Touch targets are at least 44 pt. Chips and compact buttons reach this with `hitSlop`.
- Every task row has a single spoken description: title, due status and priority.
- Form errors appear inline, are announced, and move focus to the first invalid field.
- Toasts and error banners are announced explicitly. `accessibilityLiveRegion` alone is Android-only.

## Dependencies

| Package                                        | Why                                                     |
| ---------------------------------------------- | ------------------------------------------------------- |
| `@reduxjs/toolkit`, `react-redux`              | Required state management (slices, thunks, selectors)   |
| `@react-navigation/*`, `react-native-screens`, `react-native-safe-area-context` | Typed native stack and tab navigation |
| `@shopify/flash-list`                          | Required list virtualisation (v2, New Architecture)      |
| `@expo/vector-icons` (+ `expo-font`, `expo-asset`) | A single consistent icon set (Ionicons). `expo-font` and `expo-asset` are its native peers and are declared directly rather than relying on how npm hoists `expo`'s own copies. |
| `@react-native-community/datetimepicker`       | Native due-date picker (bundled with Expo Go)            |
| `jest`, `jest-expo`, `@testing-library/react-native` | Tests (Jest 30, as required by jest-expo 58)       |
| `eslint`, `eslint-config-expo`                 | Linting via `expo lint`                                  |

Native-module versions are pinned by `npx expo install` to the SDK 58 set; `npx expo-doctor` passes.

## Mock authentication

> Sign in with **`demo@dayflow.app`** / **`dayflow`**.

Authentication is simulated by [`MockAuthService`](src/features/auth/data/MockAuthService.ts) and
provides **no security**:

- The only accepted account is hard-coded in [demoAccount.ts](src/config/demoAccount.ts) and shipped
  in the bundle.
- Each sign-in issues an opaque, random session token. `ApiService` sends it as a bearer token,
  and sign-out discards it before anything else happens. The token lives only inside the auth
  service, never in Redux. No real server can verify a mock token, so **API mode is for development
  only** until a real identity provider supplies the `AuthService` implementation.
- The session lives in memory only, so restarting the app signs you out. Persisting a real session
  would need a secure store such as `expo-secure-store` and a real identity provider.

The value is in the lifecycle: validation errors, rejected credentials, loading and sign-out are
all real code paths. Because `AuthService` is injected, a real implementation could replace the mock
without touching screens or state logic.

## Testing

Tests sit next to the code they cover (`__tests__/`), with whole-app flows in `src/__tests__/`:

| Layer | What is verified |
| --- | --- |
| Domain | Validation boundaries, completion consistency, identity preservation, ordering, filtering, Home overview |
| Data | One behavioural contract run against both repositories (the API one through a fake HTTP server); DTO decoding; HTTP error mapping; ApiService timeout, cancellation and malformed responses |
| State | Auth transitions, task thunks and reducers, duplicate-submission guards, stale/raced responses, sign-out purge, memoised selectors |
| UI (whole app) | Auth gate and logout unmounting; create → complete → edit → delete; inline validation; failure feedback; search/filter; retry; discard-changes guard; route reuse |

Nothing needs a backend: repositories are in-memory or use stubbed `fetch`. The concurrency guards
were checked by mutation: each guard was removed in turn to confirm a test fails without it.

## Key decisions and trade-offs

- **React Navigation instead of Expo Router.** [AGENTS.md](AGENTS.md) recommends Expo Router. This
  project's brief explicitly requires React Navigation with hand-written, typed
  `RootStackParamList` / `MainTabParamList` / `TaskStackParamList`, so React Navigation 7 is used
  directly. For the same reason infrastructure lives in `src/core/`, and `src/app/` (Expo Router's
  routes folder) is unused. Moving to Expo Router later would mean replacing `src/core/navigation`
  with file routes; screens already receive only IDs, so they would barely change.
- **`Result` values instead of exceptions** across repository and service boundaries. Failures are
  typed and must be handled, and `AppError`s are serialisable into Redux. The cost is a little more
  ceremony than `try/catch`.
- **No optimistic updates.** The brief forbids reporting success before it is known, so rows show a
  pending state for the mock's ~350 ms latency instead. With a real API, optimistic updates plus
  rollback would feel faster but add complexity.
- **Due dates are calendar days, not instants**, which avoids time-zone drift for "due today". The
  trade-off is no due *times*.
- **Search and filter live in Redux.** They survive navigation, and the visible list is one memoised
  selector, testable without rendering. For a single screen, component state would also have worked.
- **No persistence.** Data and session reset on restart (see Mock authentication). Persisting would
  need storage for tasks and a secure store for a real session.

## Known limitations

- Visually verified on the iOS simulator (iPhone 17 Pro, iOS 26.1). Android behaviour, including
  keyboard handling under edge-to-edge, is covered by tests and platform-specific code but has not
  been seen on a device.
- The API repository has only been exercised against the in-process fake server.
- API error bodies, including server field errors, are not surfaced. Server-side validation shows a
  general message.
- Web is not supported.
