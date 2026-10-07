import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { completeActivity, isCorrectAnswer } from '../lib/learning.ts';
const curriculum = JSON.parse(await readFile(new URL('../data/demo-curriculum.json', import.meta.url)));
const activities = curriculum.activities.filter((item) => item.unitId === 'toeic-reading-parts-of-speech');

test('Curriculum links, ordering, answers and explanations are complete', () => {
  for (const collection of Object.values(curriculum)) assert.equal(new Set(collection.map((x) => x.id)).size, collection.length);
  for (const unit of curriculum.units) {
    assert.ok(curriculum.skills.some((s) => s.id === unit.skillId && s.courseId === unit.courseId));
    const items = curriculum.activities.filter((a) => a.unitId === unit.id);
    assert.equal(items.length, unit.activityCount);
    assert.deepEqual(items.map((a) => a.order), Array.from({ length: items.length }, (_, i) => i + 1));
    for (const item of items) {
      assert.equal(item.courseId, unit.courseId);
      assert.equal(item.skillId, unit.skillId);
      if (item.correctAnswer) assert.ok(item.explanation?.length > 30);
      if (item.type === 'multiple_choice') assert.ok(item.options.includes(item.correctAnswer));
    }
  }
  assert.equal(activities.length, 10);
  assert.equal(activities.filter((a) => a.correctAnswer).length, 6);
});
test('All six pilot keys accept surrounding whitespace and uppercase', () => {
  for (const a of activities.filter((a) => a.correctAnswer)) {
    assert.ok(isCorrectAnswer(a, `  ${a.correctAnswer.toUpperCase()}  `));
    assert.equal(isCorrectAnswer(a, 'wrong-answer'), false);
  }
});
test('Repeated completion keeps original answer and cannot increment score twice', () => {
  const a = activities.find((a) => a.id === 'pos-05');
  const first = completeActivity(undefined, a, ' Efficiency ');
  const second = completeActivity(first, a, 'wrong-answer');
  assert.equal(second.score, 1);
  assert.equal(second.answers[a.id], 'Efficiency');
  assert.deepEqual(second.completedActivityIds, [a.id]);
});
test('Ten completed activities produce six points and preserve answers after serialization', () => {
  let record;
  for (const a of activities) record = completeActivity(record, a, a.correctAnswer);
  const restored = JSON.parse(JSON.stringify(record));
  assert.equal(restored.score, 6);
  assert.equal(restored.completedActivityIds.length, 10);
  assert.equal(Object.keys(restored.answers).length, 6);
  assert.equal(restored.lastActivityId, 'pos-10');
});

test('Pilot runner refuses missing emulators and non-demo project IDs before any test runs', () => {
  for (const changes of [
    { FIRESTORE_EMULATOR_HOST: '', FIREBASE_AUTH_EMULATOR_HOST: '' },
    { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', GCLOUD_PROJECT: 'not-a-demo-project' },
  ]) {
    const result = spawnSync(process.execPath, ['scripts/test-pilot.mjs'], { env: { ...process.env, ...changes }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to run/);
  }
});
