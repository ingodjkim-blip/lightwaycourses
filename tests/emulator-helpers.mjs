import { readFile } from 'node:fs/promises';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Prevent SDK environment detection from contacting cloud metadata.
process.env.METADATA_SERVER_DETECTION = 'none';

export const projectId = 'demo-lightway-pilot';
export const password = 'Synthetic-local-only-123!';
export function assertEmulators() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
      (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== projectId)) {
    throw new Error('Refusing to run: requires loopback Auth/Firestore emulators and demo-lightway-pilot.');
  }
}
export const curriculum = JSON.parse(await readFile(new URL('../data/demo-curriculum.json', import.meta.url), 'utf8'));
export const users = [
  { id: 'pilot-teacher', role: 'teacher', fullName: 'Pilot Teacher' },
  { id: 'pilot-a', role: 'student', fullName: 'Pilot Student A' },
  { id: 'pilot-b', role: 'student', fullName: 'Pilot Student B' },
  { id: 'pilot-outsider', role: 'student', fullName: 'Pilot Outsider' },
  { id: 'pilot-admin', role: 'admin', fullName: 'Pilot Admin' },
];
export function admin() {
  assertEmulators();
  const app = getAdminApps()[0] || initializeAdminApp({ projectId });
  return { db: getAdminFirestore(app), auth: getAdminAuth(app) };
}
export async function seed() {
  assertEmulators();
  for (const url of [
    `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,
  ]) {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Local emulator reset failed (${response.status})`);
  }
  const { db, auth } = admin();
  const batch = db.batch();
  for (const user of users) {
    const email = `${user.id}@example.test`;
    await auth.createUser({ uid: user.id, email, password });
    batch.set(db.doc(`users/${user.id}`), { ...user, email, active: true });
  }
  for (const collection of ['courses', 'skills', 'units', 'activities']) {
    for (const item of curriculum[collection]) batch.set(db.doc(`${collection}/${item.id}`), item);
  }
  batch.set(db.doc('classes/pilot-class'), {
    name: 'Pilot TOEIC Class', teacherId: 'pilot-teacher', studentIds: ['pilot-a', 'pilot-b'],
    courseIds: ['toeic'], active: true, activeSessionId: null,
  });
  await batch.commit();
}
export async function client(id) {
  assertEmulators();
  const app = initializeApp({ projectId, apiKey: 'local-emulator-key' }, `${id}-${Date.now()}-${Math.random()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  await signInWithEmailAndPassword(auth, `${id}@example.test`, password);
  return { db, close: () => deleteApp(app) };
}
