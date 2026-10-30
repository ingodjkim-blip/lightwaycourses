"use client";

import { useMemo, useState } from "react";
import { arrayUnion, doc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ActivityRenderer } from "@/components/activity/ActivityRenderer";
import { db } from "@/lib/firebase";
import type { CurriculumData, Unit, UnitProgress, UserProfile } from "@/types";

export function SelfStudyUnit({ profile, curriculum, unit, progress, onBack }: { profile: UserProfile; curriculum: CurriculumData; unit: Unit; progress?: UnitProgress; onBack: () => void }) {
  const activities = useMemo(() => curriculum.activities.filter((item) => item.unitId === unit.id).sort((a, b) => a.order - b.order), [curriculum.activities, unit.id]);
  const initialIndex = Math.max(0, activities.findIndex((item) => item.id === progress?.lastActivityId));
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<string[]>(progress?.completedActivityIds || []);
  const activity = activities[index];

  async function complete(answer?: string) {
    if (!activity) return;
    if (answer) setAnswers((current) => ({ ...current, [activity.id]: answer }));
    const isNew = !completed.includes(activity.id);
    setCompleted((current) => current.includes(activity.id) ? current : [...current, activity.id]);
    const correct = answer && activity.correctAnswer ? answer.trim().toLowerCase() === activity.correctAnswer.trim().toLowerCase() : false;
    await setDoc(doc(db, "userProgress", profile.id, "units", unit.id), {
      completedActivityIds: arrayUnion(activity.id),
      lastActivityId: activity.id,
      score: isNew && correct ? increment(1) : increment(0),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  if (!activity) return <main className="center-screen"><p>This unit does not have activities yet.</p><button className="button secondary" onClick={onBack}>Go back</button></main>;
  const isInteractive = ["multiple_choice", "fill_blank", "short_answer", "writing_prompt"].includes(activity.type);
  const isComplete = completed.includes(activity.id);
  return <main className="self-study"><header><button className="icon-button" onClick={onBack}><ArrowLeft /></button><div className="classroom-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>Self-study</strong><span>{unit.title}</span></div></div><span>{index + 1} / {activities.length}</span></header><div className="self-study-progress"><i style={{ width: `${(index + 1) / activities.length * 100}%` }} /></div><section className="self-study-stage"><div className="activity-dots">{activities.map((item, itemIndex) => <button key={item.id} className={itemIndex === index ? "active" : completed.includes(item.id) ? "covered" : ""} onClick={() => setIndex(itemIndex)}><span>{itemIndex + 1}</span></button>)}</div><ActivityRenderer activity={activity} interactive={isInteractive} selectedAnswer={answers[activity.id]} submitted={isComplete} revealed={isComplete} onSubmit={(answer) => void complete(answer)} />{!isInteractive && <button className={isComplete ? "button success wide" : "button primary wide"} onClick={() => void complete()}>{isComplete ? <><Check size={18} /> Completed</> : "Mark as complete"}</button>}<div className="study-navigation"><button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={18} /> Previous</button><button className="button primary" disabled={index === activities.length - 1} onClick={() => setIndex(index + 1)}>Next <ChevronRight size={18} /></button></div></section></main>;
}
