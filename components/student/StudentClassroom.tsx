"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Cloud, Lock, LogOut, Radio, Sparkles, Unlock, Wifi } from "lucide-react";
import { ActivityRenderer } from "@/components/activity/ActivityRenderer";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import type { ClassSession, CurriculumData, SessionResponse, UserProfile } from "@/types";

export function StudentClassroom({ sessionId, profile, curriculum, onEnded, onLeave }: { sessionId: string; profile: UserProfile; curriculum: CurriculumData; onEnded: () => void; onLeave: () => void }) {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [localActivityId, setLocalActivityId] = useState("");
  const [responses, setResponses] = useState<SessionResponse[]>([]);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionRef = doc(db, "classSessions", sessionId);
    const participantRef = doc(db, "classSessions", sessionId, "participants", profile.id);
    void setDoc(participantRef, { studentId: profile.id, fullName: profile.fullName, status: "connected", joinedAt: serverTimestamp(), lastSeen: serverTimestamp() }, { merge: true });
    const heartbeat = window.setInterval(() => void updateDoc(participantRef, { status: "connected", lastSeen: serverTimestamp() }), 25000);
    const stopSession = onSnapshot(sessionRef, { includeMetadataChanges: true }, (snapshot) => {
      setConnected(!snapshot.metadata.fromCache || navigator.onLine);
      if (!snapshot.exists()) return;
      const next = { id: snapshot.id, ...(snapshot.data() as Omit<ClassSession, "id">) };
      if (next.status === "ended") { onEnded(); return; }
      setSession(next);
      if (next.mode === "follow" || !localActivityId) setLocalActivityId(next.currentActivityId);
    }, () => setConnected(false));
    const stopResponses = onSnapshot(query(collection(db, "classSessions", sessionId, "responses"), where("studentId", "==", profile.id)), (snapshot) => setResponses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SessionResponse, "id">) }))));
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
  // localActivityId is intentionally synchronized by the session callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, profile.id, profile.fullName]);

  const activities = useMemo(() => curriculum.activities.filter((item) => item.unitId === session?.currentUnitId).sort((a, b) => a.order - b.order), [curriculum.activities, session?.currentUnitId]);
  const currentId = session?.mode === "follow" ? session.currentActivityId : localActivityId || session?.currentActivityId;
  const currentIndex = Math.max(0, activities.findIndex((item) => item.id === currentId));
  const activity = activities[currentIndex];
  const response = responses.find((item) => item.activityId === activity?.id);
  const revealed = Boolean(activity && session?.revealedActivityIds?.includes(activity.id));

  async function submit(answer: string) {
    if (!activity) return;
    setError("");
    try {
      await setDoc(doc(db, "classSessions", sessionId, "responses", `${profile.id}_${activity.id}`), {
        studentId: profile.id,
        studentName: profile.fullName,
        activityId: activity.id,
        answer,
        correct: answer.trim().toLowerCase() === activity.correctAnswer?.trim().toLowerCase(),
        submittedAt: serverTimestamp(),
      }, { merge: true });
    } catch (nextError) { setError(friendlyFirebaseError(nextError)); }
  }

  function move(direction: number) {
    const next = activities[currentIndex + direction];
    if (next && session?.mode !== "follow") setLocalActivityId(next.id);
  }

  if (!session || !activity) return <main className="center-screen"><div className="spinner" /><p>Joining the live class…</p></main>;
  const canNavigate = session.mode !== "follow";

  return <main className="classroom student-classroom"><header className="classroom-header"><div className="classroom-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>{session.className}</strong><span>{session.teacherName}</span></div></div><div className={connected ? "connection-pill online" : "connection-pill"}>{connected ? <Wifi size={15} /> : <Cloud size={15} />}{connected ? "Connected" : "Reconnecting…"}</div>{!session.locked && <button className="button ghost" onClick={onLeave}><LogOut size={17} /> Leave view</button>}</header><div className={`student-mode-banner ${session.mode}`}><div>{session.mode === "follow" ? <Radio /> : session.mode === "guided" ? <Lock /> : <Unlock />}<span><strong>{session.mode === "follow" ? "Following teacher" : session.mode === "guided" ? "Guided practice" : "Free practice"}</strong><small>{session.mode === "follow" ? "This page updates automatically" : session.mode === "guided" ? "You can move inside this unit" : "Work independently until your teacher calls you back"}</small></span></div>{session.locked && <span><Lock size={14} /> Class view locked</span>}</div>{error && <div className="classroom-error">{error}</div>}<section className="student-stage"><div className="lesson-meta"><div><span className="eyebrow">TOEIC · READING</span><strong>Unit 1: Parts of Speech</strong></div><span>Activity {currentIndex + 1} / {activities.length}</span></div>{canNavigate && <div className="activity-dots">{activities.map((item, index) => <button key={item.id} className={index === currentIndex ? "active" : ""} onClick={() => setLocalActivityId(item.id)}><span>{index + 1}</span></button>)}</div>}<ActivityRenderer activity={activity} interactive selectedAnswer={response?.answer} submitted={Boolean(response)} revealed={revealed} onSubmit={(answer) => void submit(answer)} />{canNavigate && <div className="study-navigation"><button className="button secondary" disabled={currentIndex === 0} onClick={() => move(-1)}><ChevronLeft size={18} /> Previous</button><button className="button primary" disabled={currentIndex === activities.length - 1} onClick={() => move(1)}>Next <ChevronRight size={18} /></button></div>}</section></main>;
}
