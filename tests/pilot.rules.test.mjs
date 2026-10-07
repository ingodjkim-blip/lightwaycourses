import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, serverTimestamp, runTransaction, onSnapshot } from 'firebase/firestore';
import { seed, client, admin, curriculum } from './emulator-helpers.mjs';
import { completeActivity } from '../lib/learning.ts';
let teacher, a, b, outsider;
const sessionPath = 'classSessions/rules-session';
const unitId = 'toeic-reading-parts-of-speech';
const response = (id, activityId, answer, correct) => ({ studentId: id, studentName: id === 'pilot-a' ? 'Pilot Student A' : 'Pilot Student B', activityId, answer, correct, submittedAt: serverTimestamp() });
const deny = (promise) => assert.rejects(promise, (error) => error.code === 'permission-denied');
before(async () => {
  await seed();
  [teacher, a, b, outsider] = await Promise.all(['pilot-teacher', 'pilot-a', 'pilot-b', 'pilot-outsider'].map(client));
  await setDoc(doc(teacher.db, sessionPath), {
    classId: 'pilot-class', teacherId: 'pilot-teacher', status: 'active', mode: 'follow', locked: false,
    currentUnitId: unitId, currentActivityId: 'pos-03', currentCourseId: 'toeic', currentSkillId: 'toeic-reading',
    revealedActivityIds: [], coveredActivityIds: ['pos-03'], joinCode: 'LW1234',
  });
});
after(async () => { await Promise.all([teacher, a, b, outsider].filter(Boolean).map((c) => c.close())); });

test('Teacher history and enrolled join-code query are authorized; outsider is denied', async () => {
  assert.equal((await getDocs(query(collection(teacher.db, 'classSessions'), where('teacherId', '==', 'pilot-teacher')))).size, 1);
  assert.equal((await getDocs(query(collection(a.db, 'classSessions'), where('classId', '==', 'pilot-class'), where('joinCode', '==', 'LW1234'), where('status', '==', 'active')))).size, 1);
  await deny(getDoc(doc(outsider.db, sessionPath)));
});
test('Student cannot control session or promote their own role', async () => {
  await deny(updateDoc(doc(a.db, sessionPath), { mode: 'free' }));
  await deny(updateDoc(doc(a.db, 'users/pilot-a'), { role: 'teacher' }));
});
test('Teacher navigation reaches a subscribed student', async () => {
  const received = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { stop(); reject(new Error('listener timeout')); }, 5000);
    const stop = onSnapshot(doc(a.db, sessionPath), (snapshot) => {
      if (snapshot.data()?.currentActivityId === 'pos-05') { clearTimeout(timeout); stop(); resolve(); }
    }, reject);
  });
  await updateDoc(doc(teacher.db, sessionPath), { currentActivityId: 'pos-05' });
  await received;
});
test('Normalized fill-blank and short-answer grading agrees with the client', async () => {
  await setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-05`), response('pilot-a', 'pos-05', '  EFFICIENCY  ', true));
  await setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-07`), response('pilot-a', 'pos-07', 'Completely', true));
});
test('Incorrect answers are accepted only with an incorrect grade', async () => {
  await deny(setDoc(doc(b.db, `${sessionPath}/responses/pilot-b_pos-05`), response('pilot-b', 'pos-05', 'efficient', true)));
  await setDoc(doc(b.db, `${sessionPath}/responses/pilot-b_pos-05`), response('pilot-b', 'pos-05', 'efficient', false));
});
test('Another student cannot read or overwrite an existing answer', async () => {
  const path = `${sessionPath}/responses/pilot-a_pos-05`;
  await deny(getDoc(doc(b.db, path)));
  await deny(setDoc(doc(b.db, path), response('pilot-b', 'pos-05', 'efficiency', true)));
  assert.equal((await getDoc(doc(a.db, path))).data().studentId, 'pilot-a');
});
test('Duplicate IDs, forged owners, extra fields and empty answers are denied', async () => {
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/alias`), response('pilot-a', 'pos-04', 'promptly', true)));
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-b_pos-04`), response('pilot-b', 'pos-04', 'promptly', true)));
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-04`), { ...response('pilot-a', 'pos-04', 'promptly', true), extra: true }));
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-04`), response('pilot-a', 'pos-04', ' ', false)));
});
test('First submitted answer is immutable, including repeated submissions', async () => {
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-05`), response('pilot-a', 'pos-05', 'efficiency', true)));
});
test('Reveal prevents late answers; session membership prevents outsider answers', async () => {
  await updateDoc(doc(teacher.db, sessionPath), { revealedActivityIds: ['pos-04'] });
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-04`), response('pilot-a', 'pos-04', 'promptly', true)));
  await deny(setDoc(doc(outsider.db, `${sessionPath}/responses/pilot-outsider_pos-03`), { ...response('pilot-outsider', 'pos-03', 'Adverb', true), studentName: 'Pilot Outsider' }));
});
test('Guided rejects other-unit answers; Free permits them', async () => {
  await admin().db.doc('activities/other-unit-question').set({ id: 'other-unit-question', unitId: 'ielts-reading-main-ideas', type: 'short_answer', correctAnswer: 'gardens' });
  const ref = doc(a.db, `${sessionPath}/responses/pilot-a_other-unit-question`);
  await updateDoc(doc(teacher.db, sessionPath), { mode: 'guided' });
  await deny(setDoc(ref, response('pilot-a', 'other-unit-question', 'gardens', true)));
  await updateDoc(doc(teacher.db, sessionPath), { mode: 'free' });
  await setDoc(ref, response('pilot-a', 'other-unit-question', 'GARDENS', true));
});
test('Concurrent self-study retries award one point and retain the answer', async () => {
  const ref = doc(a.db, `userProgress/pilot-a/units/${unitId}`);
  const activity = curriculum.activities.find((x) => x.id === 'pos-05');
  const save = () => runTransaction(a.db, async (tx) => {
    const current = await tx.get(ref);
    tx.set(ref, { ...completeActivity(current.data(), activity, 'Efficiency'), updatedAt: serverTimestamp() });
  });
  await Promise.all([save(), save()]);
  const record = (await getDoc(ref)).data();
  assert.equal(record.score, 1);
  assert.equal(record.answers['pos-05'], 'Efficiency');
  assert.equal(record.completedActivityIds.length, 1);
  await deny(setDoc(doc(b.db, `userProgress/pilot-a/units/${unitId}`), record));
});
test('Ended sessions reject further answers and cannot be restarted by update', async () => {
  await updateDoc(doc(teacher.db, sessionPath), { status: 'ended' });
  await deny(setDoc(doc(a.db, `${sessionPath}/responses/pilot-a_pos-03`), response('pilot-a', 'pos-03', 'Adverb', true)));
  await deny(updateDoc(doc(teacher.db, sessionPath), { status: 'active' }));
});
