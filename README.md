# Lightway Learning

Lightway Learning is a deployable exam-preparation MVP for an English language center. It proves the product's core architecture: structured curriculum, three role-aware workspaces, student self-study, progress tracking, and a Firestore-powered live Class Mode in which teacher navigation synchronizes student devices without screen sharing.

## What is implemented

- Email/password authentication with persistent Firebase sessions
- Admin, teacher and student role routing backed by `users/{uid}`
- Admin overview for users, classes and curriculum
- Teacher class list, curriculum preview and session history
- Live session creation with a short join code
- Follow, Guided and Free Class Mode states
- Teacher-controlled activity navigation and application-level classroom lock
- Firestore listeners that restore current session state after refresh/reconnect
- Student participation heartbeat and connected/away teacher view
- Live multiple-choice submissions, aggregate bars and answer reveal
- Student self-study and unit progress persistence
- Structured courses, skills, units and reusable activity types
- Static Next.js export for Firebase Hosting
- Firestore rules and index definitions

## Architecture

The browser uses the Firebase modular Web SDK directly. Firestore is authoritative for every live session:

1. A teacher creates `classSessions/{sessionId}` and the class receives `activeSessionId`.
2. A student joins once and subscribes to that session document.
3. The teacher changes `currentActivityId`, `mode` or `locked`.
4. Every student listener re-renders from the current document state. It does not depend on a transient event.
5. A refreshed client restores the joined session ID from local storage, reads the current server state and resumes.

The app is exported as a client-rendered static site in `out/`. There is no custom server and no peer-to-peer or screen-streaming layer.

## Main folders

```text
app/                 Next.js entry point and visual system
components/activity  Reusable activity engine
components/admin     Admin workspace
components/teacher   Teacher dashboard and classroom controller
components/student   Student dashboard, self-study and live classroom
data/                Structured, repeatable curriculum seed
hooks/               Auth/profile and curriculum hooks
lib/                 Firebase setup and classroom operations
scripts/             Firebase Admin seed script
types/               Shared TypeScript domain model
```

## Firebase data

Top-level collections:

- `users`
- `classes`
- `courses`
- `skills`
- `units`
- `activities`
- `classSessions`
- `userProgress/{studentId}/units`

Session subcollections:

- `classSessions/{sessionId}/participants`
- `classSessions/{sessionId}/responses`

Firestore rules enforce role access. Students cannot update the session document, class membership, teacher ID, teaching mode or current activity. Teachers can control only sessions for their own classes. Admin accounts have management access.

## Local setup

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

The supplied public Firebase web configuration targets the existing production project. For isolated work, use the emulator workflow below. Copy `.env.example` to `.env.local` only if you want environment-specific values.

### One-time Firebase Console setup

In project `lightway-course`:

1. Authentication → Sign-in method → enable **Email/Password**.
2. Firestore Database → create a database in **Native mode** if it does not exist.
3. Use a Firebase project member account for deployment.

## Seed data and demo accounts

The seed script uses Firebase Admin credentials. It accepts `GOOGLE_APPLICATION_CREDENTIALS`; when that is not set, it reuses the account already authenticated by Firebase CLI. It also initializes Firebase Authentication and enables Email/Password on first run. Sign in with `firebase login`, set a private demo password in your shell, then run:

```powershell
$env:LIGHTWAY_DEMO_PASSWORD="choose-a-strong-password"
pnpm seed
```

The script is repeatable and creates or refreshes:

| Role | Email |
|---|---|
| Admin | `admin@lightway.edu.vn` |
| Teacher | `teacher@lightway.edu.vn` |
| Student | `anna@student.lightway.edu.vn` |
| Student | `ben@student.lightway.edu.vn` |
| Student | `chris@student.lightway.edu.vn` |

It also creates TOEIC Demo Class, enrolls the three fictional demo students and writes all structured curriculum documents. `LIGHTWAY_DEMO_PASSWORD` is required and is never committed.

## Quality checks and deployment

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm exec firebase login
pnpm exec firebase deploy --project lightway-course
```

`firebase deploy` publishes Hosting, Firestore rules and indexes configured in `firebase.json`.

For a repeatable end-to-end production check after deployment:

```bash
pnpm smoke
```

The smoke test signs in as teacher and student, verifies role-scoped reads, creates a temporary live session, validates the join-code index, confirms an activity update over a real-time listener, submits an MCQ response, proves student session control is denied, and ends the test session.

## Test the real-time flow

1. Open one normal browser window and sign in as the teacher.
2. Open two private/profile windows and sign in as Anna and Ben.
3. Teacher: My Classes → TOEIC Demo Class → Start class session → select Unit 1.
4. Students: use the Live Class card or enter the join code.
5. Teacher: move between activities; Follow Mode students change immediately.
6. Switch to Guided; students can navigate inside the unit. Switch to Follow; they return to the teacher's current activity.
7. Open a multiple-choice activity. Students submit; the teacher sees live totals and can reveal the answer.
8. End the class. Student clients return to their dashboards.

## MVP limitations

- Guided Mode stays in the teacher’s unit; Free Mode offers a unit picker across the curriculum. Follow Mode returns everyone to the teacher’s activity.
- Presence is heartbeat-based and may take up to 90 seconds to mark an abruptly closed tab as away.
- Correct answers are present in curriculum documents for this instructional demo; high-stakes testing should use a protected answer-key design.
- Teachers can read student profiles and progress at role scope in this MVP. A production multi-tenant rollout should add organization/class membership claims for tighter queryable access.
- Admin CRUD is intentionally read-focused; content and account management use the repeatable seed/admin path.

## Local TOEIC pilot (no production access)

The ten-activity Parts of Speech unit includes original teaching notes, a worked
workplace memo, six scored questions with explanations, and a final review.
Live responses are immutable first attempts. Teachers can reveal multiple-choice,
fill-blank and short-answer keys; revealed questions no longer accept new answers.
Self-study stores answers and completion separately from class responses, with
transactional first-attempt scoring and a completion summary. Existing progress
without saved answers remains readable; old answers cannot be reconstructed.

Use Node.js 22.18+ (tested on Node 24), Java 21+, pnpm, and Chromium for the pilot tests:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm test:pilot
```

If Chromium is already installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable instead of downloading a browser. The pilot command starts only Auth
and Firestore emulators on loopback, uses the fixed `demo-lightway-pilot` project,
runs the rules tests, builds a static export with emulator mode enabled, and runs
browser tests with synthetic users. It resets only that local demo dataset.
It refuses to run against other emulator addresses or a non-demo project.
Browser tests block all non-loopback requests, including Firebase SDK connectivity
probes. Analytics is disabled in emulator mode. No Firebase login or service-account
credentials are needed. Ports 8080, 9099 and 3100 must be available.

For a manual local preview, keep the emulators running with the same configuration,
seed **only the local demo** via the guarded test helper, and start Next with
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`. This flag replaces all public Firebase
configuration with local demo settings; it is a build-time flag. The pilot test
export in `out/` targets emulators and must not be used for a production release.

`pnpm smoke` and `pnpm seed` still target production and are not part of this test
workflow. In particular, the existing seed resets demo accounts and class state.
The running app prefers Firestore curriculum over the bundled JSON, so a future
release needs a separately reviewed content-only import as well as the app and
rules changes; uploading Hosting alone will not update existing curriculum.

Pilot limits: self-study scores remain learner-owned practice records, not secure
exam results. Answer keys are still readable by students, teachers retain broad
profile/progress read access, and the classroom lock controls the app UI rather
than the device. No production rollout or permission change has been performed.

## Release this pilot from GitHub

The review branch is `pilot/toeic-unit`. Use Git to bring the reviewed source into
local Codex; no ZIP is required. Follow
[the scoped release instructions](releases/toeic-pilot/README.md).
Hosting release is requested, but **live Firestore rule changes still need explicit
local confirmation of the exact changes**. The pilot requires compatible rules
and the eleven-document curriculum patch before Hosting publication. There is no
automatic deployment workflow. Tests, installation, fetching the branch and
opening this repository do not deploy anything.
