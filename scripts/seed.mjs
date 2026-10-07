import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { applicationDefault, cert, getApps, initializeApp, refreshToken as refreshTokenCredential } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = "lightway-course";
const curriculum = JSON.parse(await readFile(new URL("../data/demo-curriculum.json", import.meta.url), "utf8"));
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let credential;

if (serviceAccountPath) {
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
  credential = cert(serviceAccount);
} else {
  try {
    const require = createRequire(import.meta.url);
    const { getGlobalDefaultAccount } = require("../node_modules/firebase-tools/lib/auth.js");
    const { clientId, clientSecret } = require("../node_modules/firebase-tools/lib/api.js");
    const account = getGlobalDefaultAccount();
    if (!account?.tokens?.refresh_token) throw new Error("No Firebase CLI account is signed in.");
    credential = refreshTokenCredential({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: account.tokens.refresh_token,
      type: "authorized_user",
    });
  } catch {
    credential = applicationDefault();
  }
}

const app = getApps()[0] || initializeApp({ credential, projectId });
const auth = getAuth(app);
const password = process.env.LIGHTWAY_DEMO_PASSWORD;
if (!password) throw new Error("Set LIGHTWAY_DEMO_PASSWORD before running the seed script.");
const documentSeeds = [];
const accessToken = await credential.getAccessToken();
const authHeaders = { Authorization: `Bearer ${accessToken.access_token}`, "Content-Type": "application/json" };

async function ensureAuthConfigured() {
  const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const existing = await fetch(configUrl, { headers: authHeaders });
  if (existing.status === 404) {
    const initialized = await fetch(`https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`, {
      method: "POST",
      headers: authHeaders,
      body: "{}",
    });
    if (!initialized.ok && initialized.status !== 409) {
      throw new Error(`Firebase Auth initialization failed (${initialized.status}): ${await initialized.text()}`);
    }
  } else if (!existing.ok) {
    throw new Error(`Firebase Auth config check failed (${existing.status}): ${await existing.text()}`);
  }

  const updated = await fetch(`${configUrl}?updateMask=signIn.email.enabled,signIn.email.passwordRequired`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
  });
  if (!updated.ok) throw new Error(`Enabling Email/Password failed (${updated.status}): ${await updated.text()}`);
}

const accountSeeds = [
  { key: "admin", fullName: "Lightway Admin", email: "admin@lightway.edu.vn", role: "admin" },
  { key: "teacher", fullName: "Ms. Linh Nguyen", email: "teacher@lightway.edu.vn", role: "teacher" },
  { key: "anna", fullName: "Anna Tran", email: "anna@student.lightway.edu.vn", role: "student" },
  { key: "ben", fullName: "Ben Pham", email: "ben@student.lightway.edu.vn", role: "student" },
  { key: "chris", fullName: "Chris Le", email: "chris@student.lightway.edu.vn", role: "student" },
];

async function ensureUser(seed) {
  let user;
  try {
    user = await auth.getUserByEmail(seed.email);
    user = await auth.updateUser(user.uid, { displayName: seed.fullName, password, disabled: false });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email: seed.email, password, displayName: seed.fullName, emailVerified: true });
  }
  documentSeeds.push({ path: `users/${user.uid}`, data: {
    fullName: seed.fullName,
    email: seed.email,
    role: seed.role,
    active: true,
    createdAt: new Date().toISOString(),
  } });
  return user.uid;
}

console.log(`Seeding Firebase project ${projectId}...`);
await ensureAuthConfigured();
console.log("  ready: Firebase Authentication with Email/Password");
const userIds = {};
for (const seed of accountSeeds) {
  userIds[seed.key] = await ensureUser(seed);
  console.log(`  ready: ${seed.role.padEnd(7)} ${seed.email}`);
}

for (const course of curriculum.courses) documentSeeds.push({ path: `courses/${course.id}`, data: course });
for (const skill of curriculum.skills) documentSeeds.push({ path: `skills/${skill.id}`, data: skill });
for (const unit of curriculum.units) documentSeeds.push({ path: `units/${unit.id}`, data: unit });
for (const activity of curriculum.activities) documentSeeds.push({ path: `activities/${activity.id}`, data: activity });
documentSeeds.push({ path: "classes/toeic-demo-class", data: {
  name: "TOEIC Demo Class",
  teacherId: userIds.teacher,
  studentIds: [userIds.anna, userIds.ben, userIds.chris],
  courseIds: ["toeic"],
  active: true,
  activeSessionId: null,
  updatedAt: new Date().toISOString(),
} });

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}T/.test(value) ? { timestampValue: value } : { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
}

const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const writes = documentSeeds.map(({ path, data }) => ({
  update: { name: `${databaseRoot}/${path}`, fields: encodeFields(data) },
}));
const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ writes }),
});
if (!response.ok) throw new Error(`Firestore seed failed (${response.status}): ${await response.text()}`);

console.log(`Seed complete: ${curriculum.courses.length} courses, ${curriculum.units.length} units, ${curriculum.activities.length} activities, 1 class.`);
