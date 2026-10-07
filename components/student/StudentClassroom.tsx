"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Cloud, Lock, LogOut, Radio, Sparkles, Unlock, Wifi } from "lucide-react";
import { ActivityRenderer } from "@/components/activity/ActivityRenderer";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import { isCorrectAnswer } from "@/lib/learning";
import type { ClassSession, CurriculumData, SessionResponse, UserProfile } from "@/types";

export function StudentClassroom({ sessionId, profile, curriculum, onEnded, onLeave }: { sessionId: string; profile: UserProfile; curriculum: CurriculumData; onEnded: () => void; onLeave: () => void }) {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [localActivityId, setLocalActivityId] = useState("");
  const [responses, setResponses] = useState<SessionResponse[]>([]);
  const [connected, setConnected] = useState(true);
  const [pending, setPending] = useState(false);
  const [localUnitId, setLocalUnitId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionRef = doc(db, "classSessions", sessionId);
    const participantRef = doc(db, "classSessions", sessionId, "participants", profile.id);
    const presenceError = (nextError: unknown) => setError(friendlyFirebaseError(nextError));
    void setDoc(participantRef, { studentId: profile.id, fullName: profile.fullName, status: "connected", joinedAt: serverTimestamp(), lastSeen: serverTimestamp() }, { merge: true }).catch(presenceError);
    const heartbeat = window.setInterval(() => void updateDoc(participantRef, { status: "connected", lastSeen: serverTimestamp() }).catch(presenceError), 25000);
    let previousMode = "";
    let previousUnit = "";
    const stopSession = onSnapshot(sessionRef, { includeMetadataChanges: true }, (snapshot) => {
      setConnected(navigator.onLine && !snapshot.metadata.fromCache);
      if (!snapshot.exists()) { setError("This class session is no longer available."); return; }
      const next = { id: snapshot.id, ...(snapshot.data() as Omit<ClassSession, "id">) };
      if (next.status === "ended") { onEnded(); return; }
      setSession(next);
      if (next.mode === "follow" || next.mode !== previousMode || next.currentUnitId !== previousUnit) {
        setLocalActivityId(next.currentActivityId);
        setLocalUnitId("");
      }
      previousMode = next.mode;
      previousUnit = next.currentUnitId;
    }, (nextError) => { setConnected(false); presenceError(nextError); });
    const stopResponses = onSnapshot(query(collection(db, "classSessions", sessionId, "responses"), where("studentId", "==", profile.id)), (snapshot) => setResponses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SessionResponse, "id">) }))), presenceError);
    const online = () => setConnected(true);
    const offline = () => setConnected(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.clearInterval(heartbeat);
      stopSession();
      stopResponses();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      void updateDoc(participantRef, { status: "disconnected", lastSeen: serverTimestamp() }).catch(() => undefined);
    };
  }, [sessionId, profile.id, profile.fullName, onEnded]);

  const activeUnitId = session?.mode === "free" && localUnitId ? localUnitId : session?.currentUnitId;
  const unit = curriculum.units.find((item) => item.id === activeUnitId);
  const course = curriculum.courses.find((item) => item.id === unit?.courseId);
  const skill = curriculum.skills.find((item) => item.id === unit?.skillId);
  const activities = useMemo(() => curriculum.activities.filter((item) => item.unitId === activeUnitId).sort((a, b) => a.order - b.order), [curriculum.activities, activeUnitId]);
  const currentId = session?.mode === "follow" ? session.currentActivityId : localActivityId || session?.currentActivityId;
  const currentIndex = Math.max(0, activities.findIndex((item) => item.id === currentId));
  const activity = activities[currentIndex];
  const response = responses.find((item) => item.activityId === activity?.id);
  const revealed = Boolean(activity && session?.revealedActivityIds?.includes(activity.id));

  async function submit(answer: string) {
    if (!activity || pending || response || revealed) return;
    setError("");
    if (!navigator.onLine || !connected) { setError("Reconnect before submitting your answer."); return; }
    setPending(true);
    try {
      await setDoc(doc(db, "classSessions", sessionId, "responses", `${profile.id}_${activity.id}`), {
        studentId: profile.id,
        studentName: profile.fullName,
        activityId: activity.id,
        answer,
        correct: isCorrectAnswer(activity, answer),
        submittedAt: serverTimestamp(),
      });
    } catch (nextError) { setError(friendlyFirebaseError(nextError)); }
    finally { setPending(false); }
  }

  function move(direction: number) {
    const next = activities[currentIndex + direction];
    if (next && session?.mode !== "follow") setLocalActivityId(next.id);
  }

  if (!session || !activity) return <main className="center-screen">{error ? <p role="alert">{error}</p> : <><div className="spinner" /><p>Joining the live class…</p></>}<button className="button secondary" onClick={onLeave}>Return to dashboard</button></main>;
  const canNavigate = session.mode !== "follow";

  return <main className="classroom student-classroom"><header className="classroom-header"><div className="classroom-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>{session.className}</strong><span>{session.teacherName}</span></div></div><div className={connected ? "connection-pill online" : "connection-pill"}>{connected ? <Wifi size={15} /> : <Cloud size={15} />}{connected ? "Connected" : "Reconnecting…"}</div>{!session.locked && <button className="button ghost" onClick={onLeave}><LogOut size={17} /> Leave view</button>}</header><div className={`student-mode-banner ${session.mode}`}><div>{session.mode === "follow" ? <Radio /> : session.mode === "guided" ? <Lock /> : <Unlock />}<span><strong>{session.mode === "follow" ? "Following teacher" : session.mode === "guided" ? "Guided practice" : "Free practice"}</strong><small>{session.mode === "follow" ? "This page updates automatically" : session.mode === "guided" ? "You can move inside this unit" : "Work independently until your teacher calls you back"}</small></span></div>{session.locked && <span><Lock size={14} /> Class view locked</span>}</div>{error && <div className="classroom-error" role="alert">{error}</div>}<section className="student-stage"><div className="lesson-meta"><div><span className="eyebrow">{course?.name} · {skill?.name}</span><strong>{unit?.title}</strong></div><span>Activity {currentIndex + 1} / {activities.length}</span></div>{session.mode === "free" && <label className="free-unit-picker">Choose a unit<select aria-label="Choose a unit" value={activeUnitId} onChange={(event) => { setLocalUnitId(event.target.value); setLocalActivityId(""); }}>{curriculum.units.map((item) => <option key={item.id} value={item.id}>{curriculum.courses.find((course) => course.id === item.courseId)?.name} · {item.title}</option>)}</select></label>}{canNavigate && <div className="activity-dots">{activities.map((item, index) => <button key={item.id} aria-label={`Activity ${index + 1}`} className={index === currentIndex ? "active" : ""} onClick={() => setLocalActivityId(item.id)}><span>{index + 1}</span></button>)}</div>}<ActivityRenderer key={activity.id} activity={activity} pending={pending || !connected} interactive selectedAnswer={response?.answer} submitted={Boolean(response)} revealed={revealed} onSubmit={(answer) => void submit(answer)} />{canNavigate && <div className="study-navigation"><button className="button secondary" disabled={currentIndex === 0} onClick={() => move(-1)}><ChevronLeft size={18} /> Previous</button><button className="button primary" disabled={currentIndex === activities.length - 1} onClick={() => move(1)}>Next <ChevronRight size={18} /></button></div>}</section></main>;
}
