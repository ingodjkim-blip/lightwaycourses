import { readFile } from "node:fs/promises";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = "lightway-course";
const curriculum = JSON.parse(await readFile(new URL("../data/demo-curriculum.json", import.meta.url), "utf8"));
const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);

const documents = [
  ...curriculum.skills.filter((item) => item.courseId === "ielts" && ["ielts-listening", "ielts-writing", "ielts-reading", "ielts-speaking"].includes(item.id)).map((data) => ({ path: `skills/${data.id}`, data })),
  ...curriculum.units.filter((item) => item.id === "ielts-writing-skills-lesson-1").map((data) => ({ path: `units/${data.id}`, data })),
  ...curriculum.activities.filter((item) => item.unitId === "ielts-writing-skills-lesson-1").map((data) => ({ path: `activities/${data.id}`, data })),
];

const refs = documents.map(({ path }) => db.doc(path));
const snapshots = await db.getAll(...refs);

for (let index = 0; index < documents.length; index += 1) {
  const { path, data } = documents[index];
  const snapshot = snapshots[index];
  const existing = snapshot.data();

  if (path.startsWith("skills/") && !snapshot.exists) {
    throw new Error(`Guard check failed: expected existing IELTS skill document ${path}. No writes were queued.`);
  }
  if (existing?.courseId && existing.courseId !== data.courseId) {
    throw new Error(`Guard check failed: ${path} belongs to course ${existing.courseId}, not ${data.courseId}. No writes were queued.`);
  }
  if (existing?.unitId && existing.unitId !== data.unitId) {
    throw new Error(`Guard check failed: ${path} belongs to unit ${existing.unitId}, not ${data.unitId}. No writes were queued.`);
  }
  if (existing?.skillId && existing.skillId !== data.skillId) {
    throw new Error(`Guard check failed: ${path} belongs to skill ${existing.skillId}, not ${data.skillId}. No writes were queued.`);
  }
}

const writer = db.bulkWriter();
writer.onWriteError(() => false);
const writePromises = documents.map(({ path, data }, index) => writer
  .set(refs[index], data, { merge: true })
  .then((result) => ({ path, updateTime: result.writeTime.toDate().toISOString() })));
const closePromise = writer.close();
const results = await Promise.allSettled(writePromises);
await closePromise;

const failures = results.flatMap((result, index) => result.status === "rejected"
  ? [`${documents[index].path}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
  : []);
if (failures.length) {
  throw new Error(`IELTS pilot publish completed with ${failures.length} failed write(s):\n${failures.join("\n")}`);
}

const successes = results.map((result) => result.status === "fulfilled" ? result.value : null);
if (successes.some((result) => !result?.updateTime) || successes.length !== documents.length) {
  throw new Error("IELTS pilot publish returned an incomplete per-write result set.");
}
console.log(`Published ${successes.length} IELTS pilot curriculum documents with merge semantics; existing unrelated fields were preserved.`);
