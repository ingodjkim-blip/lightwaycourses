"use client";

import { FormEvent, useEffect, useState } from "react";
import { collection, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { ArrowRight, BarChart3, BookOpen, Hash, LayoutDashboard, Play, Radio, School, Target } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/common/AppShell";
import { CurriculumExplorer } from "@/components/common/CurriculumExplorer";
import { SelfStudyUnit } from "@/components/student/SelfStudyUnit";
import { StudentClassroom } from "@/components/student/StudentClassroom";
import { db, friendlyFirebaseError } from "@/lib/firebase";
import type { Activity, ClassRecord, CurriculumData, Unit, UnitProgress, UserProfile } from "@/types";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={19} /> },
  { id: "courses", label: "My Courses", icon: <BookOpen size={19} /> },
  { id: "progress", label: "Progress", icon: <BarChart3 size={19} /> },
  { id: "join", label: "Join Class", icon: <Hash size={19} /> },
];

export function StudentApp({ profile, curriculum }: { profile: UserProfile; curriculum: CurriculumData }) {
  const [active, setActive] = useState("dashboard");
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [joinedSessionId, setJoinedSessionId] = useState<string | null>(null);
  const [study, setStudy] = useState<{ unit: Unit; first?: Activity } | null>(null);
  const [progress, setProgress] = useState<Record<string, UnitProgress>>({});
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(`lightway-session-${profile.id}`);
    if (stored) window.queueMicrotask(() => setJoinedSessionId(stored));
    const stopClasses = onSnapshot(query(collection(db, "classes"), where("studentIds", "array-contains", profile.id)), (snapshot) => setClasses(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ClassRecord, "id">) }))));
    const stopProgress = onSnapshot(collection(db, "userProgress", profile.id, "units"), (snapshot) => { const next: Record<string, UnitProgress> = {}; snapshot.docs.forEach((item) => { next[item.id] = item.data() as UnitProgress; }); setProgress(next); });
    return () => { stopClasses(); stopProgress(); };
  }, [profile.id]);

  const liveClass = classes.find((item) => item.activeSessionId);
  const restoredClassroomId = joinedSessionId && liveClass?.activeSessionId === joinedSessionId ? joinedSessionId : null;

  function enterSession(sessionId: string) {
    window.localStorage.setItem(`lightway-session-${profile.id}`, sessionId);
    setJoinedSessionId(sessionId);
    setClassroomId(sessionId);
  }

  function finishSession() {
    window.localStorage.removeItem(`lightway-session-${profile.id}`);
    setJoinedSessionId(null);
    setClassroomId(null);
    setActive("dashboard");
  }

  async function joinWithCode(event: FormEvent) {
    event.preventDefault();
    setJoining(true);
    setJoinError("");
    try {
      let sessionId = "";
      for (const item of classes) {
        const snapshot = await getDocs(query(
          collection(db, "classSessions"),
          where("classId", "==", item.id),
          where("joinCode", "==", joinCode.trim().toUpperCase()),
          where("status", "==", "active"),
          limit(1),
        ));
        if (!snapshot.empty) { sessionId = snapshot.docs[0].id; break; }
      }
      if (!sessionId) throw new Error("No active class was found with that code.");
      enterSession(sessionId);
    } catch (error) {
      setJoinError(friendlyFirebaseError(error));
      setJoining(false);
    }
  }

  if (classroomId || restoredClassroomId) return <StudentClassroom sessionId={(classroomId || restoredClassroomId)!} profile={profile} curriculum={curriculum} onEnded={finishSession} onLeave={() => { setClassroomId(null); setJoinedSessionId(null); }} />;
  if (study) return <SelfStudyUnit profile={profile} curriculum={curriculum} unit={study.unit} progress={progress[study.unit.id]} onBack={() => setStudy(null)} />;

  const toeicUnit = curriculum.units.find((unit) => unit.id === "toeic-reading-parts-of-speech");
  const toeicProgress = toeicUnit ? progress[toeicUnit.id] : undefined;
  const completed = toeicProgress?.completedActivityIds.length || 0;

  return (
    <AppShell profile={profile} navItems={navItems} active={active} onNavigate={setActive} badge={liveClass ? <span className="live-chip"><Radio size={12} /> LIVE</span> : undefined}>
      <main className="page-content student-content">
        {active === "dashboard" && <><PageHeader eyebrow="STUDENT HOME" title={`Keep going, ${profile.fullName.split(" ")[0]}.`} description="A little focused practice every day adds up." />{liveClass && <section className="live-class-card"><div className="live-pulse"><Radio size={28} /></div><div><span className="eyebrow light">LIVE CLASS</span><h2>{liveClass.name}</h2><p>Your teacher is teaching now. Join to follow the lesson in real time.</p></div><button className="button light" onClick={() => enterSession(liveClass.activeSessionId!)}>Join class <ArrowRight size={18} /></button></section>}<div className="student-dashboard-grid"><section className="continue-card"><span className="eyebrow">CONTINUE LEARNING</span><div className="course-label"><i style={{ background: "#5b5bd6" }} /> TOEIC · READING</div><h2>Unit 1: Parts of Speech</h2><p>Build accuracy with word forms in real exam sentences.</p><div className="progress-track"><i style={{ width: `${completed * 10}%` }} /></div><div className="progress-copy"><span>{completed} of 10 activities</span><strong>{completed * 10}%</strong></div>{toeicUnit && <button className="button primary" onClick={() => setStudy({ unit: toeicUnit })}><Play size={17} /> {completed ? "Continue unit" : "Start unit"}</button>}</section><section className="daily-card"><div className="daily-icon"><Target /></div><span className="eyebrow">WEEKLY FOCUS</span><strong>{completed}</strong><p>activities completed</p><small>Goal: 6 activities</small></section></div><div className="section-heading"><div><span className="eyebrow">MY COURSES</span><h2>Choose your next focus</h2></div><button className="text-button" onClick={() => setActive("courses")}>Explore all</button></div><CourseMiniGrid curriculum={curriculum} onOpen={(unit) => setStudy({ unit })} /></>}
        {active === "courses" && <><PageHeader eyebrow="COURSE LIBRARY" title="My Courses" description="Move through the demo curriculum at your own pace." /><CurriculumExplorer curriculum={curriculum} onOpenUnit={(unit, first) => setStudy({ unit, first })} /></>}
        {active === "progress" && <><PageHeader eyebrow="LEARNING RECORD" title="Progress" description="Simple milestones across your active units." /><div className="progress-grid">{curriculum.units.map((unit) => { const unitProgress = progress[unit.id]; const count = unitProgress?.completedActivityIds.length || 0; const percent = Math.round(count / unit.activityCount * 100); const course = curriculum.courses.find((item) => item.id === unit.courseId); return <article className="progress-card" key={unit.id}><div><span className="course-dot" style={{ background: course?.color }} /><span className="eyebrow">{course?.name}</span></div><h3>{unit.title}</h3><div className="progress-track"><i style={{ width: `${percent}%`, background: course?.color }} /></div><p><span>{count} / {unit.activityCount} activities</span><strong>{percent}%</strong></p></article>; })}</div>{!Object.keys(progress).length && <EmptyState icon={<BarChart3 />} title="Your progress starts here" description="Complete an activity in My Courses to see it recorded." />}</>}
        {active === "join" && <><PageHeader eyebrow="CLASS MODE" title="Join a live class" description="Enter the code shown by your teacher." /><section className="join-card"><div className="join-graphic"><Hash size={36} /></div><form onSubmit={joinWithCode}><label>Class join code<input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="LW1234" maxLength={6} required /></label>{joinError && <div className="form-error">{joinError}</div>}<button className="button primary wide" disabled={joining || joinCode.length < 6}>{joining ? "Finding class…" : "Join class"}<ArrowRight size={18} /></button></form>{liveClass && <button className="active-class-shortcut" onClick={() => enterSession(liveClass.activeSessionId!)}><span className="status-dot live" /><span><strong>{liveClass.name}</strong><small>Active now</small></span><ArrowRight size={18} /></button>}</section></>}
      </main>
    </AppShell>
  );
}

function CourseMiniGrid({ curriculum, onOpen }: { curriculum: CurriculumData; onOpen: (unit: Unit) => void }) {
  return <div className="course-mini-grid">{curriculum.courses.map((course) => { const unit = curriculum.units.find((item) => item.courseId === course.id); return <button key={course.id} onClick={() => unit && onOpen(unit)}><span className="mini-course-icon" style={{ background: course.color }}><School /></span><span><strong>{course.name}</strong><small>{unit ? unit.title : "Curriculum coming soon"}</small></span><ArrowRight size={18} /></button>; })}</div>;
}
