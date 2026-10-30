import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { applicationDefault, cert, refreshToken as refreshTokenCredential } from "firebase-admin/app";

const projectId = "lightway-course";
const curriculum = JSON.parse(await readFile(new URL("../data/demo-curriculum.json", import.meta.url), "utf8"));
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let credential;

if (serviceAccountPath) {
  credential = cert(JSON.parse(await readFile(serviceAccountPath, "utf8")));
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

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(value) } };
}

function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)]));
}

const documents = [
  ...curriculum.skills.filter((item) => item.courseId === "ielts" && ["ielts-listening", "ielts-writing", "ielts-reading", "ielts-speaking"].includes(item.id)).map((data) => ({ path: `skills/${data.id}`, data })),
  ...curriculum.units.filter((item) => item.id === "ielts-writing-skills-lesson-1").map((data) => ({ path: `units/${data.id}`, data })),
  ...curriculum.activities.filter((item) => item.unitId === "ielts-writing-skills-lesson-1").map((data) => ({ path: `activities/${data.id}`, data })),
];

const accessToken = await credential.getAccessToken();
const databaseRoot = `projects/${projectId}/databases/(default)/documents`;
const writes = documents.map(({ path, data }) => ({ update: { name: `${databaseRoot}/${path}`, fields: encodeFields(data) } }));
const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchWrite`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ writes }),
});

if (!response.ok) throw new Error(`IELTS pilot publish failed (${response.status}): ${await response.text()}`);
console.log(`Published ${documents.length} IELTS pilot curriculum documents without deleting existing data.`);
