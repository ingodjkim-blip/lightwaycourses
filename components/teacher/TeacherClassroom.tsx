"use client";

import { useEffect, useMemo, useState } from "react";
import { arrayUnion, collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Lock, LockOpen, LogOut, Radio, Sparkles, Users } from "lucide-react";
import { ActivityRenderer } from "@/components/activity/ActivityRenderer";
import { endClassSession } from "@/lib/classroom";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import type { ClassSession, CurriculumData, Participant, SessionMode, SessionResponse } from "@/types";

export function TeacherClassroom({ sessionId, curriculum, onExit }: { sessionId: string; curriculum: CurriculumData; onExit: () => void }) {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<SessionResponse[]>([]);
  const [error, setError] = useState("");
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const stopSession = onSnapshot(doc(db, "classSessions", sessionId), (snapshot) => snapshot.exists() && setSession({ id: snapshot.id, ...(snapshot.data() as Omit<ClassSession, "id">) }));
    const stopParticipants = onSnapshot(collection(db, "classSessions", sessionId, "participants"), (snapshot) => setParticipants(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Participant, "id">) }))));
    const stopResponses = onSnapshot(collection(db, "classSessions", sessionId, "responses"), (snapshot) => setResponses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<SessionResponse, "id">) }))));
    return () => { stopSession(); stopParticipants(); stopResponses(); };
  }, [sessionId]);

  const activities = useMemo(() => curriculum.activities.filter((item) => item.unitId === session?.currentUnitId).sort((a, b) => a.order - b.order), [curriculum.activities, session?.currentUnitId]);
  const currentIndex = Math.max(0, activities.findIndex((item) => item.id === session?.currentActivityId));
  const activity = activities[currentIndex];
  const currentResponses = responses.filter((item) => item.activityId === activity?.id);
  const connected = participants.filter(isConnected);

  async function updateSession(values: Record<string, unknown>) {
    setError("");
    try { await updateDoc(doc(db, "classSessions", sessionId), values); }
    catch (nextError) { setError(friendlyFirebaseError(nextError)); }
  }

  function goTo(index: number) {
    const next = activities[index];
    if (next) void updateSession({ currentActivityId: next.id, coveredActivityIds: arrayUnion(next.id), updatedAt: serverTimestamp() });
  }

  async function end() {
    if (!session || !window.confirm("End this live class for everyone?")) return;
    setEnding(true);
    try { await endClassSession(session.id, session.classId); onExit(); }
    catch (nextError) { setError(friendlyFirebaseError(nextError)); setEnding(false); }
  }

  if (!session || !activity) return <main className="center-screen"><div className="spinner" /><p>Connecting to the classroom…</p></main>;

  const revealed = session.revealedActivityIds?.includes(activity.id);
  return (
    <main className="classroom teacher-classroom">
      <header className="classroom-header"><div className="classroom-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>{session.className}</strong><span>{session.teacherName}</span></div></div><div className="session-identity"><span className="live-chip"><Radio size={13} /> LIVE</span><span>Join code <strong>{session.joinCode}</strong></span></div><button className="button danger-outline" disabled={ending} onClick={() => void end()}><LogOut size={17} /> {ending ? "Ending…" : "End class"}</button></header>
      {error && <div className="classroom-error">{error}</div>}
      <div className="classroom-body">
        <section className="lesson-stage">
          <div className="lesson-meta"><button className="icon-button" title="Back to dashboard" onClick={onExit}><ArrowLeft size={20} /></button><div><span className="eyebrow">TOEIC · READING</span><strong>Unit 1: Parts of Speech</strong></div><span>Activity {currentIndex + 1} / {activities.length}</span></div>
          <div className="activity-dots">{activities.map((item, index) => <button key={item.id} className={index === currentIndex ? "active" : session.coveredActivityIds?.includes(item.id) ? "covered" : ""} onClick={() => goTo(index)} title={`Activity ${index + 1}`}><span>{index + 1}</span></button>)}</div>
          <ActivityRenderer activity={activity} />
          <div className="teacher-nav"><button className="button secondary" disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}><ChevronLeft size={18} /> Back</button><button className="button primary" disabled={currentIndex === activities.length - 1} onClick={() => goTo(currentIndex + 1)}>Next <ChevronRight size={18} /></button></div>
        </section>
        <aside className="classroom-panel">
          <section><div className="panel-heading small"><div><span className="eyebrow">CLASSROOM CONTROL</span><h3>Teaching mode</h3></div></div><div className="mode-switch">{(["follow", "guided", "free"] as SessionMode[]).map((mode) => <button className={session.mode === mode ? "active" : ""} key={mode} onClick={() => void updateSession({ mode, updatedAt: serverTimestamp() })}><span>{mode === "follow" ? "Follow" : mode === "guided" ? "Guided" : "Free"}</span><small>{mode === "follow" ? "You control" : mode === "guided" ? "This unit" : "Independent"}</small></button>)}</div><button className={session.locked ? "lock-button active" : "lock-button"} onClick={() => void updateSession({ locked: !session.locked, updatedAt: serverTimestamp() })}>{session.locked ? <Lock size={18} /> : <LockOpen size={18} />}<span><strong>{session.locked ? "Class locked" : "Class unlocked"}</strong><small>{session.locked ? "Students stay in Class Mode" : "Students may leave the view"}</small></span></button></section>
          <section><div className="panel-heading small"><div><span className="eyebrow">STUDENTS</span><h3>{connected.length} connected</h3></div><Users size={20} /></div><div className="student-list">{participants.map((item) => <div key={item.id}><span className={isConnected(item) ? "presence live" : "presence"} /> <strong>{item.fullName}</strong><small>{isConnected(item) ? "Connected" : "Away"}</small></div>)}{!participants.length && <p className="muted small-copy">Share join code <strong>{session.joinCode}</strong> with students.</p>}</div></section>
          {activity.type === "multiple_choice" && <section><div className="panel-heading small"><div><span className="eyebrow">LIVE RESPONSES</span><h3>{currentResponses.length} submitted</h3></div><BarChart3 size={20} /></div><ResponseBars options={activity.options || []} responses={currentResponses} />{revealed ? <div className="answer-revealed"><CheckCircle2 size={17} /> Answer revealed</div> : <button className="button primary wide" disabled={!currentResponses.length} onClick={() => void updateSession({ revealedActivityIds: arrayUnion(activity.id) })}>Reveal answer</button>}</section>}
        </aside>
      </div>
      <footer className="teacher-controlbar"><button disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)}><ChevronLeft /> BACK</button><div><span className="status-dot live" /> Mode: <strong>{session.mode}</strong><span className="control-divider" />{session.locked ? <Lock size={15} /> : <LockOpen size={15} />}{session.locked ? "Locked" : "Unlocked"}</div><button disabled={currentIndex === activities.length - 1} onClick={() => goTo(currentIndex + 1)}>NEXT <ChevronRight /></button></footer>
    </main>
  );
}

function ResponseBars({ options, responses }: { options: string[]; responses: SessionResponse[] }) {
  return <div className="response-bars">{options.map((option, index) => { const count = responses.filter((item) => item.answer === option).length; const width = responses.length ? `${Math.round(count / responses.length * 100)}%` : "0%"; return <div key={option}><span>{String.fromCharCode(65 + index)}</span><div><i style={{ width }} /></div><strong>{count}</strong></div>; })}<p>{responses.length ? Math.round(responses.filter((item) => item.correct).length / responses.length * 100) : 0}% correct</p></div>;
}

function isConnected(participant: Participant) {
  if (participant.status !== "connected") return false;
  const value = participant.lastSeen;
  const lastSeen = typeof value === "object" && value && "toMillis" in value ? (value as { toMillis: () => number }).toMillis() : Date.now();
  return Date.now() - lastSeen < 90000;
}
