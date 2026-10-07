import type { Activity, UnitProgress } from "../types/index";

export function normalizeAnswer(answer: string) {
  return answer.trim().toLowerCase();
}

export function isCorrectAnswer(activity: Activity, answer: string) {
  return Boolean(activity.correctAnswer && normalizeAnswer(answer) === normalizeAnswer(activity.correctAnswer));
}

// Keep the first completed attempt, including its answer, across retries/tabs.
export function completeActivity(previous: UnitProgress | undefined, activity: Activity, answer?: string): UnitProgress {
  const completed = previous?.completedActivityIds || [];
  if (completed.includes(activity.id)) return { ...previous!, lastActivityId: activity.id };
  return {
    completedActivityIds: [...completed, activity.id],
    lastActivityId: activity.id,
    score: (previous?.score || 0) + (answer && isCorrectAnswer(activity, answer) ? 1 : 0),
    answers: { ...previous?.answers, ...(answer ? { [activity.id]: answer.trim() } : {}) },
  };
}
