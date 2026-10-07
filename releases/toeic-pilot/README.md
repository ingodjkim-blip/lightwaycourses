# TOEIC pilot: local Codex release plan

Target: existing Firebase project **lightway-course**, Hosting site
**lightway-course** (`https://lightway-course.web.app`).
Branch: **pilot/toeic-unit**, based on commit
`1a3d3501f0fc8e202fd922c62dc1d830535f9204`.

This branch contains source, tests and a content patch specification. No build
outputs, deployment credentials, student exports or automatic deployment workflow
are included. Fetching, installing and testing do not deploy the app. Cloud Codex
has not authenticated to or deployed Firebase. Main is not merged by this work.

## 1. Fetch without overwriting local work

Inspect `git status`, the current branch, and any local commits first. Preserve
unrelated work. If the current directory is dirty or has diverged, create a separate
worktree instead of resetting, cleaning, or force-checking out files. For a clean
checkout without an existing local pilot branch:

```sh
git fetch origin main pilot/toeic-unit
git switch --track -c pilot/toeic-unit origin/pilot/toeic-unit
```

If that branch already exists, inspect its relationship to the remote and only
fast-forward when safe. Do not force push or merge main as part of deployment.
Record the exact branch commit that will be released.

## 2. Verify locally before production work

Requirements: Node 22.18+ (tested on Node 24), Java 21+, pnpm and Chromium.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:pilot
```

If Chromium is not installed, install the Playwright Chromium browser, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing executable. The pilot tests use
only loopback Auth/Firestore emulators and synthetic users. Ports 8080, 9099 and
3100 must be available. The test runner refuses a non-demo project or incorrect
emulator addresses. Its generated `out/` is an **emulator build**: never deploy it.

Use the local Firebase CLI login already authorized by the user. Confirm access
with the read-only command:

```sh
pnpm exec firebase hosting:sites:list --project lightway-course
```

If login has expired, the user runs `pnpm exec firebase login` locally and completes
Google sign-in/consent personally. Never copy tokens into chat, create service-account
keys, or add CI credentials/IAM grants. Firebase Console login alone is not enough.

## 3. Obtain specific live-rules confirmation

**Hosting deployment is requested, but these live security changes remain awaiting
explicit local confirmation. Show this exact list and ask before deploying rules.**
Compare the current deployed rules with both the repository baseline and this
branch; stop for unexpected live changes rather than overwriting them.

- **Responses:** create-only, immutable first attempts with canonical
  `studentId_activityId` IDs; authenticated ownership and exact profile name;
  required/allowed fields; nonblank answers of at most 4,000 characters; boolean
  grade and server submission timestamp. Require active session and enrollment.
  Guided/Follow answers must be in the session unit; Free can use other curriculum
  units. MCQ answers must match an option. Reject answers after reveal/end and
  validate grades using trimmed, lowercase keys. Existing admin deletion remains.
- **Teacher session reads:** match the session's `teacherId`, enabling the history
  query. Former class teachers retain their own session history; a newly assigned
  teacher does not inherit another teacher's sessions. Admin and enrolled-student
  access is retained.
- **Teacher session updates:** require both session ownership and current class
  assignment, an active existing session, valid modes (`follow`, `guided`, `free`)
  and statuses (`active`, `ended`). An ended session cannot be reactivated by update.
  Admin override remains unchanged.
- **Student progress:** allow the optional saved `answers` map and require a list
  of completed IDs, string last activity and nonnegative integer score. Ownership
  and reader permissions are unchanged. Scores remain learner-owned practice
  records, not tamper-proof exam results.

No billing changes, new services, index changes, account/role changes or new IAM
permissions are required. Broad teacher profile/progress reads and student-readable
answer keys are unchanged. Do not use an unscoped `firebase deploy`.

## 4. Back up and preflight the eleven-document content patch

Before any live write, record the current Hosting release/version and live rules
release/content. Privately retain before-images and updateTimes for only the eleven
curriculum documents below; do not put backups or real records in Git or chat.
Avoid changing lesson content during an active teaching period; coordinate timing
with the owner rather than reading student records to infer it.

`curriculum-patch.json` is a **specification**, not an executable importer. Prepare
and review a content-only atomic Firestore commit locally. The existing
`scripts/seed.mjs` and `scripts/smoke.mjs` must not be used: they change accounts,
class/session state or production test data.

| Existing documents | Fields to update |
| --- | --- |
| `units/toeic-reading-parts-of-speech` | description |
| `activities/pos-01`, `pos-02`, `pos-08`, `pos-10` | title, instructions, content |
| `activities/pos-03` through `pos-07` | explanation |
| `activities/pos-09` | instructions, explanation |

Read only those documents and compare the affected fields with `repositoryBaseline`
in the specification. Abort if a document is missing or its affected fields have
independent changes. Do not create it automatically or overwrite new material.
Validate the payload against the current schema. Construct one atomic Firestore
`documents:commit` request (or SDK transaction/batch with equivalent safeguards)
using explicit update masks and each document's actual `updateTime` precondition.
Do not use the non-atomic REST `documents:batchWrite` endpoint.

Preserve every field outside the patch. IDs, activity types, options, correct
answers, order and activity counts do not change. Users, classes, sessions,
responses and progress are outside the import scope. No deletion or reseeding.
After the approved write, read back those same fields and compare to the patch.
Record success per document without exposing records or credentials in logs.

## 5. Build and publish the compatible application

After tests, explicitly set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` for a fresh
`pnpm build`. Inspect local environment overrides without displaying credential
values; all Firebase public configuration must target `lightway-course`. The
repository's defaults target that project. Environment syntax depends on the local
shell: use `$env:NAME="value"` in PowerShell or `NAME=value command` in POSIX shells.

Check the newly generated static export for the production project and absence of
`demo-lightway-pilot`, `local-emulator-key`, and the local Auth emulator endpoint.
Do not reuse artifacts from `pnpm test:pilot` or deploy until rules and content are
compatible. Old rules reject the new saved-answer field and normalized text grading;
Firestore content overrides bundled JSON, so Hosting alone is not this release.

Only after the specific rules confirmation and all backups/preflights:

1. Deploy the reviewed rules only:
   `pnpm exec firebase deploy --only firestore:rules --project lightway-course`.
2. Apply the reviewed atomic content-only patch and verify the eleven documents.
3. Publish the freshly verified production build only:
   `pnpm exec firebase deploy --only hosting --project lightway-course`.
4. Confirm the Hosting release and public page load. Do not run the production
   smoke script. Have the owner review the pilot with their normal application
   login; do not automate account creation or use real student records as tests.

If a prerequisite fails, stop before Hosting. No deployment command is to run merely
because this file contains it. Authentication success does not approve live rules.

## Rollback

Capture actual backups before release; none were obtained in the cloud environment.
Roll Hosting back to the recorded previous version if necessary. Restore only the
changed curriculum fields, with concurrency guards so later edits are preserved.
Do not blindly restore old rules: they reopen the response ownership flaw and reject
progress containing `answers`. Evaluate previous Hosting with the new rules first;
any rules rollback needs a compatible reviewed rule set and explicit confirmation.
Never delete or reset learner progress to make a rollback succeed.

## What remains outside this release

No reusable bulk curriculum importer, Admin import/publish UI, revision system,
CI deploy identity, or deployment automation is implemented here. The narrow JSON
patch is for this pilot only. Future content-only publishing can be a separate task.
