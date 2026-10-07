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

The supplied public Firebase web configuration is used as a safe default. Copy `.env.example` to `.env.local` only if you want environment-specific values.

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

- Free Mode keeps students within the current demo unit rather than exposing the whole library inside the live view.
- Presence is heartbeat-based and may take up to 90 seconds to mark an abruptly closed tab as away.
- Correct answers are present in curriculum documents for this instructional demo; high-stakes testing should use a protected answer-key design.
- Teachers can read student profiles and progress at role scope in this MVP. A production multi-tenant rollout should add organization/class membership claims for tighter queryable access.
- Admin CRUD is intentionally read-focused; content and account management use the repeatable seed/admin path.
