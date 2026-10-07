"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BookOpen, CalendarClock, History, LayoutDashboard, Play, School, Users, X } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/common/AppShell";
import { CurriculumExplorer } from "@/components/common/CurriculumExplorer";
import { TeacherClassroom } from "@/components/teacher/TeacherClassroom";
import { startClassSession } from "@/lib/classroom";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import type { Activity, ClassRecord, ClassSession, CurriculumData, Unit, UserProfile } from "@/types";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
  { id: "classes", label: "My Classes", icon: <School size={19} /> },
  { id: "curriculum", label: "Curriculum", icon: <BookOpen size={19} /> },
  { id: "sessions", label: "Sessions", icon: <History size={19} /> },
];

export function TeacherApp({ profile, curriculum }: { profile: UserProfile; curriculum: CurriculumData }) {
  const [active, setActive] = useState("dashboard");
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [startFor, setStartFor] = useState<ClassRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stopClasses = onSnapshot(query(collection(db, "classes"), where("teacherId", "==", profile.id)), (snapshot) => setClasses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ClassRecord, "id">) }))));
    const stopSessions = onSnapshot(query(collection(db, "classSessions"), where("teacherId", "==", profile.id)), (snapshot) => setSessions(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ClassSession, "id">) })).filter((item) => !item.joinCode?.startsWith("TS")).sort((a, b) => timestampMs(b.startedAt) - timestampMs(a.startedAt))));
    return () => { stopClasses(); stopSessions(); };
  }, [profile.id]);

  const activeClasses = useMemo(() => classes.filter((item) => item.active), [classes]);

  async function begin(unit: Unit, firstActivity?: Activity) {
    if (!startFor || !firstActivity) return;
    setBusy(true);
    setError("");
    try {
      const id = await startClassSession(startFor, profile, unit, firstActivity);
      setStartFor(null);
      setClassroomId(id);
    } catch (nextError) {
      setError(friendlyFirebaseError(nextError));
    } finally { setBusy(false); }
  }

  if (classroomId) return <TeacherClassroom sessionId={classroomId} curriculum={curriculum} onExit={() => setClassroomId(null)} />;

  return (
    <AppShell profile={profile} navItems={navItems} active={active} onNavigate={setActive} badge={sessions.some((item) => item.status === "active") ? <span className="live-chip">LIVE</span> : undefined}>
      <main className="page-content">
        {active === "dashboard" && <><PageHeader eyebrow="TEACHER WORKSPACE" title={`Ready for class, ${profile.fullName.split(" ")[0]}?`} description="Keep your classes moving and every learner on the same page." /><div className="teacher-hero"><div><span className="eyebrow light">TODAY AT LIGHTWAY</span><h2>Teach with focus.<br />Let the technology follow.</h2><p>Start a live session and guide every student device through the lesson in real time.</p><button className="button light" onClick={() => setActive("classes")}><Play size={18} /> Start a class</button></div><div className="hero-orbit"><span className="orbit-core"><BookOpen size={32} /></span><span className="orbit student-a"><Users size={18} /></span><span className="orbit student-b"><Users size={18} /></span><span className="orbit student-c"><Users size={18} /></span></div></div><div className="section-heading"><div><span className="eyebrow">MY CLASSES</span><h2>Pick up where you left off</h2></div><button className="text-button" onClick={() => setActive("classes")}>View all</button></div><ClassGrid classes={activeClasses} onStart={(item) => item.activeSessionId ? setClassroomId(item.activeSessionId) : setStartFor(item)} /></>}
        {active === "classes" && <><PageHeader eyebrow="TEACHING GROUPS" title="My Classes" description="Open a persistent class or launch its next live session." /><ClassGrid classes={activeClasses} onStart={(item) => item.activeSessionId ? setClassroomId(item.activeSessionId) : setStartFor(item)} />{!classes.length && <EmptyState icon={<School />} title="No classes assigned" description="Ask an admin to assign a class to this teacher." />}</>}
        {active === "curriculum" && <><PageHeader eyebrow="LESSON LIBRARY" title="Curriculum" description="Preview the same structured content students see." /><CurriculumExplorer curriculum={curriculum} /></>}
        {active === "sessions" && <><PageHeader eyebrow="TEACHING HISTORY" title="Recent Sessions" description="A record of live classes and activities covered." /><section className="panel table-panel"><div className="data-table"><div className="data-row session-row data-head"><span>Class</span><span>Started</span><span>Mode</span><span>Status</span><span /></div>{sessions.map((session) => <div className="data-row session-row" key={session.id}><span><strong>{session.className}</strong></span><span>{formatDate(session.startedAt)}</span><span className="capitalize">{session.mode}</span><span><b className={session.status === "active" ? "live-chip" : "quiet-chip"}>{session.status}</b></span><span>{session.status === "active" && <button className="text-button" onClick={() => setClassroomId(session.id)}>Open</button>}</span></div>)}</div>{!sessions.length && <EmptyState icon={<CalendarClock />} title="No sessions yet" description="Your completed and active classes will appear here." />}</section></>}
      </main>
      {startFor && <div className="modal-layer"><button className="modal-scrim" aria-label="Close" onClick={() => setStartFor(null)} /><section className="modal-card start-modal"><button className="modal-close" onClick={() => setStartFor(null)}><X size={20} /></button><span className="eyebrow">START LIVE CLASS</span><h2>{startFor.name}</h2><p>Choose the unit to teach. The session will begin in Follow Mode.</p>{error && <div className="form-error">{error}</div>}<div className={busy ? "disabled-content" : ""}><CurriculumExplorer curriculum={curriculum} compact onOpenUnit={(unit, first) => void begin(unit, first)} /></div>{busy && <div className="modal-busy"><div className="spinner" /> Creating session…</div>}</section></div>}
    </AppShell>
  );
}

function ClassGrid({ classes, onStart }: { classes: ClassRecord[]; onStart: (item: ClassRecord) => void }) {
  return <div className="card-grid class-grid">{classes.map((item) => <article className="class-card feature" key={item.id}><div className="class-card-top"><span className={item.activeSessionId ? "live-chip" : "quiet-chip"}>{item.activeSessionId ? "SESSION LIVE" : "READY"}</span><School size={23} /></div><h3>{item.name}</h3><p><Users size={16} /> {item.studentIds.length} students</p><div className="class-card-actions"><button className="button primary" onClick={() => onStart(item)}>{item.activeSessionId ? "Open live class" : "Start class session"}<Play size={17} /></button></div></article>)}</div>;
}

function timestampMs(value: unknown) { return typeof value === "object" && value && "toMillis" in value ? (value as { toMillis: () => number }).toMillis() : 0; }
function formatDate(value: unknown) { const ms = timestampMs(value); return ms ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(ms) : "Just now"; }
