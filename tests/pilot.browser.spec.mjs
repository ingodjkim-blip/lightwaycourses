import { test, expect } from '@playwright/test';
import { seed, password, admin } from './emulator-helpers.mjs';

async function openUser(browser, id) {
  const context = await browser.newContext();
  const external = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    // The Firestore SDK probes connectivity after an offline transition.
    // Block that known probe too; unexpected external destinations fail the test.
    if (url.origin === 'https://www.google.com' && url.pathname === '/images/cleardot.gif') return route.abort();
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      external.push(url.origin); return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Email address').fill(`${id}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
  return { context, page, external };
}
async function begin(teacher) {
  await teacher.getByRole('button', { name: 'Start class session', exact: true }).click();
  await teacher.locator('.start-modal').getByRole('button', { name: /Unit 1: Parts of Speech/ }).click();
  await expect(teacher.getByRole('button', { name: 'End class', exact: true })).toBeVisible();
}
async function activity(page, index) {
  await page.getByRole('button', { name: `Activity ${index}`, exact: true }).click();
}

test.beforeEach(async () => { await seed(); });

test('Teacher and two students: join, follow, guided/free, reveal, reconnect and repeat', async ({ browser }) => {
  const teacher = await openUser(browser, 'pilot-teacher');
  const a = await openUser(browser, 'pilot-a');
  const b = await openUser(browser, 'pilot-b');
  try {
    await begin(teacher.page);
    await a.page.getByRole('button', { name: 'Join class', exact: true }).click();
    // The second student uses the join code instead of the live card.
    const code = await teacher.page.locator('.session-identity strong').textContent();
    await b.page.getByRole('button', { name: 'Join Class', exact: true }).click();
    await b.page.getByLabel('Class join code').fill(code);
    await b.page.locator('form').getByRole('button', { name: 'Join class', exact: true }).click();
    await expect(a.page.getByRole('heading', { name: 'Four word classes, four jobs' })).toBeVisible();
    await expect(b.page.getByRole('heading', { name: 'Four word classes, four jobs' })).toBeVisible();
    await activity(teacher.page, 3);
    await a.page.getByRole('radio', { name: /Adverb/ }).check();
    await a.page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await b.page.getByRole('radio', { name: /Noun/ }).check();
    await b.page.getByRole('button', { name: 'Submit answer', exact: true }).click();
    await expect(teacher.page.getByRole('heading', { name: '2 submitted' })).toBeVisible();
    await expect(teacher.page.getByText('50% correct', { exact: true })).toBeVisible();
    await teacher.page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
    await expect(a.page.getByText('Correct — well done.', { exact: true })).toBeVisible();
    await expect(b.page.getByText('Correct answer: Adverb', { exact: true })).toBeVisible();
    await activity(teacher.page, 5);
    await expect(a.page.getByRole('heading', { name: 'Complete the sentence' })).toBeVisible();
    await a.page.getByLabel('Your answer').fill('EFFICIENCY');
    await a.page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(teacher.page.getByRole('heading', { name: '1 submitted' })).toBeVisible();
    await expect(a.page.getByText('Answer received.', { exact: false })).toBeVisible();
    await teacher.page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
    await expect(a.page.getByText('Correct — well done.', { exact: true })).toBeVisible();
    await expect(b.page.getByText('Correct answer: efficiency', { exact: true })).toBeVisible();
    await expect(b.page.getByRole('button', { name: 'Submit', exact: true })).toHaveCount(0);
    await a.page.reload();
    await expect(a.page.getByText('Your answer: EFFICIENCY', { exact: true })).toBeVisible();

    await teacher.page.getByRole('button', { name: 'Guided This unit', exact: true }).click();
    await activity(a.page, 7);
    await activity(teacher.page, 8);
    await expect(a.page.getByRole('heading', { name: 'Repair the error' })).toBeVisible();
    await a.page.getByLabel('Your answer').fill('Completely');
    await a.page.getByRole('button', { name: 'Submit', exact: true }).click();
    await activity(teacher.page, 7);
    await expect(teacher.page.getByRole('heading', { name: '1 submitted' })).toBeVisible();
    await teacher.page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
    await expect(a.page.getByText('Correct — well done.', { exact: true })).toBeVisible();

    await teacher.page.getByRole('button', { name: 'Free Independent', exact: true }).click();
    await a.page.getByLabel('Choose a unit').selectOption('ielts-reading-main-ideas');
    await expect(a.page.getByRole('heading', { name: 'Skim before you scan' })).toBeVisible();
    await expect(a.page.locator('.lesson-meta')).toContainText('IELTS');
    await activity(teacher.page, 9);
    await expect(a.page.getByRole('heading', { name: 'Skim before you scan' })).toBeVisible();
    await teacher.page.getByRole('button', { name: 'Follow You control', exact: true }).click();
    await expect(a.page.getByRole('heading', { name: 'Short quiz' })).toBeVisible();
    await expect(a.page.getByLabel('Choose a unit')).toHaveCount(0);

    await a.context.setOffline(true);
    await activity(teacher.page, 10);
    await a.context.setOffline(false);
    await expect(a.page.getByRole('heading', { name: 'Unit review and next practice' })).toBeVisible();
    await teacher.page.getByRole('button', { name: /Class unlocked/ }).click();
    await expect(a.page.getByRole('button', { name: 'Leave view' })).toHaveCount(0);
    await teacher.page.getByRole('button', { name: /Class locked/ }).click();
    await a.page.getByRole('button', { name: 'Leave view' }).click();
    await a.page.reload();
    await expect(a.page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await a.page.getByRole('button', { name: 'Join class', exact: true }).click();
    await teacher.page.reload();
    await teacher.page.getByRole('button', { name: 'Open live class', exact: true }).click();
    teacher.page.once('dialog', (dialog) => dialog.accept());
    await teacher.page.getByRole('button', { name: 'End class', exact: true }).click();
    await expect(a.page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(b.page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await begin(teacher.page);
    await a.page.getByRole('button', { name: 'Join class', exact: true }).click();
    await expect(a.page.getByRole('heading', { name: 'Four word classes, four jobs' })).toBeVisible();
    expect((await admin().db.collection('classSessions').get()).size).toBe(2);
    expect([...teacher.external, ...a.external, ...b.external]).toEqual([]);
  } finally { await Promise.all([teacher, a, b].map((user) => user.context.close())); }
});

test('Self-study: offline retry, saved answer after refresh, full completion and no duplicate points', async ({ browser }) => {
  const user = await openUser(browser, 'pilot-a');
  try {
    const page = user.page;
    await page.getByRole('button', { name: 'Start unit', exact: true }).click();
    await activity(page, 5);
    await page.getByLabel('Your answer').fill('Efficiency');
    await user.context.setOffline(true);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.locator('.form-error[role=alert]')).toContainText('not been saved');
    await user.context.setOffline(false);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Correct — well done.', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Continue unit', exact: true }).click();
    await expect(page.getByText('Your answer: Efficiency', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Your answer')).toHaveValue('Efficiency');
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toHaveCount(0);
    for (const index of [1, 2, 8, 10]) {
      await activity(page, index);
      await page.getByRole('button', { name: 'Mark as complete', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();
    }
    for (const [index, answer] of [[3, 'D Adverb'], [4, 'B promptly'], [6, 'C approval'], [9, 'B effective']]) {
      await activity(page, index);
      await page.getByRole('radio', { name: answer, exact: true }).check();
      await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
      await expect(page.getByText('Correct — well done.', { exact: true })).toBeVisible();
    }
    await activity(page, 7);
    await page.getByLabel('Your answer').fill('Completely');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByText('Unit complete', { exact: true })).toBeVisible();
    await expect(page.getByText('6 / 6 scored questions', { exact: false })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Continue unit', exact: true }).click();
    await expect(page.getByText('Unit complete', { exact: true })).toBeVisible();
    const progress = (await admin().db.doc('userProgress/pilot-a/units/toeic-reading-parts-of-speech').get()).data();
    expect(progress.completedActivityIds).toHaveLength(10);
    expect(progress.score).toBe(6);
    expect(Object.keys(progress.answers)).toHaveLength(6);
    expect(user.external).toEqual([]);
  } finally { await user.context.close(); }
});

test('Concurrent teacher starts reuse one session; a stale end cannot erase a new class', async ({ browser }) => {
  const first = await openUser(browser, 'pilot-teacher');
  const second = await openUser(browser, 'pilot-teacher');
  const student = await openUser(browser, 'pilot-a');
  try {
    await Promise.all([first, second].map((t) => t.page.getByRole('button', { name: 'Start class session', exact: true }).click()));
    await Promise.all([first, second].map((t) => t.page.locator('.start-modal').getByRole('button', { name: /Unit 1: Parts of Speech/ }).click()));
    await expect(first.page.getByRole('button', { name: 'End class', exact: true })).toBeVisible();
    await expect(second.page.getByRole('button', { name: 'End class', exact: true })).toBeVisible();
    expect((await admin().db.collection('classSessions').get()).size).toBe(1);
    first.page.once('dialog', (dialog) => dialog.accept());
    await first.page.getByRole('button', { name: 'End class', exact: true }).click();
    await first.page.getByRole('button', { name: 'Start class session', exact: true }).click();
    await first.page.locator('.start-modal').getByRole('button', { name: 'IELTS', exact: true }).click();
    await first.page.locator('.start-modal').getByRole('button', { name: /Unit 1: Finding Main Ideas/ }).click();
    await expect(first.page.locator('.lesson-meta')).toContainText('IELTS');
    await expect(first.page.locator('.lesson-meta')).toContainText('Finding Main Ideas');
    second.page.once('dialog', (dialog) => dialog.accept());
    await second.page.getByRole('button', { name: 'End class', exact: true }).click();
    await student.page.getByRole('button', { name: 'Join class', exact: true }).click();
    await expect(student.page.getByRole('heading', { name: 'Skim before you scan' })).toBeVisible();
    const activeId = (await admin().db.doc('classes/pilot-class').get()).data().activeSessionId;
    expect((await admin().db.doc(`classSessions/${activeId}`).get()).data().status).toBe('active');
    expect([...first.external, ...second.external, ...student.external]).toEqual([]);
  } finally { await Promise.all([first, second, student].map((u) => u.context.close())); }
});
