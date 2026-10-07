# TOEIC pilot — 2026-10-07

Local branch: `pilot/toeic-unit`, based on `1a3d3501f0fc8e202fd922c62dc1d830535f9204`.
The pilot is prepared for review on a dedicated branch; main is not merged.
No production seed, live permission change or Firebase deployment was performed.

## Changes

- Completed the existing ten-activity Parts of Speech unit with original teaching
  notes, a workplace memo, worked examples, six scored questions, explanations of
  the answer choices, and a review. Existing content IDs/schema are preserved.
- Enforced one immutable live response per student/activity using its canonical ID,
  class membership, activity scope and matching normalized grade. Responses after
  reveal or session end are denied. Teachers can reveal MCQ and text-answer keys.
- Guided navigation survives teacher updates; Free Mode has a curriculum unit
  picker; Follow restores the teacher's activity. Classroom headings use real
  curriculum metadata. Leaving clears the saved session; refresh/reconnect restores
  joined sessions and submitted answers. Radio controls are keyboard-accessible.
- Self-study saves answers in optional `UnitProgress.answers`, displays a completion
  summary, reports offline/save errors, and uses a transaction to avoid duplicate
  points across retries/tabs. Legacy progress is readable without a migration.
- Session start/end now use transactions: concurrent starts reuse one active
  session, and ending an old session cannot clear a newer session's class pointer.
- Added a guarded local Auth/Firestore emulator workflow, synthetic test accounts,
  Playwright browser checks and README instructions. Emulator mode uses a fixed
  demo project and disables analytics. Production scripts were not run.

## Verification

Environment: Node 24.19.0, Java 21, installed Chromium, locked dependencies.

| Check | Final result |
| --- | --- |
| `node node_modules/eslint/bin/eslint.js .` | Passed, exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed, exit 0 |
| `git diff --check` | Passed, exit 0 |
| Local logic/content/isolation-guard tests | 5 passed, 0 failed |
| Auth/Firestore emulator integration and security tests | 12 passed, 0 failed |
| Static Next.js build with emulator configuration | Passed; `/` and not-found exported |
| Chromium browser scenarios | 3 passed, 0 failed; latest run 19.5s |

The final combined check used local emulators started with:

```sh
node node_modules/firebase-tools/lib/bin/firebase.js emulators:start \
  --only auth,firestore --project demo-lightway-pilot --config firebase.emulators.json
```

Then:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
GCLOUD_PROJECT=demo-lightway-pilot \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
node scripts/test-pilot.mjs
```

The repository convenience command `pnpm test:pilot` wraps that runner in
`firebase emulators:exec`, including startup/shutdown. The final verification log is retained in the cloud workspace, not committed.
Browser cases cover:

1. One teacher and two students: both join paths, MCQ aggregation, correct/incorrect
   feedback, fill-blank and short-answer reveal, late-answer blocking, Guided/Free/
   Follow transitions, refresh, offline reconnection, lock/unlock, leave/rejoin,
   teacher refresh, end and a second session.
2. Full self-study: offline retry, refresh with saved answer, ten activities,
   six first-attempt points and persisted completion.
3. Concurrent teacher starts, stale-tab ending, and non-TOEIC classroom headings.

## Release boundaries

All data used for tests was synthetic and stored in loopback emulators. Browser
network interception blocked external destinations, including SDK connectivity
probes. Real authentication, production data, deployed rules and live composite
indexes were not tested or changed. Browser verification covered Chromium.

The generated `out/` is an emulator build, not a production release artifact.
The app prefers Firestore curriculum over bundled JSON: a future release needs a
reviewed **content-only import**, application build and rules rollout. Do not use
the existing broad production seed to publish this unit; it resets demo users
and class state. No such release actions were performed by the cloud pilot work.

Answer keys remain student-readable and self-study scores are practice records,
not tamper-proof exam results. Broad teacher profile/progress access is unchanged.
Old saved progress cannot recover answers that were never stored. Speaking/writing
assessment and other course units remain outside this pilot.

## Subsequent release preparation

After Hosting publication was authorized, a production-configured build passed
and was staged separately outside the repository. `out/` is temporary and is
rebuilt in emulator mode by the pilot tests; a local release must always rebuild
it explicitly for production. Cloud deployment remains blocked by Firebase authentication and
pending specific approval for live rules. No live release action was performed.
See [the repository release plan](releases/toeic-pilot/README.md) for the exact
scope, local Codex handoff and rollback constraints. GitHub is now the requested
handoff route; the earlier ZIP is not required.

## GitHub branch verification

Before the authorized branch push, lint, standalone type checking and staged diff
checks passed again. The official emulator execution wrapper also passed: 17
logic/security tests and 3 Chromium scenarios (19.5 seconds), with a successful
static build and automatic emulator shutdown. No production credentials were used.
The release instructions and eleven-document content patch are included under
`releases/toeic-pilot/`; generated Hosting output and test logs are excluded.
