"use client";

import { useMemo, useState } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ActivityRenderer } from "@/components/activity/ActivityRenderer";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import { completeActivity } from "@/lib/learning";
import type { CurriculumData, Unit, UnitProgress, UserProfile } from "@/types";

export function SelfStudyUnit({ profile, curriculum, unit, progress, onBack }: { profile: UserProfile; curriculum: CurriculumData; unit: Unit; progress?: UnitProgress; onBack: () => void }) {
  const activities = useMemo(() => curriculum.activities.filter((item) => item.unitId === unit.id).sort((a, b) => a.order - b.order), [curriculum.activities, unit.id]);
  const [index, setIndex] = useState(Math.max(0, activities.findIndex((item) => item.id === progress?.lastActivityId)));
  const [saved, setSaved] = useState(progress);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const activity = activities[index];
  const completed = saved?.completedActivityIds || [];

  async function complete(answer?: string) {
    if (!activity || pending) return;
    setError("");
    if (!navigator.onLine) { setError("You are offline. Reconnect, then submit again; your answer has not been saved."); return; }
    setPending(true);
    try {
      const ref = doc(db, "userProgress", profile.id, "units", unit.id);
      const result = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const next = completeActivity(snapshot.exists() ? snapshot.data() as UnitProgress : undefined, activity, answer);
        transaction.set(ref, { ...next, updatedAt: serverTimestamp() });
        return next;
      });
      setSaved(result);
    } catch (nextError) { setError(`Progress was not saved. ${friendlyFirebaseError(nextError)} Please retry.`); }
    finally { setPending(false); }
  }

  if (!activity) return <main className="center-screen"><p>This unit does not have activities yet.</p><button className="button secondary" onClick={onBack}>Go back</button></main>;
  const isInteractive = ["multiple_choice", "fill_blank", "short_answer", "writing_prompt"].includes(activity.type);
  const isComplete = completed.includes(activity.id);
  const totalScored = activities.filter((item) => item.correctAnswer).length;
  const unitComplete = activities.every((item) => completed.includes(item.id));
  return <main className="self-study">
    <header><button className="icon-button" aria-label="Back to dashboard" disabled={pending} onClick={onBack}><ArrowLeft /></button><div className="classroom-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>Self-study</strong><span>{unit.title}</span></div></div><span>{index + 1} / {activities.length}</span></header>
    <div className="self-study-progress"><i style={{ width: `${completed.filter((id) => activities.some((item) => item.id === id)).length / activities.length * 100}%` }} /></div>
    <section className="self-study-stage">
      {error && <div className="form-error" role="alert">{error}</div>}
      {unitComplete && <div className="reveal-box correct" role="status"><Check /><div><strong>Unit complete</strong><p>{saved?.score || 0} / {totalScored} scored questions correct on your first attempt. Review the explanations below.</p></div></div>}
      <div className="activity-dots">{activities.map((item, itemIndex) => <button key={item.id} aria-label={`Activity ${itemIndex + 1}`} disabled={pending} className={itemIndex === index ? "active" : completed.includes(item.id) ? "covered" : ""} onClick={() => setIndex(itemIndex)}><span>{itemIndex + 1}</span></button>)}</div>
      <ActivityRenderer key={activity.id} activity={activity} interactive={isInteractive} selectedAnswer={saved?.answers?.[activity.id]} submitted={isComplete} revealed={isComplete} pending={pending} feedback="self" onSubmit={(answer) => void complete(answer)} />
      {!isInteractive && <button disabled={pending || isComplete} className={isComplete ? "button success wide" : "button primary wide"} onClick={() => void complete()}>{isComplete ? <><Check size={18} /> Completed</> : pending ? "Saving…" : "Mark as complete"}</button>}
      {pending && <p role="status">Saving your progress…</p>}
      <div className="study-navigation"><button className="button secondary" disabled={pending || index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={18} /> Previous</button><button className="button primary" disabled={pending || index === activities.length - 1} onClick={() => setIndex(index + 1)}>Next <ChevronRight size={18} /></button></div>
    </section>
  </main>;
}
